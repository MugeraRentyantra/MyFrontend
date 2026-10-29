import { useEffect, useMemo, useRef } from 'react';
import { Prose } from '@/shared/components/ui';
import { cn } from '@/shared/utils/cn';
import { slugify } from '@/shared/utils/helpers';
import { TERMS_PAGE_ID_PREFIX, extractTermsHeadings } from '../utils/terms';

/**
 * Renders the terms markdown (sanitised by Prose) and gives each "##" section heading a stable id
 * (the same ids `extractTermsHeadings(content, idPrefix)` returns), so a table of contents can
 * link to the sections. `size="sm"` is the compact variant used inside the enrollment TermsBox.
 */
export function TermsContent({
  content,
  idPrefix = TERMS_PAGE_ID_PREFIX,
  size = 'base',
  className,
}) {
  const rootRef = useRef(null);
  const headings = useMemo(() => extractTermsHeadings(content, idPrefix), [content, idPrefix]);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    root.querySelectorAll('h2').forEach((node, index) => {
      const fallback = `${idPrefix}-${slugify(node.textContent || '') || `section-${index + 1}`}`;
      node.id = headings[index]?.id ?? fallback;
      // Focusable from the table of contents so screen readers continue from the section.
      node.setAttribute('tabindex', '-1');
    });
  }, [content, headings, idPrefix]);

  return (
    <div ref={rootRef} className={className}>
      <Prose
        markdown={content ?? ''}
        className={cn(
          'prose-h2:scroll-mt-24 prose-h3:scroll-mt-24',
          size === 'sm' && 'prose-sm',
        )}
      />
    </div>
  );
}

export default TermsContent;
