import DOMPurify from 'dompurify';
import { marked } from 'marked';

marked.setOptions({ gfm: true, breaks: false });

let hooksInstalled = false;

function installHooks() {
  if (hooksInstalled || typeof window === 'undefined') return;
  // Links in rendered content always open safely in a new tab.
  DOMPurify.addHook('afterSanitizeAttributes', (node) => {
    if (node.tagName === 'A' && node.getAttribute('href')) {
      node.setAttribute('target', '_blank');
      node.setAttribute('rel', 'noopener noreferrer');
    }
  });
  hooksInstalled = true;
}

/** Sanitises untrusted HTML (SOP content, terms, previews) before it is rendered. */
export function sanitizeHtml(html) {
  installHooks();
  return DOMPurify.sanitize(String(html ?? ''), {
    USE_PROFILES: { html: true },
    FORBID_TAGS: ['style', 'script', 'iframe', 'object', 'embed', 'form', 'input', 'button'],
    FORBID_ATTR: ['style', 'onerror', 'onload', 'onclick'],
  });
}

/** Markdown -> sanitised HTML string. */
export function renderMarkdown(markdown) {
  const html = marked.parse(String(markdown ?? ''), { async: false });
  return sanitizeHtml(typeof html === 'string' ? html : '');
}
