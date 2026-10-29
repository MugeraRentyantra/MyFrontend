/**
 * Dependency-free certificate PDF for the mock API (ticket SD14: the worker renders the
 * certificate with name, designation, domain, duration, date, number and verification link).
 *
 * Builds a valid single-page landscape A4 document (842 x 595 pt) by hand: catalog, pages,
 * page, the two standard Type1 fonts (Helvetica, Helvetica-Bold), one content stream and an
 * info dictionary, followed by an xref table with exact byte offsets and the trailer.
 *
 * The standard fonts are not embedded, so every string is reduced to printable ASCII first
 * (curly quotes, dashes, the rupee sign and accents are transliterated) and then escaped.
 * This source file is kept pure ASCII: non-ASCII characters are built from code points.
 */

const PAGE_WIDTH = 842;
const PAGE_HEIGHT = 595;
const CENTER_X = PAGE_WIDTH / 2;

// Advance widths (1/1000 em) of printable ASCII 32..126 from the standard AFM metrics
// (WinAnsiEncoding), so text can be centred and wrapped without a browser.
// prettier-ignore
const HELVETICA_WIDTHS = [
  278, 278, 355, 556, 556, 889, 667, 191, 333, 333, 389, 584, 278, 333, 278, 278, // 32-47
  556, 556, 556, 556, 556, 556, 556, 556, 556, 556, 278, 278, 584, 584, 584, 556, // 48-63
  1015, 667, 667, 722, 722, 667, 611, 778, 722, 278, 500, 667, 556, 833, 722, 778, // 64-79
  667, 778, 722, 667, 611, 722, 667, 944, 667, 667, 611, 278, 278, 278, 469, 556, // 80-95
  333, 556, 556, 500, 556, 556, 278, 556, 556, 222, 222, 500, 222, 833, 556, 556, // 96-111
  556, 556, 333, 500, 278, 556, 500, 722, 500, 500, 500, 334, 260, 334, 584, // 112-126
];

// prettier-ignore
const HELVETICA_BOLD_WIDTHS = [
  278, 333, 474, 556, 556, 889, 722, 238, 333, 333, 389, 584, 278, 333, 278, 278, // 32-47
  556, 556, 556, 556, 556, 556, 556, 556, 556, 556, 333, 333, 584, 584, 584, 611, // 48-63
  975, 722, 722, 722, 722, 667, 611, 778, 722, 278, 556, 722, 611, 833, 722, 778, // 64-79
  667, 778, 722, 667, 611, 722, 667, 944, 667, 667, 611, 333, 278, 333, 584, 556, // 80-95
  333, 556, 611, 556, 611, 556, 333, 611, 611, 278, 278, 556, 278, 889, 611, 611, // 96-111
  611, 611, 389, 556, 333, 611, 556, 778, 556, 556, 500, 389, 280, 389, 584, // 112-126
];

const FONTS = {
  regular: { resource: 'F1', widths: HELVETICA_WIDTHS },
  bold: { resource: 'F2', widths: HELVETICA_BOLD_WIDTHS },
};

// App palette (tailwind.config.js) as PDF RGB fractions.
const COLORS = {
  brand: [0.145, 0.337, 0.922], // brand-600 #2556eb
  brandDeep: [0.09, 0.129, 0.329], // brand-950 #172154
  brandWash: [0.937, 0.961, 1], // brand-50 #eff5ff
  ink: [0.059, 0.09, 0.165], // slate-900 #0f172a
  body: [0.278, 0.333, 0.412], // slate-600 #475569
  muted: [0.392, 0.455, 0.545], // slate-500 #64748b
  hairline: [0.796, 0.835, 0.882], // slate-300 #cbd5e1
};

const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

// ---------------------------------------------------------------------------
// Text helpers
// ---------------------------------------------------------------------------

const fromCodes = (...codes) => String.fromCharCode(...codes);
const anyOf = (...codes) => new RegExp(`[${fromCodes(...codes)}]`, 'g');

const TRANSLITERATIONS = [
  [anyOf(0x2018, 0x2019, 0x201a, 0x201b, 0x2032), "'"], // curly single quotes, prime
  [anyOf(0x201c, 0x201d, 0x201e, 0x201f, 0x2033), '"'], // curly double quotes, double prime
  [anyOf(0x2010, 0x2011, 0x2012, 0x2013, 0x2014, 0x2015, 0x2212), '-'], // dashes, minus sign
  [anyOf(0x2026), '...'], // ellipsis
  [anyOf(0x20b9), 'Rs.'], // rupee sign
  [anyOf(0x00b7, 0x2022, 0x2027), '-'], // middle dot, bullets
  [anyOf(0x00d7), 'x'], // multiplication sign
  [anyOf(0x00a0, 0x2007, 0x2009, 0x202f), ' '], // non-breaking and thin spaces
];

