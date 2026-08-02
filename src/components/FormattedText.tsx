import React from 'react';

interface FormattedTextProps {
  content: string;
  className?: string;
  style?: React.CSSProperties;
}

/**
 * Component to safely render rich text formatted with HTML tags (bold, colors, font sizes, lists, etc.)
 * or plain text with newline preservation.
 */
export const FormattedText: React.FC<FormattedTextProps> = ({ content, className = '', style }) => {
  if (!content) return null;

  // Check if content contains HTML markup
  const hasHtml = /<[a-z][\s\S]*>/i.test(content);

  if (hasHtml) {
    return (
      <div
        className={`rich-text-content ${className}`}
        style={style}
        dangerouslySetInnerHTML={{ __html: content }}
      />
    );
  }

  return (
    <div className={`whitespace-pre-wrap ${className}`} style={style}>
      {content}
    </div>
  );
};
export const stripHtmlTags = (html: string): string => {
  if (!html) return '';
  return html.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim();
};

export default FormattedText;
