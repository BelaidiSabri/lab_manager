import { useState, type FormEvent } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { isAxiosError } from 'axios';
import { inputClass } from '../constants/formStyles';

export default function LoginPage() {
  const { login, user, loading: authLoading, error: authError, clearError } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  if (!authLoading && user) {
    return <Navigate to="/dashboard" replace />;
  }

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setFormError(null);
    clearError();
    setSubmitting(true);
    try {
      const u = await login(email, password);
      toast('Connexion réussie.', 'success');
      void navigate(u.isFirstLogin ? '/change-password' : '/dashboard', { replace: true });
    } catch (err) {
      if (isAxiosError(err) && err.response?.data?.error) {
        const er = err.response.data.error;
        const msg = typeof er === 'string' ? er : JSON.stringify(er);
        setFormError(msg);
        toast(msg, 'error');
      } else {
        setFormError('Connexion impossible.');
        toast('Connexion impossible.', 'error');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="ds-card w-full max-w-md text-left">
      <Link to="/" className="text-sm font-medium text-primary hover:underline">
        ← Retour à l&apos;accueil
      </Link>
      <h1 className="ds-title-page mt-4">Connexion</h1>
      <p className="ds-body mt-2">
        Laboratoire — les comptes sont créés par l&apos;administrateur.
      </p>

      {(authError || formError) && (
        <p className="mt-4 text-sm font-medium text-error">{formError ?? authError}</p>
      )}

      <form className="mt-8 flex flex-col gap-4" onSubmit={(e) => void onSubmit(e)}>
        <label className="flex flex-col gap-1.5 text-sm font-medium text-slate-800">
          <span>Email</span>
          <input
            className={inputClass}
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </label>
        <label className="flex flex-col gap-1.5 text-sm font-medium text-slate-800">
          <span>Mot de passe</span>
          <input
            className={inputClass}
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
          />
        </label>
        <button
          type="submit"
          disabled={submitting || authLoading}
          className="ds-btn-primary mt-2 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitting ? 'Connexion…' : 'Se connecter'}
        </button>
      </form>
    </main>
  );
}