// Combining diacritical marks (U+0300 to U+036F), removed after NFKD decomposition.
const COMBINING_MARKS = new RegExp(`[${fromCodes(0x0300)}-${fromCodes(0x036f)}]`, 'g');

/** Reduces any value to single-line printable ASCII (the standard PDF fonts are not embedded). */
export function toPdfAscii(value) {
  let text = String(value ?? '');
  TRANSLITERATIONS.forEach(([pattern, replacement]) => {
    text = text.replace(pattern, replacement);
  });
  text = text.normalize('NFKD').replace(COMBINING_MARKS, '');
  return text
    .replace(/\s+/g, ' ')
    .replace(/[^\x20-\x7E]/g, '?')
    .trim();
}

/** Escapes the characters that are special inside a PDF literal string: \ ( ) */
function escapePdfString(text) {
  return String(text).replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
}

/** Compact number for content-stream operands (max 2 decimals, never exponent notation). */
function formatNumber(value) {
  const rounded = Math.round(Number(value) * 100) / 100;
  if (!Number.isFinite(rounded) || rounded === 0) return '0';
  return String(rounded);
}

function rgb(color) {
  return color.map(formatNumber).join(' ');
}

function textWidth(text, font, size, charSpacing = 0) {
  let units = 0;
  for (let index = 0; index < text.length; index += 1) {
    const code = text.charCodeAt(index);
    units += code >= 32 && code <= 126 ? font.widths[code - 32] : 556;
  }
  return (units / 1000) * size + charSpacing * Math.max(0, text.length - 1);
}

/** Largest size (from `preferred` down to `minimum`) at which the text fits `maxWidth`. */
function fitFontSize(text, font, preferred, minimum, maxWidth) {
  let size = preferred;
  while (size > minimum && textWidth(text, font, size) > maxWidth) size -= 1;
  return size;
}

function wrapText(text, font, size, maxWidth) {
  const lines = [];
  let current = '';
  text
    .split(' ')
    .filter(Boolean)
    .forEach((word) => {
      const candidate = current ? `${current} ${word}` : word;
      if (current && textWidth(candidate, font, size) > maxWidth) {
        lines.push(current);
        current = word;
      } else {
        current = candidate;
      }
    });
  if (current) lines.push(current);
  return lines;
}

function truncateToWidth(text, font, size, maxWidth) {
  if (textWidth(text, font, size) <= maxWidth) return text;
  let output = text;
  while (output.length > 1 && textWidth(`${output}...`, font, size) > maxWidth) {
    output = output.slice(0, -1);
  }
  return `${output}...`;
}

function formatIssueDate(value) {
  const parsed = value ? new Date(value) : new Date();
  const date = Number.isNaN(parsed.getTime()) ? new Date() : parsed;
  return `${date.getDate()} ${MONTHS[date.getMonth()]} ${date.getFullYear()}`;
}

/** PDF date string, e.g. D:20261027093000Z */
function pdfDate(date = new Date()) {
  const pad = (number) => String(number).padStart(2, '0');
  return (
    `D:${date.getUTCFullYear()}${pad(date.getUTCMonth() + 1)}${pad(date.getUTCDate())}` +
    `${pad(date.getUTCHours())}${pad(date.getUTCMinutes())}${pad(date.getUTCSeconds())}Z`
  );
}

