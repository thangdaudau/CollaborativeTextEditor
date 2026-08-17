import type { Editor } from '@tiptap/react';

export const exportToMarkdown = (editor: Editor | null, title: string) => {
  if (!editor) return;

  // Lấy chính xác nội dung trong editor, không chèn thêm title bên ngoài
  const content = (editor.storage as { markdown?: { getMarkdown: () => string } }).markdown?.getMarkdown() || '';

  const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${title || 'document'}.md`;
  a.click();
  URL.revokeObjectURL(url);
};
export const exportToPdf = (editor: Editor | null, title: string) => {
  if (!editor) return;
  const htmlContent = editor.getHTML();
  const printWindow = window.open('', '_blank');
  if (!printWindow) return;

  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>${title || 'Document'}</title>
        <style>
          body { font-family: system-ui, -apple-system, sans-serif; padding: 40px; color: #111; line-height: 1.6; }
          h1, h2, h3 { color: #000; }
          pre, code { background: #f4f4f5; padding: 2px 4px; border-radius: 4px; font-family: monospace; }
          blockquote { border-left: 3px solid #ccc; margin-left: 0; padding-left: 16px; color: #666; }
        </style>
      </head>
      <body>
        <h1>${title || 'Document'}</h1>
        ${htmlContent}
      </body>
    </html>
  `);
  printWindow.document.close();
  printWindow.focus();
  printWindow.print();
  printWindow.close();
};