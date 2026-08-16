import { useAuthStore } from '@/stores/auth.store';
import { useMe } from '@/features/auth/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { LogOut, FileText } from 'lucide-react';

export const Navbar = () => {
  const logout = useAuthStore((s) => s.logout);
  const { data: user } = useMe();

  return (
    <header className="sticky top-0 z-10 border-b border-zinc-800 bg-zinc-950/80 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
        <div className="flex items-center gap-2 font-semibold text-zinc-100">
          <FileText className="h-6 w-6 text-indigo-500" />
          <span>CollabEditor</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-zinc-400">
            {user?.name || user?.email}
          </span>
          <Button variant="outline" onClick={logout} className="h-8 gap-1 px-3 text-xs">
            <LogOut className="h-3.5 w-3.5" />
            Đăng xuất
          </Button>
        </div>
      </div>
    </header>
  );
};