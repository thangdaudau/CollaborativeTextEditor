import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useUpdateDocument } from '@/features/dashboard/hooks/use-documents';
import { Globe, Lock, Copy, Check, X } from 'lucide-react';
import type { Role } from '@/features/dashboard/api/document.api';

interface DocSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  doc: {
    id: string;
    title: string;
    isPublic: boolean;
    publicRole: Role;
  };
}

export const DocSettingsModal = ({ isOpen, onClose, doc }: DocSettingsModalProps) => {
  const updateMutation = useUpdateDocument();
  const [isPublic, setIsPublic] = useState(doc.isPublic);
  const [publicRole, setPublicRole] = useState<Role>(doc.publicRole);
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleSave = () => {
    updateMutation.mutate(
      {
        id: doc.id,
        data: { isPublic, publicRole },
      },
      {
        onSuccess: () => onClose(),
      }
    );
  };

  const handleCopyLink = () => {
    const url = `${window.location.origin}/doc/${doc.id}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4">
      <div className="w-full max-w-md rounded-xl border border-zinc-800 bg-zinc-900 p-6 shadow-2xl">
        <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
          <h3 className="text-lg font-semibold text-zinc-100">Cài đặt quyền truy cập</h3>
          <button
            onClick={onClose}
            className="rounded p-1 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-4 space-y-4">
          {/* Trạng thái Public / Private */}
          <div className="flex items-center justify-between rounded-lg border border-zinc-800 bg-zinc-950/60 p-3">
            <div className="flex items-center gap-3">
              {isPublic ? (
                <Globe className="h-5 w-5 text-emerald-400" />
              ) : (
                <Lock className="h-5 w-5 text-zinc-400" />
              )}
              <div>
                <p className="text-sm font-medium text-zinc-200">
                  {isPublic ? 'Chế độ Công khai (Public)' : 'Chế độ Riêng tư (Private)'}
                </p>
                <p className="text-xs text-zinc-500">
                  {isPublic
                    ? 'Bất kỳ ai có đường link đều có thể truy cập'
                    : 'Chỉ những người được mời mới có quyền truy cập'}
                </p>
              </div>
            </div>
            <input
              type="checkbox"
              checked={isPublic}
              onChange={(e) => setIsPublic(e.target.checked)}
              className="h-5 w-5 rounded border-zinc-700 bg-zinc-900 accent-indigo-600 cursor-pointer"
            />
          </div>

          {/* Cấu hình Public Role */}
          {isPublic && (
            <div className="space-y-1.5 rounded-lg border border-zinc-800 bg-zinc-950/40 p-3">
              <label className="text-xs font-medium text-zinc-400">Quyền mặc định khi truy cập qua link</label>
              <div className="grid grid-cols-2 gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setPublicRole('VIEWER')}
                  className={`flex items-center justify-center gap-1.5 rounded-lg border py-2 text-xs font-medium transition-colors cursor-pointer ${
                    publicRole === 'VIEWER'
                      ? 'border-indigo-500 bg-indigo-500/10 text-indigo-400'
                      : 'border-zinc-800 bg-zinc-900 text-zinc-400 hover:border-zinc-700'
                  }`}
                >
                  Chỉ xem (VIEWER)
                </button>
                <button
                  type="button"
                  onClick={() => setPublicRole('EDITOR')}
                  className={`flex items-center justify-center gap-1.5 rounded-lg border py-2 text-xs font-medium transition-colors cursor-pointer ${
                    publicRole === 'EDITOR'
                      ? 'border-indigo-500 bg-indigo-500/10 text-indigo-400'
                      : 'border-zinc-800 bg-zinc-900 text-zinc-400 hover:border-zinc-700'
                  }`}
                >
                  Chỉnh sửa (EDITOR)
                </button>
              </div>
            </div>
          )}

          {/* Copy link */}
          <div className="flex items-center justify-between gap-2 rounded-lg border border-zinc-800 bg-zinc-950 p-2 text-xs">
            <span className="truncate text-zinc-400 pl-1">{`${window.location.origin}/doc/${doc.id}`}</span>
            <Button
              size="sm"
              variant="outline"
              onClick={handleCopyLink}
              className="h-7 gap-1 px-2.5 text-xs shrink-0"
            >
              {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
              {copied ? 'Đã copy' : 'Sao chép'}
            </Button>
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-2 border-t border-zinc-800 pt-4">
          <Button variant="ghost" size="sm" onClick={onClose}>
            Hủy
          </Button>
          <Button
            size="sm"
            onClick={handleSave}
            disabled={updateMutation.isPending}
            className="bg-indigo-600 text-white hover:bg-indigo-500"
          >
            {updateMutation.isPending ? 'Đang lưu...' : 'Lưu thay đổi'}
          </Button>
        </div>
      </div>
    </div>
  );
};