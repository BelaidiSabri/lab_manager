import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function ProtectedRoute() {
  const { token, user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex min-h-svh flex-col items-center justify-center gap-4 bg-page px-6">
        <div className="h-10 w-48 animate-pulse rounded-lg bg-slate-200" />
        <div className="h-4 w-64 max-w-full animate-pulse rounded bg-slate-200" />
        <p className="ds-muted text-center">Chargement de la session…</p>
      </div>
    );
  }

  if (!token || !user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  return <Outlet />;
}
