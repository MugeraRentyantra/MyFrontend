import { buildSeed } from './seed/buildSeed';
import { COLLECTIONS, placeholderScreenshot } from './seed/helpers';

/**
 * The mock database (ticket GP1): plain arrays of documents, one per collection (SPEC section 8),
 * persisted to localStorage so a demo survives reloads. Handlers mutate `db.<collection>` in place
 * and `mock.*` (utils.js) calls `persist()` after every request.
 *
 * Must not import utils.js or services.js (they import this module).
 */

/** Bump when the seed or the document shapes change: older saved databases are then ignored. */
export const DB_VERSION = 1;
export const DB_STORAGE_KEY = 'ip.mockdb.v1';
export { COLLECTIONS };

const SAVE_DELAY_MS = 150;
const MAX_INLINE_SCREENSHOT_CHARS = 300000;
const NOT_PERSISTED_LABEL = 'Screenshot (not persisted)';

// ---------------------------------------------------------------------------
// Storage helpers
// ---------------------------------------------------------------------------

function getStorage() {
  try {
    const storage = globalThis.localStorage;
    return storage && typeof storage.getItem === 'function' ? storage : null;
  } catch {
    // Access itself can throw (blocked storage, sandboxed iframes).
    return null;
  }
}

let notPersistedUrl = null;
function notPersistedPlaceholder() {
  if (!notPersistedUrl) notPersistedUrl = placeholderScreenshot(NOT_PERSISTED_LABEL);
  return notPersistedUrl;
}

function isBlobUrl(url) {
  return typeof url === 'string' && url.startsWith('blob:');
}

function isOversizedDataUrl(url) {
  return typeof url === 'string' && url.startsWith('data:') && url.length > MAX_INLINE_SCREENSHOT_CHARS;
}

function isUnpersistableUrl(url) {
  return isBlobUrl(url) || isOversizedDataUrl(url);
}

/**
 * Returns the submissions with every screenshot url matching `shouldReplace` swapped for a
 * placeholder. Never mutates its input; returns the same array when nothing needed replacing.
 */
function withPlaceholderScreenshots(submissions, shouldReplace) {
  if (!Array.isArray(submissions)) return submissions;
  let changed = false;
  const next = submissions.map((submission) => {
    if (!submission || !Array.isArray(submission.screenshots)) return submission;
    let touched = false;
    const screenshots = submission.screenshots.map((shot) => {
      if (shot && shouldReplace(shot.url)) {
        touched = true;
        return { ...shot, url: notPersistedPlaceholder() };
      }
      return shot;
    });
    if (!touched) return submission;
    changed = true;
    return { ...submission, screenshots };
  });
  return changed ? next : submissions;
}

function emptyCollections() {
  const data = {};
  for (const name of COLLECTIONS) data[name] = [];
  return data;
}

/** The saved database, or null when missing, unreadable, from another DB_VERSION or incomplete. */
function readStoredData() {
  const storage = getStorage();
  if (!storage) return null;
  try {
    const raw = storage.getItem(DB_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || parsed.version !== DB_VERSION) return null;
    const { data } = parsed;
    if (!data || typeof data !== 'object') return null;
    if (!COLLECTIONS.every((name) => Array.isArray(data[name]))) return null;
    // blob: urls only live as long as the page that created them.
    data.taskSubmissions = withPlaceholderScreenshots(data.taskSubmissions, isBlobUrl);
    return data;
  } catch {
    return null;
  }
}

function buildInitialData() {
  const stored = readStoredData();
  if (stored) return stored;
  try {
    return buildSeed();
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('[mock db] Building the seed failed; starting with an empty database.', error);
    return emptyCollections();
  }
}

// ---------------------------------------------------------------------------
// The database
// ---------------------------------------------------------------------------

const initialData = buildInitialData();

/** db.users, db.enrollments, ... (see COLLECTIONS). Mutate the arrays in place. */
export const db = {};
for (const name of COLLECTIONS) {
  db[name] = Array.isArray(initialData[name]) ? initialData[name] : [];
}

