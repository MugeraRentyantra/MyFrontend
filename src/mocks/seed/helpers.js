/**
 * Pure helpers shared by the seed (buildSeed.js) and the mock domain logic (services.js).
 * No imports: this module must never depend on db.js, services.js or utils.js.
 */

/** Every mock DB collection, in the order of SPEC section 8. */
export const COLLECTIONS = Object.freeze([
  'users',
  'authTokens',
  'designations',
  'domains',
  'internshipPlans',
  'assessmentConfigs',
  'assessmentAttempts',
  'quotes',
  'termsVersions',
  'termsAcceptances',
  'enrollments',
  'payments',
  'paymentEvents',
  'scheduleTemplates',
  'taskDefinitions',
  'taskProgress',
  'taskSubmissions',
  'reviews',
  'trainerAssignments',
  'teams',
  'teamMembers',
  'githubConnections',
  'certificates',
  'emailJobs',
  'auditLogs',
  'sopAccessLogs',
]);

/**
 * Default discount slabs (score -> discount %). Copy before storing in a document:
 * `DEFAULT_SLABS.map((slab) => ({ ...slab }))`.
 */
export const DEFAULT_SLABS = [
  { minScore: 15, maxScore: 15, discountPercent: 20 },
  { minScore: 10, maxScore: 14, discountPercent: 10 },
  { minScore: 8, maxScore: 9, discountPercent: 5 },
  { minScore: 0, maxScore: 7, discountPercent: 0 },
];

// ---------------------------------------------------------------------------
// Dates (always ISO-8601 UTC strings)
// ---------------------------------------------------------------------------

const MINUTE_MS = 60 * 1000;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;

function toTime(iso) {
  if (iso === undefined || iso === null || iso === '') return Date.now();
  const time = new Date(iso).getTime();
  return Number.isNaN(time) ? Date.now() : time;
}

function fromNow(ms) {
  return new Date(Date.now() + ms).toISOString();
}

export function daysAgo(n = 0) {
  return fromNow(-Number(n) * DAY_MS);
}

export function hoursAgo(n = 0) {
  return fromNow(-Number(n) * HOUR_MS);
}

export function minutesAgo(n = 0) {
  return fromNow(-Number(n) * MINUTE_MS);
}

export function daysFromNow(n = 0) {
  return fromNow(Number(n) * DAY_MS);
}

export function hoursFromNow(n = 0) {
  return fromNow(Number(n) * HOUR_MS);
}

/** addDays(iso, n) -> ISO string n days later (negative n goes back). Fractions allowed. */
export function addDays(iso, n = 0) {
  return new Date(toTime(iso) + Number(n) * DAY_MS).toISOString();
}

export function addHours(iso, n = 0) {
  return new Date(toTime(iso) + Number(n) * HOUR_MS).toISOString();
}

export function addMinutes(iso, n = 0) {
  return new Date(toTime(iso) + Number(n) * MINUTE_MS).toISOString();
}

// ---------------------------------------------------------------------------
// Money and discounts (money is always integer paise)
// ---------------------------------------------------------------------------

/** computePayable(1299900, 10) -> 1169910 */
export function computePayable(basePrice, discountPercent) {
  return Math.round(Number(basePrice) * (1 - Number(discountPercent || 0) / 100));
}

/** Discount % of the slab that contains `score` (inclusive bounds), 0 when no slab matches. */
export function discountForScore(slabs, score) {
  const value = Number(score);
  const slab = (Array.isArray(slabs) ? slabs : []).find(
    (candidate) =>
      candidate && value >= Number(candidate.minScore) && value <= Number(candidate.maxScore),
  );
  return slab ? Number(slab.discountPercent) || 0 : 0;
}

// ---------------------------------------------------------------------------
// Deterministic randomness and ids
// ---------------------------------------------------------------------------

