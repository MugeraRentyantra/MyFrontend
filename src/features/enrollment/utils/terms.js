import { slugify } from '@/shared/utils/helpers';

/** Id prefix for the section headings on the public /terms page. */
export const TERMS_PAGE_ID_PREFIX = 'terms';

function stripInlineMarkdown(text) {
  return String(text)
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/[*_`~]/g, '')
    .trim();
}

/**
 * The level-2 ("## Title") headings of the terms markdown with stable, unique ids, in document
 * order: [{ id, text }]. TermsContent assigns the same ids to the rendered <h2> elements, so a
 * table of contents can link to them. Fenced code blocks are ignored.
 */
export function extractTermsHeadings(markdown, idPrefix = TERMS_PAGE_ID_PREFIX) {
  if (!markdown) return [];
  const used = new Map();
  const headings = [];
  let inFence = false;

  String(markdown)
    .split(/\r?\n/)
    .forEach((line) => {
      if (/^\s*(```|~~~)/.test(line)) {
        inFence = !inFence;
        return;
      }
      if (inFence) return;
      const match = /^##\s+(.+?)\s*#*\s*$/.exec(line);
      if (!match) return;
      const text = stripInlineMarkdown(match[1]);
      if (!text) return;
      const base = `${idPrefix}-${slugify(text) || 'section'}`;
      const seen = used.get(base) ?? 0;
      used.set(base, seen + 1);
      headings.push({ id: seen ? `${base}-${seen + 1}` : base, text });
    });

  return headings;
}