// ---------------------------------------------------------------------------
// Persistence
// ---------------------------------------------------------------------------

let saveTimer = null;
let compactSaves = false; // set after a quota error: skip straight to the compact snapshot
let warnedAboutStorage = false;

function serialize(compact) {
  const data = {};
  for (const name of COLLECTIONS) data[name] = Array.isArray(db[name]) ? db[name] : [];
  if (compact) {
    data.taskSubmissions = withPlaceholderScreenshots(data.taskSubmissions, isUnpersistableUrl);
  }
  return JSON.stringify({ version: DB_VERSION, savedAt: new Date().toISOString(), data });
}

function warnOnce(error) {
  if (warnedAboutStorage) return;
  warnedAboutStorage = true;
  // eslint-disable-next-line no-console
  console.warn(
    '[mock db] Could not save the mock database to localStorage; changes will be lost on reload.',
    error,
  );
}

/** Writes the database now. Returns true when it was saved. */
function writeSnapshot() {
  const storage = getStorage();
  if (!storage) return false;
  if (!compactSaves) {
    try {
      storage.setItem(DB_STORAGE_KEY, serialize(false));
      return true;
    } catch {
      // Most likely QuotaExceededError: retry once without big inline images and blob: urls.
      compactSaves = true;
    }
  }
  try {
    storage.setItem(DB_STORAGE_KEY, serialize(true));
    return true;
  } catch (error) {
    warnOnce(error);
    return false;
  }
}

/**
 * Schedules a save ~150 ms from now. Calls made while a save is pending are coalesced into it,
 * so a burst of requests produces one write that contains every change.
 */
export function persist() {
  if (saveTimer !== null) return;
  if (typeof setTimeout !== 'function') {
    writeSnapshot();
    return;
  }
  saveTimer = setTimeout(() => {
    saveTimer = null;
    writeSnapshot();
  }, SAVE_DELAY_MS);
}

/** Saves immediately (cancelling a pending debounced save). Returns true when it was saved. */
export function flushPersist() {
  if (saveTimer !== null) {
    clearTimeout(saveTimer);
    saveTimer = null;
  }
  return writeSnapshot();
}

/**
 * Rebuilds the seed and swaps it into the SAME `db` object (every module keeps its reference),
 * then saves immediately. Throws (leaving the data untouched) if the seed cannot be built.
 */
export function resetDb() {
  const fresh = buildSeed();
  for (const name of COLLECTIONS) {
    if (!Array.isArray(db[name])) db[name] = [];
    const target = db[name];
    target.length = 0;
    const docs = Array.isArray(fresh[name]) ? fresh[name] : [];
    for (const doc of docs) target.push(doc);
  }
  compactSaves = false;
  warnedAboutStorage = false;
  flushPersist();
  return db;
}

// ---------------------------------------------------------------------------
// Ids
// ---------------------------------------------------------------------------

function randomHex(length) {
  const cryptoApi = globalThis.crypto;
  let bytes;
  if (cryptoApi && typeof cryptoApi.getRandomValues === 'function') {
    bytes = Array.from(cryptoApi.getRandomValues(new Uint8Array(Math.ceil(length / 2))));
  } else {
    bytes = Array.from({ length: Math.ceil(length / 2) }, () => Math.floor(Math.random() * 256));
  }
  return bytes
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('')
    .slice(0, length);
}

/** New ObjectId-like id: 8 hex chars of the current time in seconds + 16 random hex chars. */
export function oid() {
  const seconds = Math.floor(Date.now() / 1000)
    .toString(16)
    .padStart(8, '0')
    .slice(-8);
  return `${seconds}${randomHex(16)}`;
}

// ---------------------------------------------------------------------------
// Browser debugging + save on page hide
// ---------------------------------------------------------------------------

if (typeof window !== 'undefined') {
  window.__mockdb = { db, resetDb };
  if (typeof window.addEventListener === 'function') {
    // A reload right after a mutation would otherwise drop the pending debounced save.
    window.addEventListener('pagehide', () => {
      if (saveTimer !== null) flushPersist();
    });
  }
}
