import { useMemo, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Collaboration from '@tiptap/extension-collaboration';
import CollaborationCursor from '@tiptap/extension-collaboration-cursor';
import * as Y from 'yjs';
import { api } from '@/services/api';
import { useMe } from '@/features/auth/hooks/use-auth';
import { useEditorCollab } from '../hooks/use-editor-collab';
import { EditorHeader } from '../components/EditorHeader';
import { EditorToolbar } from '../components/EditorToolbar';
import type { Role } from '@/features/dashboard/api/document.api';
import { Markdown } from 'tiptap-markdown'

interface DocumentDetails {
  id: string;
  title: string;
  ownerId: string;
  isPublic: boolean;
  publicRole: Role;
}

export const EditorPage = () => {
  const { id: docId = '' } = useParams<{ id: string }>();
  const { data: user } = useMe();
  const { data: doc, isLoading } = useQuery({
    queryKey: ['document', docId],
    queryFn: async () => {
      const res = await api.get<DocumentDetails>(`/documents/${docId}`);
      return res.data;
    },
    enabled: !!docId,
  });

  const { ydoc, provider, connected, collaborators, userColor } = useEditorCollab(docId);
  const isOwner = Boolean(user && doc && doc.ownerId === user.id);
  const canEdit = isOwner || (doc?.isPublic && doc?.publicRole === 'EDITOR');
  const isReadOnly = !canEdit;  const currentUserName = user?.name || user?.email?.split('@')[0] || 'Guest User';

  // Quản lý UndoManager chuẩn vòng đời
  const undoManager = useMemo(() => {
    const fragment = ydoc.getXmlFragment('default');
    return new Y.UndoManager(fragment);
  }, [ydoc]);

  useEffect(() => {
    return () => {
      undoManager.destroy();
    };
  }, [undoManager]);

  // Khởi tạo Editor
  const editor = useEditor(
    {
      editable: !isReadOnly,
      extensions: [
        StarterKit.configure({
          history: false,
        }),
        Markdown.configure({
          html: false, // Không chèn HTML raw vào file markdown
          tightLists: true, // Giúp danh sách gọn, không bị đẻ dòng trống
          bulletListMarker: '-', // Dùng dấu gạch ngang cho bullet list
          transformPastedText: true, // Tự động parse khi dán cú pháp Markdown vào editor
        }),
        Collaboration.configure({
          document: ydoc,
          field: 'default',
        }),
        CollaborationCursor.configure({
          provider,
          user: {
            name: currentUserName,
            color: userColor,
          },
        }),
      ],
    },
    [ydoc, provider]
  );

  // Bắt phím an toàn: Chỉ undo khi editor đang focus
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isReadOnly || !editor || !editor.isFocused) return;

      const isMod = e.ctrlKey || e.metaKey;
      if (isMod && e.key.toLowerCase() === 'z' && !e.shiftKey) {
        e.preventDefault();
        undoManager.undo();
      } else if (
        isMod &&
        (e.key.toLowerCase() === 'y' || (e.shiftKey && e.key.toLowerCase() === 'z'))
      ) {
        e.preventDefault();
        undoManager.redo();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undoManager, isReadOnly, editor]);

  // Đảm bảo TipTap lock/unlock tức thì khi role thay đổi
  useEffect(() => {
    if (editor && !editor.isDestroyed) {
      editor.setEditable(!isReadOnly);
    }
  }, [editor, isReadOnly]);

  if (isLoading || !doc) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-950 text-zinc-400">
        Đang tải tài liệu...
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-zinc-950 text-zinc-100">
      <EditorHeader
        doc={doc}
        connected={connected}
        isReadOnly={isReadOnly}
        collaborators={collaborators}
        editor={editor}
      />
      <EditorToolbar editor={editor} readOnly={isReadOnly} undoManager={undoManager} />
      <main className="flex-1 overflow-y-auto p-4 sm:p-8">
        <div className="mx-auto min-h-175 max-w-4xl rounded-xl border border-zinc-800 bg-zinc-900/40 p-8 shadow-2xl backdrop-blur">
          <EditorContent
            editor={editor}
            className="prose prose-invert prose-p:my-1 prose-headings:my-3 max-w-none focus:outline-none"
          />
        </div>
      </main>
    </div>
  );
};