import { Routes, Route, Navigate, BrowserRouter } from 'react-router-dom';
import { useAuthStore } from '@/stores/auth.store';
import { useMe } from '@/features/auth/hooks/use-auth';
import { LoginPage } from '@/features/auth/pages/LoginPage';
import { RegisterPage } from '@/features/auth/pages/RegisterPage';
import { DashboardPage } from '@/features/dashboard/pages/DashBoardPage';
import { EditorPage } from '@/features/editor/pages/EditorPage';

// Component bảo vệ Route bắt buộc đăng nhập
const ProtectedRoute = ({ children }: { children: React.JSX.Element }) => {
  const token = useAuthStore((s) => s.token);
  const { isLoading } = useMe();

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-950 text-zinc-400">
        Đang tải thông tin...
      </div>
    );
  }

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  return children;
};

// Component chặn user đã đăng nhập quay lại Login/Register
const PublicOnlyRoute = ({ children }: { children: React.JSX.Element }) => {
  const token = useAuthStore((s) => s.token);
  if (token) {
    return <Navigate to="/" replace />;
  }
  return children;
};

export const AppRoutes = () => {
  return (
    <BrowserRouter>
      <Routes>
        {/* Auth routes */}
        <Route
          path="/login"
          element={
            <PublicOnlyRoute>
              <LoginPage />
            </PublicOnlyRoute>
          }
        />
        <Route
          path="/register"
          element={
            <PublicOnlyRoute>
              <RegisterPage />
            </PublicOnlyRoute>
          }
        />

        {/* Dashboard route (yêu cầu đăng nhập) */}
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <DashboardPage />
            </ProtectedRoute>
          }
        />

        {/* Editor route (Guest vào được nếu Public Doc) */}
        <Route path="/doc/:id" element={<EditorPage />} />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
};