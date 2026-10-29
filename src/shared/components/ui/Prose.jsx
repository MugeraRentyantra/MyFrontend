import { useMemo } from 'react';
import { cn } from '@/shared/utils/cn';
import { renderMarkdown, sanitizeHtml } from '@/shared/utils/markdown';

/**
 * Long-form rich text with typography styles. Pass `markdown` (rendered + sanitised) or `html`
 * (always sanitised again here). Without either, `children` render inside the same typography wrapper.
 */
export function Prose({ html, markdown, as: Component = 'div', className, children, ...rest }) {
  const hasMarkdown = markdown !== undefined && markdown !== null;
  const hasHtml = html !== undefined && html !== null;

  const content = useMemo(() => {
    if (hasMarkdown) return renderMarkdown(markdown);
    if (hasHtml) return sanitizeHtml(html);
    return null;
  }, [hasMarkdown, hasHtml, markdown, html]);

  const classes = cn(
    'prose prose-slate max-w-none prose-headings:tracking-tight prose-a:font-medium',
    className,
  );

  if (content === null) {
    return (
      <Component {...rest} className={classes}>
        {children}
      </Component>
    );
  }

  return <Component {...rest} className={classes} dangerouslySetInnerHTML={{ __html: content }} />;
}

export default Prose;
