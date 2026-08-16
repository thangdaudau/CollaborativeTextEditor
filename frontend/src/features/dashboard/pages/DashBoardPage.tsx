import { Navbar } from '../components/Navbar';
import { DocumentCard } from '../components/DocumentCard';
import { useMyDocuments, useCreateDocument } from '../hooks/use-documents';
import { Button } from '@/components/ui/button';
import { Plus, Loader2 } from 'lucide-react';

export const DashboardPage = () => {
  const { data: documents, isLoading, isError } = useMyDocuments();
  const createMutation = useCreateDocument();

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <Navbar />

      <main className="mx-auto max-w-6xl p-6">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Tài Liệu Của Bạn</h1>
            <p className="text-sm text-zinc-400">Quản lý và tạo mới các tài liệu cộng tác thời gian thực</p>
          </div>
          <Button
            onClick={() => createMutation.mutate('Untitled Document')}
            disabled={createMutation.isPending}
            className="gap-2 bg-indigo-600 text-white hover:bg-indigo-500"
          >
            {createMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Plus className="h-4 w-4" />
            )}
            Tạo tài liệu mới
          </Button>
        </div>

        {isLoading ? (
          <div className="flex h-64 items-center justify-center text-zinc-400">
            <Loader2 className="h-6 w-6 animate-spin text-zinc-500" />
          </div>
        ) : isError ? (
          <div className="rounded-lg border border-red-500/20 bg-red-500/10 p-4 text-center text-red-400">
            Không thể tải danh sách tài liệu. Vui lòng thử lại.
          </div>
        ) : documents?.length === 0 ? (
          <div className="flex h-64 flex-col items-center justify-center rounded-xl border border-dashed border-zinc-800 p-6 text-center">
            <p className="text-zinc-400">Chưa có tài liệu nào.</p>
            <Button
              variant="outline"
              onClick={() => createMutation.mutate('Untitled Document')}
              className="mt-4 gap-1 text-sm"
            >
              <Plus className="h-4 w-4" /> Bắt đầu tạo mới ngay
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {documents?.map((doc) => (
              <DocumentCard key={doc.id} doc={doc} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
};