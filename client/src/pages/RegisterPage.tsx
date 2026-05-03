import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { isAxiosError } from 'axios';
import { useAuth } from '../context/AuthContext';

export default function RegisterPage() {
  const { registerBootstrap, needsBootstrap, loading, error, clearError } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const inputClass =
    'rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 shadow-sm outline-none ring-violet-500/40 focus:border-violet-500 focus:ring-2 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100';

  if (loading) {
    return (
      <main className="text-left">
        <p className="text-zinc-600 dark:text-zinc-400">Chargement…</p>
      </main>
    );
  }

  if (error && needsBootstrap === null) {
    return (
      <main className="text-left">
        <p className="text-sm font-medium text-red-600 dark:text-red-400">{error}</p>
        <p className="mt-6">
          <Link className="text-violet-600 underline-offset-2 hover:underline dark:text-violet-400" to="/login">
            Retour à la connexion
          </Link>
        </p>
      </main>
    );
  }

  if (needsBootstrap === false) {
    return (
      <main className="text-left">
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50 sm:text-3xl">
          Inscription
        </h1>
        <p className="mt-3 text-zinc-600 dark:text-zinc-400">
          Un compte administrateur existe déjà. Il n’y a pas d’inscription libre : un{' '}
          <strong className="text-zinc-800 dark:text-zinc-200">administrateur</strong> doit créer votre compte depuis
          le tableau de bord (menu Membres → Nouveau compte).
        </p>
        <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-500">
          Si vous venez d’installer l’application et souhaitez tout réinitialiser, videz la collection utilisateurs dans
          MongoDB ou utilisez une autre base, puis rechargez cette page.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            to="/login"
            className="inline-flex justify-center rounded-lg bg-violet-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-violet-700"
          >
            Retour à la connexion
          </Link>
        </div>
      </main>
    );
  }

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setFormError(null);
    clearError();
    setSubmitting(true);
    try {
      await registerBootstrap({ email, password, firstName, lastName });
      navigate('/', { replace: true });
    } catch (err) {
      if (isAxiosError(err) && err.response?.data?.error) {
        const data = err.response.data.error;
        setFormError(typeof data === 'string' ? data : JSON.stringify(data));
      } else {
        setFormError('Inscription impossible.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="text-left">
      <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50 sm:text-3xl">
        Inscription — premier administrateur
      </h1>
      <p className="mt-2 text-zinc-600 dark:text-zinc-400">
        Ce compte aura le rôle <strong className="text-zinc-800 dark:text-zinc-200">administrateur</strong> et pourra
        créer les autres utilisateurs.
      </p>
      <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-500">
        URL : <code className="rounded bg-zinc-200/80 px-1 py-0.5 dark:bg-zinc-800">/signup</code> ou{' '}
        <code className="rounded bg-zinc-200/80 px-1 py-0.5 dark:bg-zinc-800">/register</code>
      </p>
      {(error || formError) && (
        <p className="mt-4 text-sm font-medium text-red-600 dark:text-red-400">{formError ?? error}</p>
      )}
      <form className="mt-8 flex max-w-md flex-col gap-4" onSubmit={(e) => void onSubmit(e)}>
        <label className="flex flex-col gap-1.5 text-sm font-medium text-zinc-800 dark:text-zinc-200">
          <span>Prénom</span>
          <input className={inputClass} value={firstName} onChange={(e) => setFirstName(e.target.value)} required />
        </label>
        <label className="flex flex-col gap-1.5 text-sm font-medium text-zinc-800 dark:text-zinc-200">
          <span>Nom</span>
          <input className={inputClass} value={lastName} onChange={(e) => setLastName(e.target.value)} required />
        </label>
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
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
          />
        </label>
        <button
          type="submit"
          disabled={submitting}
          className="mt-1 inline-flex justify-center rounded-lg bg-violet-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitting ? 'Création…' : 'Créer le compte'}
        </button>
      </form>
      <p className="mt-8 text-sm">
        <Link className="text-violet-600 underline-offset-2 hover:underline dark:text-violet-400" to="/login">
          Retour à la connexion
        </Link>
      </p>
    </main>
  );
}
