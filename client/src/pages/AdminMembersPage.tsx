import { useEffect, useState, type FormEvent } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { isAxiosError } from 'axios';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { ROLE_LABELS, ROLE_OPTIONS } from '../constants/roles';
import { inputClass } from '../constants/formStyles';
import type { UserRole } from '../types/user';

type ListedUser = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  createdAt?: string;
};

export default function AdminMembersPage() {
  const { user, token, registerUserAsAdmin } = useAuth();
  const [members, setMembers] = useState<ListedUser[]>([]);
  const [membersError, setMembersError] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState({
    email: '',
    password: '',
    firstName: '',
    lastName: '',
    role: 'etudiant_master' as UserRole,
  });
  const [createMsg, setCreateMsg] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (!token || user?.role !== 'administrateur') {
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const { data } = await api.get<{ users: ListedUser[] }>('/users');
        if (!cancelled) {
          setMembers(data.users);
          setMembersError(null);
        }
      } catch {
        if (!cancelled) {
          setMembersError('Impossible de charger la liste des membres.');
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token, user?.role]);

  if (user && user.role !== 'administrateur') {
    return <Navigate to="/" replace />;
  }

  const onCreateUser = async (e: FormEvent) => {
    e.preventDefault();
    setCreateMsg(null);
    setCreating(true);
    try {
      await registerUserAsAdmin(form);
      setCreateMsg('Compte créé.');
      setForm((f) => ({ ...f, email: '', password: '', firstName: '', lastName: '' }));
      try {
        const { data } = await api.get<{ users: ListedUser[] }>('/users');
        setMembers(data.users);
        setMembersError(null);
      } catch {
        setMembersError('Impossible de charger la liste des membres.');
      }
    } catch (err) {
      if (isAxiosError(err) && err.response?.data?.error) {
        setCreateMsg(String(err.response.data.error));
      } else {
        setCreateMsg('Échec de la création du compte.');
      }
    } finally {
      setCreating(false);
    }
  };

  const backBtnClass =
    'inline-flex items-center gap-2 rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm font-medium text-zinc-800 shadow-sm transition hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800';

  return (
    <main className="flex flex-col gap-6 text-left">
      <div>
        <Link to="/" className={backBtnClass}>
          <span aria-hidden className="text-lg leading-none">
            ←
          </span>
          Retour à l’accueil
        </Link>
      </div>
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">Gestion des membres</h1>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          Création de comptes pour étudiants, enseignants-chercheurs et personnel — réservé aux administrateurs.
        </p>
      </div>

      <section className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/60">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">Membres du laboratoire</h2>
          <button
            type="button"
            onClick={() => setCreateOpen((o) => !o)}
            className="rounded-lg border border-zinc-300 bg-zinc-50 px-3 py-2 text-sm font-medium text-zinc-800 hover:bg-zinc-100 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-700"
          >
            {createOpen ? 'Fermer' : 'Nouveau compte'}
          </button>
        </div>
        {membersError && <p className="mt-3 text-sm font-medium text-red-600 dark:text-red-400">{membersError}</p>}
        {createOpen && (
          <form className="mt-4 flex max-w-md flex-col gap-4 border-b border-zinc-200 pb-5 dark:border-zinc-700" onSubmit={(e) => void onCreateUser(e)}>
            {createMsg && (
              <p
                className={
                  createMsg.includes('créé')
                    ? 'text-sm font-medium text-green-700 dark:text-green-400'
                    : 'text-sm font-medium text-red-600 dark:text-red-400'
                }
              >
                {createMsg}
              </p>
            )}
            <label className="flex flex-col gap-1.5 text-sm font-medium text-zinc-800 dark:text-zinc-200">
              <span>Prénom</span>
              <input
                className={inputClass}
                value={form.firstName}
                onChange={(e) => setForm((f) => ({ ...f, firstName: e.target.value }))}
                required
              />
            </label>
            <label className="flex flex-col gap-1.5 text-sm font-medium text-zinc-800 dark:text-zinc-200">
              <span>Nom</span>
              <input
                className={inputClass}
                value={form.lastName}
                onChange={(e) => setForm((f) => ({ ...f, lastName: e.target.value }))}
                required
              />
            </label>
            <label className="flex flex-col gap-1.5 text-sm font-medium text-zinc-800 dark:text-zinc-200">
              <span>Email</span>
              <input
                className={inputClass}
                type="email"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                required
              />
            </label>
            <label className="flex flex-col gap-1.5 text-sm font-medium text-zinc-800 dark:text-zinc-200">
              <span>Mot de passe</span>
              <input
                className={inputClass}
                type="password"
                value={form.password}
                onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                required
                minLength={8}
              />
            </label>
            <label className="flex flex-col gap-1.5 text-sm font-medium text-zinc-800 dark:text-zinc-200">
              <span>Rôle</span>
              <select
                className={inputClass}
                value={form.role}
                onChange={(e) => setForm((f) => ({ ...f, role: e.target.value as UserRole }))}
              >
                {ROLE_OPTIONS.filter((r) => r !== 'administrateur').map((r) => (
                  <option key={r} value={r}>
                    {ROLE_LABELS[r]}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="submit"
              disabled={creating}
              className="inline-flex justify-center rounded-lg bg-violet-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {creating ? 'Création…' : 'Créer le compte'}
            </button>
          </form>
        )}
        <ul className="mt-4 flex flex-col gap-0 divide-y divide-zinc-200 dark:divide-zinc-700">
          {members.map((m) => (
            <li key={m.id} className="flex flex-wrap items-baseline gap-x-4 gap-y-1 py-3 first:pt-0">
              <span className="font-medium text-zinc-900 dark:text-zinc-50">
                {m.firstName} {m.lastName}
              </span>
              <span className="text-sm text-zinc-600 dark:text-zinc-400">{m.email}</span>
              <span className="rounded-full border border-violet-200 bg-violet-50 px-2 py-0.5 text-xs font-medium text-violet-900 dark:border-violet-500/40 dark:bg-violet-950/50 dark:text-violet-200">
                {ROLE_LABELS[m.role]}
              </span>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