/** FNV-1a 32-bit hash of a string (unsigned). */
export function hashString(value) {
  const text = String(value);
  let hash = 0x811c9dc5;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

/** Seeded PRNG (mulberry32): returns () => number in [0, 1). Same seed, same sequence. */
export function createSeededRandom(seed = 1) {
  let state = (typeof seed === 'number' ? seed : hashString(seed)) >>> 0;
  return function random() {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function toHex(value, width) {
  return value.toString(16).padStart(width, '0').slice(-width);
}

/**
 * createIdFactory('seed') -> () => deterministic 24-char lowercase hex id (ObjectId look-alike):
 * 8 hex "timestamp" + 6 hex counter (guarantees uniqueness) + 10 hex pseudo-random chars.
 * Two factories with the same seed produce the same sequence, so the seed has stable ids.
 */
export function createIdFactory(seed = 'seed') {
  const random = createSeededRandom(`${seed}:ids`);
  const base = 0x65000000 + (hashString(`${seed}:time`) % 0x02000000);
  let counter = 0;
  return function nextId() {
    counter += 1;
    const time = (base + counter * 37) % 0x100000000;
    let tail = '';
    for (let index = 0; index < 10; index += 1) tail += Math.floor(random() * 16).toString(16);
    return `${toHex(time, 8)}${toHex(counter, 6)}${tail}`;
  };
}

function randomBytes(length) {
  const cryptoApi = globalThis.crypto;
  if (cryptoApi && typeof cryptoApi.getRandomValues === 'function') {
    return Array.from(cryptoApi.getRandomValues(new Uint8Array(length)));
  }
  return Array.from({ length }, () => Math.floor(Math.random() * 256));
}

const BASE36 = '0123456789abcdefghijklmnopqrstuvwxyz';

/** randomToken('verify') -> "verify-k3j9..." (prefix + "-" + 24 random base36 chars). */
export function randomToken(prefix = 'tok') {
  const chars = randomBytes(24)
    .map((byte) => BASE36[byte % 36])
    .join('');
  return `${prefix}-${chars}`;
}

// ---------------------------------------------------------------------------
// Placeholder screenshots (SVG data URLs, 1280x800)
// ---------------------------------------------------------------------------

const SCREEN_ACCENTS = ['#2563eb', '#059669', '#7c3aed', '#ea580c', '#0891b2', '#db2777'];
const SANS = "font-family='Inter,ui-sans-serif,system-ui,-apple-system,Segoe UI,sans-serif'";
const MONO = "font-family='ui-monospace,SFMono-Regular,Menlo,Consolas,monospace'";

function escapeXml(text) {
  return String(text).replace(
    /[&<>"']/g,
    (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' })[char],
  );
}

function shorten(text, max) {
  const value = String(text ?? '')
    .replace(/\s+/g, ' ')
    .trim();
  return value.length > max ? `${value.slice(0, max - 1).trimEnd()}…` : value;
}

/** Light "app dashboard": sidebar, stat cards and a table. */
function appBody(accent, heading) {
  let svg = "<rect x='64' y='108' width='232' height='636' fill='#f8fafc'/>";
  svg += "<rect x='296' y='108' width='1' height='636' fill='#e2e8f0'/>";
  svg += `<rect x='92' y='136' width='28' height='28' rx='8' fill='${accent}'/>`;
  svg += "<rect x='132' y='144' width='104' height='12' rx='6' fill='#cbd5e1'/>";
  for (let index = 0; index < 6; index += 1) {
    const y = 196 + index * 44;
    const active = index === 0;
    if (active) {
      svg += `<rect x='80' y='${y - 12}' width='200' height='36' rx='8' fill='${accent}' opacity='.12'/>`;
    }
    const color = active ? accent : '#cbd5e1';
    svg += `<rect x='96' y='${y}' width='14' height='12' rx='3' fill='${color}'/>`;
    svg += `<rect x='122' y='${y}' width='${120 - (index % 3) * 18}' height='12' rx='6' fill='${color}'/>`;
  }
  svg += `<text x='336' y='170' ${SANS} font-size='28' font-weight='600' fill='#0f172a'>${heading}</text>`;
  svg += "<rect x='336' y='190' width='360' height='12' rx='6' fill='#e2e8f0'/>";
  for (let index = 0; index < 3; index += 1) {
    const x = 336 + index * 284;
    svg += `<rect x='${x}' y='228' width='260' height='116' rx='12' fill='#fff' stroke='#e2e8f0'/>`;
    svg += `<rect x='${x + 20}' y='252' width='96' height='10' rx='5' fill='#cbd5e1'/>`;
    svg += `<rect x='${x + 20}' y='280' width='${140 - index * 24}' height='24' rx='6' fill='${index === 0 ? accent : '#334155'}'/>`;
    svg += `<rect x='${x + 20}' y='318' width='72' height='8' rx='4' fill='#a7f3d0'/>`;
  }
  svg += "<rect x='336' y='372' width='840' height='336' rx='12' fill='#fff' stroke='#e2e8f0'/>";
  svg += "<rect x='337' y='373' width='838' height='46' rx='11' fill='#f8fafc'/>";
  svg += "<rect x='360' y='392' width='88' height='10' rx='5' fill='#94a3b8'/>";
  svg += "<rect x='700' y='392' width='64' height='10' rx='5' fill='#94a3b8'/>";
  svg += "<rect x='1040' y='392' width='56' height='10' rx='5' fill='#94a3b8'/>";
  for (let row = 0; row < 5; row += 1) {
    const y = 448 + row * 52;
    svg += `<rect x='360' y='${y}' width='${180 + (row % 3) * 40}' height='12' rx='6' fill='#cbd5e1'/>`;
    svg += `<rect x='700' y='${y}' width='120' height='12' rx='6' fill='#e2e8f0'/>`;
    svg += `<rect x='1040' y='${y - 6}' width='96' height='24' rx='12' fill='${row === 1 ? '#fef3c7' : '#d1fae5'}'/>`;
    if (row < 4) svg += `<rect x='352' y='${y + 32}' width='808' height='1' fill='#f1f5f9'/>`;
  }
  return svg;
}

/** Dark terminal: a check run and a push. */
function terminalBody(accent, heading) {
  const lines = [
    ['#64748b', `# ${heading}`, ''],
    ['#e2e8f0', '$ ./scripts/verify.sh --all', ''],
    ['#34d399', '✓ build', 'completed in 18.4s'],
    ['#34d399', '✓ unit tests', '48 passed, 0 failed'],
    ['#34d399', '✓ lint', 'no issues found'],
    ['#93c5fd', '→ coverage', '84.2% (threshold 80%)'],
    ['#e2e8f0', '$ git push origin HEAD', ''],
    ['#94a3b8', 'Enumerating objects: 23, done.', ''],
    ['#94a3b8', '4f2a9c1..b81d3e7  HEAD -&gt; feature/submission', ''],
  ];
  let svg = '';
  lines.forEach(([color, left, right], index) => {
    const y = 164 + index * 42;
    svg += `<text x='104' y='${y}' ${MONO} font-size='20' fill='${color}'>${left}</text>`;
    if (right) svg += `<text x='400' y='${y}' ${MONO} font-size='20' fill='#cbd5e1'>${right}</text>`;
  });
  const promptY = 164 + lines.length * 42;
  svg += `<text x='104' y='${promptY}' ${MONO} font-size='20' fill='#e2e8f0'>$</text>`;
  svg += `<rect x='128' y='${promptY - 18}' width='12' height='24' fill='${accent}'/>`;
  return svg;
}

/** Dark code editor: file tree, tab and abstract code lines. */
function editorBody(accent, heading, tabTitle) {
  let svg = "<rect x='64' y='108' width='220' height='636' fill='#111827'/>";
  for (let index = 0; index < 9; index += 1) {
    const isFolder = index % 3 === 0;
    svg += `<rect x='${isFolder ? 88 : 108}' y='${136 + index * 34}' width='${isFolder ? 120 : 132 - (index % 4) * 14}' height='10' rx='5' fill='${index === 4 ? accent : '#334155'}'/>`;
  }
  svg += "<rect x='284' y='108' width='932' height='44' fill='#0f172a'/>";
  svg += "<rect x='284' y='108' width='320' height='44' fill='#0b1120'/>";
  svg += `<rect x='284' y='150' width='320' height='2' fill='${accent}'/>`;
  svg += `<text x='304' y='136' ${SANS} font-size='15' fill='#cbd5e1'>${tabTitle}</text>`;
  const palette = [accent, '#f472b6', '#93c5fd', '#fbbf24', '#94a3b8', '#a7f3d0'];
  const widths = [220, 340, 280, 160, 420, 300, 120, 380, 260, 200, 330, 150, 290];
  const indents = [0, 1, 2, 2, 2, 1, 0, 0, 1, 2, 2, 1, 0];
  widths.forEach((width, index) => {
    const y = 180 + index * 38;
    const x = 348 + indents[index] * 32;
    const first = Math.round(width * 0.4);
    svg += `<text x='300' y='${y + 11}' ${MONO} font-size='14' fill='#475569'>${index + 1}</text>`;
    svg += `<rect x='${x}' y='${y}' width='${first}' height='12' rx='6' fill='${palette[index % palette.length]}'/>`;
    svg += `<rect x='${x + first + 12}' y='${y}' width='${width - first}' height='12' rx='6' fill='${palette[(index + 2) % palette.length]}' opacity='.7'/>`;
  });
  svg += `<rect x='64' y='712' width='1152' height='32' fill='${accent}'/>`;
  svg += `<text x='84' y='733' ${SANS} font-size='13' fill='#fff'>✓ ${heading}</text>`;
  return svg;
}

/** Light browser: address bar, a request form and a response chart. */
function browserBody(accent, heading) {
  let svg = "<rect x='64' y='108' width='1152' height='48' fill='#f8fafc'/>";
  svg += "<rect x='64' y='156' width='1152' height='1' fill='#e2e8f0'/>";
  svg += "<rect x='176' y='118' width='928' height='28' rx='14' fill='#fff' stroke='#e2e8f0'/>";
  svg += `<text x='196' y='137' ${SANS} font-size='14' fill='#64748b'>localhost:8080/app</text>`;
  svg += `<text x='112' y='212' ${SANS} font-size='26' font-weight='600' fill='#0f172a'>${heading}</text>`;
  svg += "<rect x='112' y='240' width='480' height='456' rx='14' fill='#fff' stroke='#e2e8f0'/>";
  svg += `<rect x='136' y='268' width='72' height='28' rx='8' fill='${accent}'/>`;
  svg += `<text x='172' y='287' text-anchor='middle' ${SANS} font-size='13' font-weight='600' fill='#fff'>POST</text>`;
  svg += "<rect x='220' y='268' width='348' height='28' rx='8' fill='#f1f5f9'/>";
  for (let index = 0; index < 7; index += 1) {
    const y = 328 + index * 44;
    svg += `<rect x='136' y='${y}' width='${120 + (index % 3) * 60}' height='12' rx='6' fill='#e2e8f0'/>`;
    svg += `<rect x='400' y='${y}' width='${100 + (index % 2) * 50}' height='12' rx='6' fill='#cbd5e1'/>`;
  }
  svg += "<rect x='624' y='240' width='544' height='456' rx='14' fill='#fff' stroke='#e2e8f0'/>";
  svg += "<rect x='648' y='264' width='100' height='26' rx='13' fill='#d1fae5'/>";
  svg += `<text x='698' y='282' text-anchor='middle' ${SANS} font-size='13' font-weight='600' fill='#047857'>201 Created</text>`;
  const bars = [120, 180, 150, 240, 210, 300, 270];
  bars.forEach((height, index) => {
    const opacity = index === bars.length - 1 ? '1' : '.55';
    svg += `<rect x='${664 + index * 68}' y='${664 - height}' width='40' height='${height}' rx='6' fill='${accent}' opacity='${opacity}'/>`;
  });
  svg += "<rect x='648' y='664' width='496' height='1' fill='#e2e8f0'/>";
  return svg;
}

/**
 * placeholderScreenshot('Unit tests passing', 2) -> "data:image/svg+xml;charset=utf-8,..."
 * A 1280x800 fake app/terminal/editor/browser window showing `label`. `variant` (any integer)
 * changes the layout (variant % 4) and the accent color, so neighbouring screenshots differ.
 */
export function placeholderScreenshot(label = 'Screenshot', variant = 0) {
  const index = Math.abs(Math.trunc(Number(variant) || 0));
  const accent = SCREEN_ACCENTS[index % SCREEN_ACCENTS.length];
  const layout = index % 4;
  const title = escapeXml(shorten(label, 72) || 'Screenshot');
  const heading = escapeXml(shorten(label, 44) || 'Screenshot');
  const dark = layout === 1 || layout === 2;
  const theme = dark
    ? { from: '#0f172a', to: '#1e293b', window: '#0b1120', bar: '#111827', border: '#1f2937', muted: '#94a3b8' }
    : { from: '#e0e7ff', to: '#f8fafc', window: '#ffffff', bar: '#f1f5f9', border: '#e2e8f0', muted: '#64748b' };

  let body;
  if (layout === 0) body = appBody(accent, heading);
  else if (layout === 1) body = terminalBody(accent, heading);
  else if (layout === 2) body = editorBody(accent, heading, escapeXml(shorten(label, 30) || 'main'));
  else body = browserBody(accent, heading);

  const svg =
    "<svg xmlns='http://www.w3.org/2000/svg' width='1280' height='800' viewBox='0 0 1280 800'>" +
    `<defs><linearGradient id='bg' x1='0' y1='0' x2='1' y2='1'><stop offset='0' stop-color='${theme.from}'/><stop offset='1' stop-color='${theme.to}'/></linearGradient>` +
    "<clipPath id='win'><rect x='64' y='56' width='1152' height='688' rx='18'/></clipPath></defs>" +
    "<rect width='1280' height='800' fill='url(#bg)'/>" +
    "<rect x='64' y='66' width='1152' height='688' rx='18' fill='#0f172a' opacity='.08'/>" +
    `<g clip-path='url(#win)'><rect x='64' y='56' width='1152' height='688' fill='${theme.window}'/>` +
    `<rect x='64' y='56' width='1152' height='52' fill='${theme.bar}'/>${body}</g>` +
    `<rect x='64.5' y='56.5' width='1151' height='687' rx='18' fill='none' stroke='${theme.border}'/>` +
    "<circle cx='98' cy='82' r='7' fill='#f87171'/><circle cx='122' cy='82' r='7' fill='#fbbf24'/><circle cx='146' cy='82' r='7' fill='#34d399'/>" +
    `<text x='640' y='88' text-anchor='middle' ${SANS} font-size='16' fill='${theme.muted}'>${title}</text>` +
    '</svg>';

  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}
