import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { FileText, Trash2, Edit2, Check, X, Globe, Lock, Settings2 } from 'lucide-react';
import { useDeleteDocument, useUpdateDocument } from '../hooks/use-documents';
import { DocSettingsModal } from '@/components/common/DocSettingsModal';
import type { DocumentItem } from '../api/document.api';

export const DocumentCard = ({ doc }: { doc: DocumentItem }) => {
  const navigate = useNavigate();
  const deleteMutation = useDeleteDocument();
  const updateMutation = useUpdateDocument();

  const [isEditing, setIsEditing] = useState(false);
  const [title, setTitle] = useState(doc.title);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const handleRename = (e: React.SyntheticEvent) => {
    e.stopPropagation();
    if (!title.trim()) return;
    updateMutation.mutate(
      { id: doc.id, data: { title } },
      { onSuccess: () => setIsEditing(false) }
    );
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm(`Bạn có chắc chắn muốn xóa tài liệu "${doc.title}" không?`)) {
      deleteMutation.mutate(doc.id);
    }
  };

  const formattedDate = new Date(doc.updatedAt).toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <>
      <Card
        onClick={() => !isEditing && navigate(`/doc/${doc.id}`)}
        className="group relative cursor-pointer border-zinc-800 bg-zinc-900/50 transition-all hover:border-zinc-700 hover:bg-zinc-900"
      >
        <CardHeader className="p-4 pb-2">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-indigo-400 shrink-0" />
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setIsSettingsOpen(true);
                }}
                className="cursor-pointer"
                title="Thay đổi quyền truy cập"
              >
                {doc.isPublic ? (
                  <span className="flex items-center gap-1 text-[11px] font-medium text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 px-1.5 py-0.5 rounded border border-emerald-500/20 transition-colors">
                    <Globe className="h-3 w-3" /> Public ({doc.publicRole === 'EDITOR' ? 'Edit' : 'View'})
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-[11px] font-medium text-zinc-400 bg-zinc-800 hover:bg-zinc-700 px-1.5 py-0.5 rounded transition-colors">
                    <Lock className="h-3 w-3" /> Private
                  </span>
                )}
              </button>
            </div>

            <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setIsSettingsOpen(true);
                }}
                title="Cài đặt tài liệu"
                className="rounded p-1 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"
              >
                <Settings2 className="h-4 w-4" />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setIsEditing(true);
                }}
                title="Đổi tên"
                className="rounded p-1 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"
              >
                <Edit2 className="h-4 w-4" />
              </button>
              <button
                onClick={handleDelete}
                title="Xóa"
                className="rounded p-1 text-red-400 hover:bg-red-500/10 hover:text-red-300"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>

          {isEditing ? (
            <div className="mt-2 flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleRename(e)}
                className="h-8 text-sm"
                autoFocus
              />
              <Button size="sm" onClick={handleRename} className="h-8 px-2">
                <Check className="h-4 w-4" />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setTitle(doc.title);
                  setIsEditing(false);
                }}
                className="h-8 px-2"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <CardTitle className="mt-2 text-base font-medium text-zinc-100 line-clamp-1">
              {doc.title}
            </CardTitle>
          )}
        </CardHeader>

        <CardContent className="p-4 pt-0">
          <p className="text-xs text-zinc-500">Cập nhật: {formattedDate}</p>
        </CardContent>
      </Card>

      <DocSettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        doc={doc}
      />
    </>
  );
};