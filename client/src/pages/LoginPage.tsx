import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { isAxiosError } from 'axios';

export default function LoginPage() {
  const { login, needsBootstrap, loading: authLoading, error: authError, clearError } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setFormError(null);
    clearError();
    setSubmitting(true);
    try {
      await login(email, password);
      navigate('/', { replace: true });
    } catch (err) {
      if (isAxiosError(err) && err.response?.data?.error) {
        setFormError(String(err.response.data.error));
      } else {
        setFormError('Connexion impossible.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const inputClass =
    'rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 shadow-sm outline-none ring-violet-500/40 focus:border-violet-500 focus:ring-2 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100';

  return (
    <main className="text-left">
      <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50 sm:text-3xl">
        Connexion
      </h1>
      <p className="mt-2 text-zinc-600 dark:text-zinc-400">Laboratoire — gestion centralisée</p>

      {needsBootstrap === true && (
        <div className="mt-6 rounded-lg border border-violet-200 bg-violet-50 px-4 py-3 text-sm text-violet-950 dark:border-violet-500/30 dark:bg-violet-950/40 dark:text-violet-100">
          <p className="m-0">
            Aucun compte en base : utilisez <strong>S’inscrire</strong> ci-dessous pour créer le{' '}
            <strong>premier administrateur</strong>.
          </p>
        </div>
      )}

      {(authError || formError) && (
        <p className="mt-4 text-sm font-medium text-red-600 dark:text-red-400">{formError ?? authError}</p>
      )}

      <form className="mt-8 flex max-w-md flex-col gap-4" onSubmit={(e) => void onSubmit(e)}>
        <label className="flex flex-col gap-1.5 text-sm font-medium text-zinc-800 dark:text-zinc-200">
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
        <label className="flex flex-col gap-1.5 text-sm font-medium text-zinc-800 dark:text-zinc-200">
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
          className="mt-1 inline-flex justify-center rounded-lg bg-violet-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitting ? 'Connexion…' : 'Se connecter'}
        </button>
      </form>

      <div className="mt-8 max-w-md border-t border-zinc-200 pt-6 dark:border-zinc-700">
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          {needsBootstrap === true
            ? 'Première utilisation ?'
            : 'Pas encore de compte ou besoin d’aide ?'}
        </p>
        <Link
          to="/signup"
          className="mt-3 inline-flex w-full justify-center rounded-lg border border-zinc-300 bg-white px-4 py-2.5 text-sm font-medium text-zinc-800 shadow-sm transition hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800"
        >
          S’inscrire
        </Link>
        <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-500">
          {needsBootstrap === true
            ? 'Ouvre le formulaire du premier administrateur (/signup).'
            : 'Si l’app est déjà initialisée, cette page explique comment obtenir un accès.'}
        </p>
      </div>
    </main>
  );
}
