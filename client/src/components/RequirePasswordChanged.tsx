import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

/** Sends users with `isFirstLogin` to `/change-password` before any main app UI. */
export default function RequirePasswordChanged() {
  const { user } = useAuth();
  if (user?.isFirstLogin) {
    return <Navigate to="/change-password" replace />;
  }
  return <Outlet />;
}
