import { Navigate } from 'react-router-dom';

/** Self-registration is disabled; accounts are issued by the lab admin. */
export default function RegisterPage() {
  return <Navigate to="/login" replace />;
}
