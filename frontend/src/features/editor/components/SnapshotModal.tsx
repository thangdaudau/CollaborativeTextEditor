import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/services/api';
import { Button } from '@/components/ui/button';
import { History, RotateCcw, Clock, X } from 'lucide-react';

interface SnapshotItem {
  id: string;
  documentId: string;
  createdAt: string;
}

interface SnapshotModalProps {
  isOpen: boolean;
  onClose: () => void;
  docId: string;
}

export const SnapshotModal = ({ isOpen, onClose, docId }: SnapshotModalProps) => {
  const queryClient = useQueryClient();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const { data: snapshots = [], isLoading } = useQuery<SnapshotItem[]>({
    queryKey: ['snapshots', docId],
    queryFn: async () => {
      const res = await api.get(`/documents/${docId}/snapshots`);
      return res.data;
    },
    enabled: isOpen,
  });

  const { data: previewData } = useQuery({
    queryKey: ['snapshot-preview', docId, selectedId],
    queryFn: async () => {
      const res = await api.get(`/documents/${docId}/snapshots/${selectedId}`);
      return res.data;
    },
    enabled: !!selectedId,
  });

  const restoreMutation = useMutation({
    mutationFn: async (snapshotId: string) => {
      await api.post(`/documents/${docId}/snapshots/${snapshotId}/restore`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['document', docId] });
      onClose();
      window.location.reload();
    },
  });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4">
      <div className="w-full max-w-2xl rounded-xl border border-zinc-800 bg-zinc-900 p-6 shadow-2xl">
        <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
          <div className="flex items-center gap-2">
            <History className="h-5 w-5 text-indigo-400" />
            <h3 className="text-lg font-semibold text-zinc-100">Lịch sử phiên bản</h3>
          </div>
          <button
            onClick={onClose}
            className="rounded p-1 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-4 grid grid-cols-5 gap-4 h-80">
          {/* Cột danh sách snapshot */}
          <div className="col-span-2 border-r border-zinc-800 pr-2 overflow-y-auto space-y-1.5">
            {isLoading ? (
              <p className="text-xs text-zinc-500">Đang tải...</p>
            ) : snapshots.length === 0 ? (
              <p className="text-xs text-zinc-500">Chưa có snapshot nào.</p>
            ) : (
              snapshots.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setSelectedId(s.id)}
                  className={`w-full text-left p-2 rounded text-xs transition-colors flex items-center gap-2 cursor-pointer ${
                    selectedId === s.id
                      ? 'bg-indigo-600 text-white font-medium'
                      : 'hover:bg-zinc-800 text-zinc-400'
                  }`}
                >
                  <Clock className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">{new Date(s.createdAt).toLocaleString('vi-VN')}</span>
                </button>
              ))
            )}
          </div>

          {/* Cột xem trước nội dung */}
          <div className="col-span-3 flex flex-col justify-between pl-1">
            <div className="flex-1 overflow-y-auto rounded bg-zinc-950 p-3 text-xs text-zinc-300 font-mono whitespace-pre-wrap border border-zinc-800/80">
              {previewData?.previewText || 'Chọn một phiên bản bên trái để xem nội dung.'}
            </div>

            {selectedId && (
              <div className="mt-3 flex justify-end">
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => restoreMutation.mutate(selectedId)}
                  disabled={restoreMutation.isPending}
                  className="gap-1.5"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  {restoreMutation.isPending ? 'Đang khôi phục...' : 'Khôi phục bản này'}
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};