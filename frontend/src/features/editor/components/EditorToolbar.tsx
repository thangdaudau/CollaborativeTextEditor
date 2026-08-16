import type { Editor } from '@tiptap/react';
import type * as Y from 'yjs';
import {
  Bold, Italic, Strikethrough, Code,
  Heading1, Heading2, Heading3,
  List, ListOrdered, Quote, Undo, Redo
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface ToolbarProps {
  editor: Editor | null;
  readOnly?: boolean;
  undoManager: Y.UndoManager | null;
}

export const EditorToolbar = ({ editor, readOnly, undoManager }: ToolbarProps) => {
  if (!editor || readOnly) return null;

  const buttons = [
    {
      icon: <Bold className="h-4 w-4" />,
      action: () => editor.chain().focus().toggleBold().run(),
      isActive: editor.isActive('bold'),
      title: 'In đậm',
    },
    {
      icon: <Italic className="h-4 w-4" />,
      action: () => editor.chain().focus().toggleItalic().run(),
      isActive: editor.isActive('italic'),
      title: 'In nghiêng',
    },
    {
      icon: <Strikethrough className="h-4 w-4" />,
      action: () => editor.chain().focus().toggleStrike().run(),
      isActive: editor.isActive('strike'),
      title: 'Gạch ngang',
    },
    {
      icon: <Code className="h-4 w-4" />,
      action: () => editor.chain().focus().toggleCode().run(),
      isActive: editor.isActive('code'),
      title: 'Inline Code',
    },
    { type: 'divider' },
    {
      icon: <Heading1 className="h-4 w-4" />,
      action: () => editor.chain().focus().toggleHeading({ level: 1 }).run(),
      isActive: editor.isActive('heading', { level: 1 }),
      title: 'Heading 1',
    },
    {
      icon: <Heading2 className="h-4 w-4" />,
      action: () => editor.chain().focus().toggleHeading({ level: 2 }).run(),
      isActive: editor.isActive('heading', { level: 2 }),
      title: 'Heading 2',
    },
    {
      icon: <Heading3 className="h-4 w-4" />,
      action: () => editor.chain().focus().toggleHeading({ level: 3 }).run(),
      isActive: editor.isActive('heading', { level: 3 }),
      title: 'Heading 3',
    },
    { type: 'divider' },
    {
      icon: <List className="h-4 w-4" />,
      action: () => editor.chain().focus().toggleBulletList().run(),
      isActive: editor.isActive('bulletList'),
      title: 'Danh sách',
    },
    {
      icon: <ListOrdered className="h-4 w-4" />,
      action: () => editor.chain().focus().toggleOrderedList().run(),
      isActive: editor.isActive('orderedList'),
      title: 'Danh sách số',
    },
    {
      icon: <Quote className="h-4 w-4" />,
      action: () => editor.chain().focus().toggleBlockquote().run(),
      isActive: editor.isActive('blockquote'),
      title: 'Trích dẫn',
    },
    { type: 'divider' },
    {
      icon: <Undo className="h-4 w-4" />,
      action: () => undoManager?.undo(),
      isActive: false,
      title: 'Hoàn tác (Ctrl+Z)',
    },
    {
      icon: <Redo className="h-4 w-4" />,
      action: () => undoManager?.redo(),
      isActive: false,
      title: 'Làm lại (Ctrl+Y)',
    },
  ];

  return (
    <div className="flex flex-wrap items-center gap-1 border-b border-zinc-800 bg-zinc-900/40 p-2">
      {buttons.map((btn, idx) => {
        if (btn.type === 'divider') {
          return <div key={idx} className="mx-1 h-5 w-px bg-zinc-800" />;
        }
        return (
          <button
            key={idx}
            type="button"
            onClick={btn.action}
            title={btn.title}
            className={cn(
              'rounded p-1.5 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200 transition-colors',
              btn.isActive && 'bg-zinc-800 text-indigo-400 font-semibold'
            )}
          >
            {btn.icon}
          </button>
        );
      })}
    </div>
  );
};