/** Turns "/verify/IP-2026-000123" into an absolute link when running in a browser. */
function absoluteUrl(url) {
  const text = String(url ?? '').trim();
  if (!text || /^https?:\/\//i.test(text)) return text;
  try {
    if (typeof window !== 'undefined' && window.location?.origin) {
      return new URL(text, window.location.origin).toString();
    }
  } catch {
    // fall back to the relative path
  }
  return text;
}

// ---------------------------------------------------------------------------
// Content stream builder
// ---------------------------------------------------------------------------

function createCanvas() {
  const ops = [];
  const n = (...values) => values.map(formatNumber).join(' ');

  return {
    rect(x, y, width, height, { fill, stroke, lineWidth = 1 } = {}) {
      if (fill) ops.push(`${rgb(fill)} rg`);
      if (stroke) ops.push(`${rgb(stroke)} RG`, `${formatNumber(lineWidth)} w`);
      let paint = 'S';
      if (fill && stroke) paint = 'B';
      else if (fill) paint = 'f';
      ops.push(`${n(x, y, width, height)} re`, paint);
    },

    line(x1, y1, x2, y2, { color = COLORS.hairline, lineWidth = 1 } = {}) {
      ops.push(`${rgb(color)} RG`, `${formatNumber(lineWidth)} w`, `${n(x1, y1)} m`, `${n(x2, y2)} l`, 'S');
    },

    /** Circle from four Bezier curves (k = 0.5523 r). */
    circle(cx, cy, r, { color = COLORS.brand, lineWidth = 1 } = {}) {
      const k = 0.5523 * r;
      ops.push(
        `${rgb(color)} RG`,
        `${formatNumber(lineWidth)} w`,
        `${n(cx + r, cy)} m`,
        `${n(cx + r, cy + k, cx + k, cy + r, cx, cy + r)} c`,
        `${n(cx - k, cy + r, cx - r, cy + k, cx - r, cy)} c`,
        `${n(cx - r, cy - k, cx - k, cy - r, cx, cy - r)} c`,
        `${n(cx + k, cy - r, cx + r, cy - k, cx + r, cy)} c`,
        'S',
      );
    },

    /** Draws one line of text; `align` (center | left | right) positions it relative to `x`. */
    text(value, options) {
      const {
        font = FONTS.regular,
        size = 12,
        x = CENTER_X,
        y = 0,
        color = COLORS.ink,
        charSpacing = 0,
        align = 'center',
      } = options;
      const text = toPdfAscii(value);
      if (!text) return;
      const width = textWidth(text, font, size, charSpacing);
      let left = x;
      if (align === 'center') left = x - width / 2;
      else if (align === 'right') left = x - width;
      // Text state (Tc) persists across BT/ET, so it is set explicitly for every run.
      ops.push(
        'BT',
        `/${font.resource} ${formatNumber(size)} Tf`,
        `${formatNumber(charSpacing)} Tc`,
        `${rgb(color)} rg`,
        `${n(left, y)} Td`,
        `(${escapePdfString(text)}) Tj`,
        'ET',
      );
    },

    build() {
      return ops.join('\n');
    },
  };
}

// ---------------------------------------------------------------------------
// Document assembly
// ---------------------------------------------------------------------------

function assemblePdf(content, info) {
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PAGE_WIDTH} ${PAGE_HEIGHT}] ` +
      '/Resources << /Font << /F1 4 0 R /F2 5 0 R >> >> /Contents 6 0 R >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>',
    // The stream is pure ASCII, so its length in characters equals its length in bytes.
    `<< /Length ${content.length} >>\nstream\n${content}\nendstream`,
    `<< /Title (${escapePdfString(info.title)}) /Author (${escapePdfString(info.author)}) ` +
      `/Subject (${escapePdfString(info.subject)}) /Producer (${escapePdfString(info.producer)}) ` +
      `/CreationDate (${info.creationDate}) >>`,
  ];

  // The comment line with four high bytes marks the file as binary (PDF 1.4, section 3.4.1).
  // Each of those characters is a single Latin-1 byte, so string length === byte offset.
  let pdf = `%PDF-1.4\n%${fromCodes(0xe2, 0xe3, 0xcf, 0xd3)}\n`;
  const offsets = [];
  objects.forEach((body, index) => {
    offsets.push(pdf.length);
    pdf += `${index + 1} 0 obj\n${body}\nendobj\n`;
  });

  const xrefOffset = pdf.length;
  const size = objects.length + 1;
  // Every xref entry is exactly 20 bytes: 10-digit offset, space, 5-digit generation, space,
  // keyword, and a two-character end of line (space + LF).
  pdf += `xref\n0 ${size}\n0000000000 65535 f \n`;
  offsets.forEach((offset) => {
    pdf += `${String(offset).padStart(10, '0')} 00000 n \n`;
  });
  pdf += `trailer\n<< /Size ${size} /Root 1 0 R /Info ${objects.length} 0 R >>\n`;
  pdf += `startxref\n${xrefOffset}\n%%EOF\n`;
  return pdf;
}

function toBase64(binary) {
  if (typeof globalThis.btoa === 'function') return globalThis.btoa(binary);
  const NodeBuffer = globalThis.Buffer;
  if (NodeBuffer) return NodeBuffer.from(binary, 'latin1').toString('base64');
  throw new Error('Base64 encoding is not available in this environment.');
}

/**
 * Raw PDF (a binary string with one character per byte) for a certificate.
 * Exposed for tests; the app uses createCertificatePdfDataUrl.
 */
export function buildCertificatePdf({
  certificateNo,
  studentName,
  designation,
  domain,
  durationMonths,
  issuedAt,
  verifyUrl,
} = {}) {
  const number = toPdfAscii(certificateNo) || 'IP-0000-000000';
  const name = toPdfAscii(studentName) || 'Student';
  const designationName = toPdfAscii(designation) || 'Internship';
  const domainName = toPdfAscii(domain);
  const months = Number(durationMonths);
  const fallbackLink = certificateNo ? `/verify/${encodeURIComponent(String(certificateNo))}` : '';
  const verifyLink = toPdfAscii(absoluteUrl(verifyUrl || fallbackLink));
  const issuedOn = formatIssueDate(issuedAt);

  const canvas = createCanvas();

  // Header wash and frames (the fill is drawn first so the frames sit on top of it).
  canvas.rect(28, 420, PAGE_WIDTH - 56, PAGE_HEIGHT - 448, { fill: COLORS.brandWash });
  canvas.rect(20, 20, PAGE_WIDTH - 40, PAGE_HEIGHT - 40, { stroke: COLORS.brand, lineWidth: 2.5 });
  canvas.rect(28, 28, PAGE_WIDTH - 56, PAGE_HEIGHT - 56, { stroke: COLORS.hairline, lineWidth: 0.75 });

  // Title block
  canvas.text('INTERNSHIP PORTAL', {
    font: FONTS.bold,
    size: 10,
    y: 528,
    color: COLORS.brand,
    charSpacing: 3,
  });
  canvas.text('Certificate of Completion', {
    font: FONTS.bold,
    size: 34,
    y: 476,
    color: COLORS.brandDeep,
  });
  canvas.line(CENTER_X - 28, 448, CENTER_X + 28, 448, { color: COLORS.brand, lineWidth: 2 });

  // Recipient
  canvas.text('This certifies that', { size: 13, y: 382, color: COLORS.muted });
  const nameSize = fitFontSize(name, FONTS.bold, 34, 18, 640);
  canvas.text(name, { font: FONTS.bold, size: nameSize, y: 336, color: COLORS.ink });
  const underline = Math.min(680, Math.max(300, textWidth(name, FONTS.bold, nameSize) + 60));
  canvas.line(CENTER_X - underline / 2, 320, CENTER_X + underline / 2, 320, {
    color: COLORS.hairline,
    lineWidth: 0.75,
  });

  // Achievement sentence, wrapped and centred.
  const durationText = Number.isFinite(months) && months > 0 ? `${months}-month ` : '';
  const domainText = domainName ? ` (${domainName})` : '';
  const sentence = `has successfully completed the ${durationText}${designationName} internship${domainText}.`;
  wrapText(sentence, FONTS.regular, 13, 600).forEach((line, index) => {
    canvas.text(line, { size: 13, y: 290 - index * 19, color: COLORS.body });
  });

  // Seal
  canvas.circle(CENTER_X, 136, 36, { color: COLORS.brand, lineWidth: 1.5 });
  canvas.circle(CENTER_X, 136, 30, { color: COLORS.brand, lineWidth: 0.5 });
  canvas.text('IP', { font: FONTS.bold, size: 20, y: 129, color: COLORS.brand });

  // Issue date (left) and certificate number (right)
  canvas.text(issuedOn, { font: FONTS.bold, size: 12, x: 90, y: 136, align: 'left' });
  canvas.line(90, 128, 290, 128, { color: COLORS.hairline, lineWidth: 0.75 });
  canvas.text('Date of issue', { size: 9, x: 90, y: 114, align: 'left', color: COLORS.muted });

  canvas.text(number, { font: FONTS.bold, size: 12, x: 752, y: 136, align: 'right' });
  canvas.line(552, 128, 752, 128, { color: COLORS.hairline, lineWidth: 0.75 });
  canvas.text('Certificate number', { size: 9, x: 752, y: 114, align: 'right', color: COLORS.muted });

  // Public verification link (SD13)
  if (verifyLink) {
    const verifyText = truncateToWidth(`Verify at ${verifyLink}`, FONTS.regular, 9, 700);
    canvas.text(verifyText, { size: 9, y: 54, color: COLORS.muted });
  }

  return assemblePdf(canvas.build(), {
    title: `Certificate ${number}`,
    author: name,
    subject: `${designationName} internship certificate`,
    producer: 'Internship Portal (mock certificate service)',
    creationDate: pdfDate(),
  });
}

/**
 * Certificate PDF as a data URL ("data:application/pdf;base64,..."), used by the mock
 * GET /certificates/:id/download endpoint in place of a short-lived signed storage URL.
 */
export function createCertificatePdfDataUrl(data = {}) {
  return `data:application/pdf;base64,${toBase64(buildCertificatePdf(data))}`;
}
