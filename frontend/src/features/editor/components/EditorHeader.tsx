import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import {
  ArrowLeft,
  Wifi,
  WifiOff,
  Globe,
  Lock,
  Share2,
  Download,
  History,
  FileText,
} from 'lucide-react';
import { DocSettingsModal } from '@/components/common/DocSettingsModal';
import { SnapshotModal } from './SnapshotModal';
import { useUpdateDocument } from '@/features/dashboard/hooks/use-documents';
import { exportToMarkdown, exportToPdf } from '../utils/export';
import type { Collaborator } from '../hooks/use-editor-collab';
import type { Role } from '@/features/dashboard/api/document.api';
import type { Editor } from '@tiptap/react';

interface EditorHeaderProps {
  doc: {
    id: string;
    title: string;
    isPublic: boolean;
    publicRole: Role;
  };
  connected: boolean;
  isReadOnly: boolean;
  collaborators: Collaborator[];
  editor: Editor | null;
}

export const EditorHeader = ({
  doc,
  connected,
  isReadOnly,
  collaborators,
  editor,
}: EditorHeaderProps) => {
  const navigate = useNavigate();
  const updateMutation = useUpdateDocument();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isSnapshotOpen, setIsSnapshotOpen] = useState(false);

  const handleTitleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const newTitle = e.target.value.trim();
    if (newTitle && newTitle !== doc.title && !isReadOnly) {
      updateMutation.mutate({ id: doc.id, data: { title: newTitle } });
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.currentTarget.blur();
    }
  };

  return (
    <>
      <header className="flex h-14 items-center justify-between border-b border-zinc-800 bg-zinc-950 px-4">
        <div className="flex items-center gap-3 flex-1 max-w-xl">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/')}
            className="h-8 px-2 text-zinc-400 hover:text-zinc-100 shrink-0"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <input
            key={doc.title}
            type="text"
            defaultValue={doc.title}
            disabled={isReadOnly}
            onBlur={handleTitleBlur}
            onKeyDown={handleKeyDown}
            className="w-full rounded bg-transparent px-2 py-1 text-sm font-semibold text-zinc-100 outline-none hover:bg-zinc-900 focus:bg-zinc-900 focus:ring-1 focus:ring-zinc-700 transition-colors disabled:cursor-not-allowed disabled:hover:bg-transparent"
          />
          <button
            onClick={() => setIsSettingsOpen(true)}
            className="shrink-0 cursor-pointer"
          >
            {doc.isPublic ? (
              <span className="flex items-center gap-1 rounded border border-emerald-500/20 bg-emerald-500/10 px-2 py-0.5 text-xs font-medium text-emerald-400 hover:bg-emerald-500/20 transition-colors">
                <Globe className="h-3 w-3" /> Public ({doc.publicRole === 'EDITOR' ? 'Edit' : 'View'})
              </span>
            ) : (
              <span className="flex items-center gap-1 rounded bg-zinc-800 px-2 py-0.5 text-xs font-medium text-zinc-400 hover:bg-zinc-700 transition-colors">
                <Lock className="h-3 w-3" /> Private
              </span>
            )}
          </button>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          {/* Nút Snapshot */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsSnapshotOpen(true)}
            className="h-8 px-2 gap-1 text-xs text-zinc-400 hover:text-zinc-200"
            title="Lịch sử phiên bản"
          >
            <History className="h-3.5 w-3.5" />
            <span className="hidden md:inline">Lịch sử</span>
          </Button>

          {/* Export Markdown */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => exportToMarkdown(editor, doc.title)}
            className="h-8 px-2 gap-1 text-xs text-zinc-400 hover:text-zinc-200"
            title="Xuất Markdown"
          >
            <FileText className="h-3.5 w-3.5" />
            <span className="hidden md:inline">MD</span>
          </Button>

          {/* Export PDF */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => exportToPdf(editor, doc.title)}
            className="h-8 px-2 gap-1 text-xs text-zinc-400 hover:text-zinc-200"
            title="Xuất PDF"
          >
            <Download className="h-3.5 w-3.5" />
            <span className="hidden md:inline">PDF</span>
          </Button>

          {/* Chia sẻ */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsSettingsOpen(true)}
            className="h-8 gap-1.5 text-xs"
          >
            <Share2 className="h-3.5 w-3.5" />
            Chia sẻ
          </Button>

          {/* Collaborator Avatars */}
          <div className="flex items-center -space-x-2">
            {collaborators.map((c) => (
              <div
                key={c.clientId}
                style={{ backgroundColor: c.user.color }}
                title={c.user.name}
                className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-zinc-950 text-xs font-bold text-zinc-950 shadow select-none uppercase"
              >
                {c.user.name.slice(0, 1)}
              </div>
            ))}
          </div>

          {/* Status Icon */}
          <div className="flex items-center pl-1">
            {connected ? (
              <span title="Đang đồng bộ" className="flex items-center text-emerald-400">
                <Wifi className="h-3.5 w-3.5" />
              </span>
            ) : (
              <span title="Mất kết nối" className="flex items-center text-red-400">
                <WifiOff className="h-3.5 w-3.5 animate-pulse" />
              </span>
            )}
          </div>
        </div>
      </header>

      <DocSettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        doc={doc}
      />

      <SnapshotModal
        isOpen={isSnapshotOpen}
        onClose={() => setIsSnapshotOpen(false)}
        docId={doc.id}
      />
    </>
  );
};