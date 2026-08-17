import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useUpdateDocument } from '@/features/dashboard/hooks/use-documents';
import {
  useDocPermissions,
  useGrantPermission,
  useRevokePermission,
  useUserSearch,
} from '@/features/dashboard/hooks/use-permissions';
import {
  Globe,
  Lock,
  Copy,
  Check,
  X,
  UserPlus,
  Trash2,
  Users,
  Shield,
  Loader2,
} from 'lucide-react';
import type { Role } from '@/features/dashboard/api/document.api';
import type { DocUserPermission, UserSearchItem } from '@/features/dashboard/api/permission.api';

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

interface DocSettingsModalContentProps {
  onClose: () => void;
  doc: {
    id: string;
    title: string;
    isPublic: boolean;
    publicRole: Role;
  };
}

const DocSettingsModalContent = ({ onClose, doc }: DocSettingsModalContentProps) => {
  const updateMutation = useUpdateDocument();
  const grantMutation = useGrantPermission(doc.id);
  const revokeMutation = useRevokePermission(doc.id);

  const [isPublic, setIsPublic] = useState(doc.isPublic);
  const [publicRole, setPublicRole] = useState<Role>(doc.publicRole);
  const [copied, setCopied] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUser, setSelectedUser] = useState<UserSearchItem | null>(null);
  const [assignRole, setAssignRole] = useState<'VIEWER' | 'EDITOR'>('VIEWER');
  const [showDropdown, setShowDropdown] = useState(false);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  const { data: rawPermissions, isLoading: isLoadingPerms } = useDocPermissions(doc.id);
  const { data: rawSearchResults, isFetching: isSearching } = useUserSearch(
    searchQuery,
    !selectedUser
  );

  const permissions: DocUserPermission[] = Array.isArray(rawPermissions) ? rawPermissions : [];
  const searchResults: UserSearchItem[] = Array.isArray(rawSearchResults) ? rawSearchResults : [];

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const existingUserIds = new Set(permissions.map((p) => p.userId));
  const filteredSearchResults = searchResults.filter((u) => !existingUserIds.has(u.id));

  const handleGrant = (e: React.SyntheticEvent) => {
    e.preventDefault();
    if (!searchQuery.trim() && !selectedUser) return;

    const payload = selectedUser
      ? { userId: selectedUser.id, role: assignRole }
      : { email: searchQuery.trim(), role: assignRole };

    grantMutation.mutate(payload, {
      onSuccess: () => {
        setSearchQuery('');
        setSelectedUser(null);
        setShowDropdown(false);
      },
    });
  };

  const handleRoleChange = (permission: DocUserPermission, newRole: 'VIEWER' | 'EDITOR') => {
    if (permission.role === newRole) return;
    grantMutation.mutate({ userId: permission.userId, role: newRole });
  };

  const handleSavePublicSettings = () => {
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
    navigator.clipboard.writeText(`${window.location.origin}/doc/${doc.id}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-xs">
      <div className="w-full max-w-lg rounded-xl border border-zinc-800 bg-zinc-900 p-6 shadow-2xl">
        <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
          <h3 className="text-lg font-semibold text-zinc-100">Cài đặt quyền truy cập</h3>
          <button
            onClick={onClose}
            className="rounded p-1 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200 cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-4 max-h-[70vh] space-y-5 overflow-y-auto pr-1">
          {/* Cấp quyền đích danh User */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-indigo-400" />
              <label className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                Thành viên được cấp quyền
              </label>
            </div>

            {/* Input Add User */}
            <div ref={searchContainerRef} className="relative">
              <form onSubmit={handleGrant} className="flex gap-2">
                <div className="relative flex-1">
                  <Input
                    placeholder="Nhập email hoặc tên..."
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setSelectedUser(null);
                      setShowDropdown(true);
                    }}
                    onFocus={() => setShowDropdown(true)}
                    className="h-9 text-xs"
                  />
                  {isSearching && (
                    <div className="absolute right-2.5 top-2.5">
                      <Loader2 className="h-4 w-4 animate-spin text-zinc-500" />
                    </div>
                  )}
                </div>

                <select
                  value={assignRole}
                  onChange={(e) => setAssignRole(e.target.value as 'VIEWER' | 'EDITOR')}
                  className="h-9 rounded-lg border border-zinc-700 bg-zinc-900 px-2 text-xs text-zinc-200 outline-none focus:border-zinc-500 cursor-pointer"
                >
                  <option value="VIEWER">Chỉ xem</option>
                  <option value="EDITOR">Chỉnh sửa</option>
                </select>

                <Button
                  type="submit"
                  size="sm"
                  disabled={grantMutation.isPending || (!searchQuery.trim() && !selectedUser)}
                  className="h-9 gap-1.5 bg-indigo-600 px-3 text-xs text-white hover:bg-indigo-500 shrink-0"
                >
                  {grantMutation.isPending ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <UserPlus className="h-3.5 w-3.5" />
                  )}
                  Thêm
                </Button>
              </form>

              {/* Autocomplete Dropdown */}
              {showDropdown && filteredSearchResults.length > 0 && !selectedUser && (
                <div className="absolute top-10 left-0 z-20 w-full rounded-lg border border-zinc-800 bg-zinc-950 p-1 shadow-xl">
                  {filteredSearchResults.map((u) => (
                    <button
                      key={u.id}
                      type="button"
                      onClick={() => {
                        setSelectedUser(u);
                        setSearchQuery(u.email);
                        setShowDropdown(false);
                      }}
                      className="flex w-full items-center justify-between rounded px-2.5 py-1.5 text-left text-xs hover:bg-zinc-800 cursor-pointer"
                    >
                      <div>
                        <p className="font-medium text-zinc-200">{u.name || u.email}</p>
                        {u.name && <p className="text-[10px] text-zinc-500">{u.email}</p>}
                      </div>
                      <span className="text-[10px] text-indigo-400">Chọn</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* List permissions */}
            <div className="rounded-lg border border-zinc-800 bg-zinc-950/50 p-2">
              {isLoadingPerms ? (
                <div className="flex items-center justify-center py-4 text-xs text-zinc-500">
                  <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> Đang tải...
                </div>
              ) : permissions.length === 0 ? (
                <p className="py-3 text-center text-xs text-zinc-500">
                  Chưa có user nào được cấp quyền riêng.
                </p>
              ) : (
                <div className="divide-y divide-zinc-800/60">
                  {permissions.map((p) => (
                    <div
                      key={p.userId}
                      className="flex items-center justify-between py-2 px-1 text-xs"
                    >
                      <div className="min-w-0 pr-2">
                        <p className="truncate font-medium text-zinc-200">
                          {p.user?.name || p.user?.email || p.userId}
                        </p>
                        <p className="truncate text-[11px] text-zinc-500">{p.user?.email}</p>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <select
                          value={p.role}
                          onChange={(e) =>
                            handleRoleChange(p, e.target.value as 'VIEWER' | 'EDITOR')
                          }
                          disabled={grantMutation.isPending}
                          className="h-7 rounded border border-zinc-800 bg-zinc-900 px-2 text-[11px] text-zinc-300 outline-none focus:border-zinc-700 cursor-pointer"
                        >
                          <option value="VIEWER">Chỉ xem</option>
                          <option value="EDITOR">Chỉnh sửa</option>
                        </select>

                        <button
                          type="button"
                          onClick={() => revokeMutation.mutate(p.userId)}
                          disabled={revokeMutation.isPending}
                          title="Xóa quyền"
                          className="rounded p-1 text-zinc-500 hover:bg-red-500/10 hover:text-red-400 transition-colors cursor-pointer"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Public Link Section */}
          <div className="border-t border-zinc-800 pt-4 space-y-4">
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-emerald-400" />
              <label className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                Truy cập công khai (Public Link)
              </label>
            </div>

            <div className="flex items-center justify-between rounded-lg border border-zinc-800 bg-zinc-950/60 p-3">
              <div className="flex items-center gap-3">
                {isPublic ? (
                  <Globe className="h-5 w-5 text-emerald-400 shrink-0" />
                ) : (
                  <Lock className="h-5 w-5 text-zinc-400 shrink-0" />
                )}
                <div>
                  <p className="text-sm font-medium text-zinc-200">
                    {isPublic ? 'Công khai (Public)' : 'Riêng tư (Private)'}
                  </p>
                  <p className="text-xs text-zinc-500">
                    {isPublic
                      ? 'Bất kỳ ai có link đều có thể truy cập'
                      : 'Chỉ người được cấp quyền mới có thể xem'}
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

            {isPublic && (
              <div className="space-y-1.5 rounded-lg border border-zinc-800 bg-zinc-950/40 p-3">
                <label className="text-xs font-medium text-zinc-400">
                  Quyền mặc định khi truy cập qua link
                </label>
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

            <div className="flex items-center justify-between gap-2 rounded-lg border border-zinc-800 bg-zinc-950 p-2 text-xs">
              <span className="truncate text-zinc-400 pl-1">{`${window.location.origin}/doc/${doc.id}`}</span>
              <Button
                size="sm"
                variant="outline"
                onClick={handleCopyLink}
                className="h-7 gap-1 px-2.5 text-xs shrink-0"
              >
                {copied ? (
                  <Check className="h-3.5 w-3.5 text-emerald-400" />
                ) : (
                  <Copy className="h-3.5 w-3.5" />
                )}
                {copied ? 'Đã copy' : 'Sao chép link'}
              </Button>
            </div>
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-2 border-t border-zinc-800 pt-4">
          <Button variant="ghost" size="sm" onClick={onClose}>
            Đóng
          </Button>
          <Button
            size="sm"
            onClick={handleSavePublicSettings}
            disabled={updateMutation.isPending}
            className="bg-indigo-600 text-white hover:bg-indigo-500"
          >
            {updateMutation.isPending ? 'Đang lưu...' : 'Lưu cấu hình Public'}
          </Button>
        </div>
      </div>
    </div>
  );
};

export const DocSettingsModal = ({ isOpen, onClose, doc }: DocSettingsModalProps) => {
  if (!isOpen) return null;
  return <DocSettingsModalContent key={`${doc.id}-${doc.isPublic}-${doc.publicRole}`} doc={doc} onClose={onClose} />;
};