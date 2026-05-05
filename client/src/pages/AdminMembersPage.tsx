import { useEffect, useState, type FormEvent } from 'react';
import { Navigate } from 'react-router-dom';
import { isAxiosError } from 'axios';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { ACADEMIC_GRADE_OPTIONS, ROLE_LABELS, ROLE_OPTIONS } from '../constants/roles';
import { ACADEMIC_PROGRAM_LABELS } from '../constants/concours';
import { inputClass } from '../constants/formStyles';
import type { UserRole } from '../types/user';
import Breadcrumb from '../components/layout/Breadcrumb';
import EmptyState from '../components/ui/EmptyState';
import Skeleton from '../components/ui/Skeleton';
import { formatDateDMY } from '../lib/formatDate';

type ListedUser = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  currentGrade?: string;
  isActive: boolean;
  createdAt?: string;
};

export default function AdminMembersPage() {
  const { user, token } = useAuth();
  const { toast } = useToast();
  const canFetchMembers = Boolean(token && user?.role === 'super_admin');
  const [members, setMembers] = useState<ListedUser[]>([]);
  /** True after fetch settles while user may load members. */
  const [listReady, setListReady] = useState(false);
  const [membersError, setMembersError] = useState<string | null>(null);

  const displayMembers = canFetchMembers ? members : [];
  const displayError = canFetchMembers ? membersError : null;
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    role: 'doctorant' as UserRole,
    currentGrade: '',
    academicProgram: '' as '' | 'none' | 'master' | 'doctorate',
  });
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (!canFetchMembers) {
      return;
    }
    let cancelled = false;
    void (async () => {
      await Promise.resolve();
      if (cancelled) return;
      setListReady(false);
      try {
        const { data } = await api.get<{ users: ListedUser[] }>('/users');
        if (!cancelled) {
          setMembers(data.users);
          setMembersError(null);
          setListReady(true);
        }
      } catch {
        if (!cancelled) {
          setMembersError('Impossible de charger la liste des membres.');
          toast('Impossible de charger la liste des membres.', 'error');
          setListReady(true);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [canFetchMembers, toast]);

  const listLoading = canFetchMembers && !listReady;

  if (user && user.role !== 'super_admin') {
    return <Navigate to="/" replace />;
  }

  const onCreateUser = async (e: FormEvent) => {
    e.preventDefault();
    setCreating(true);
    try {
      const payload: {
        name: string;
        email: string;
        password: string;
        role: UserRole;
        currentGrade?: string;
        academicProgram?: 'none' | 'master' | 'doctorate';
      } = {
        name: form.name.trim(),
        email: form.email.trim().toLowerCase(),
        password: form.password,
        role: form.role,
      };
      if (form.currentGrade !== '') {
        payload.currentGrade = form.currentGrade;
      }
      const ap = form.academicProgram;
      if (ap === 'none' || ap === 'master' || ap === 'doctorate') {
        payload.academicProgram = ap;
      }
      await api.post('/users', payload);
      toast('Compte créé.', 'success');
      setForm((f) => ({ ...f, email: '', password: '', name: '', currentGrade: '', academicProgram: '' }));
      try {
        const { data } = await api.get<{ users: ListedUser[] }>('/users');
        setMembers(data.users);
        setMembersError(null);
      } catch {
        const msg = 'Impossible de charger la liste des membres.';
        setMembersError(msg);
        toast(msg, 'error');
      }
    } catch (err) {
      const fallback = 'Échec de la création du compte.';
      if (isAxiosError(err) && err.response?.data?.error) {
        const msg = String(err.response.data.error);
        toast(msg, 'error');
      } else {
        toast(fallback, 'error');
      }
    } finally {
      setCreating(false);
    }
  };

  const selectClass = `${inputClass} cursor-pointer`;

  return (
    <main className="flex flex-col gap-6 text-left">
      <Breadcrumb items={[{ label: 'Accueil', to: '/' }, { label: 'Membres' }]} />

      <div>
        <h1 className="ds-title-page">Gestion des membres</h1>
        <p className="ds-body mt-1">Création de comptes — réservé au super administrateur.</p>
      </div>

      <section className="ds-card">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="ds-card-title">Membres du laboratoire</h2>
          <button type="button" onClick={() => setCreateOpen((o) => !o)} className="ds-btn-secondary">
            {createOpen ? 'Fermer' : 'Nouveau compte'}
          </button>
        </div>
        {displayError && <p className="mt-3 text-sm font-medium text-error">{displayError}</p>}
        {createOpen && (
          <form
            className="mt-6 flex max-w-md flex-col gap-4 border-b border-slate-100 pb-6"
            onSubmit={(e) => void onCreateUser(e)}
          >
            <label className="flex flex-col gap-1.5 text-sm font-medium text-slate-800">
              <span>Nom complet</span>
              <input
                className={inputClass}
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                required
              />
            </label>
            <label className="flex flex-col gap-1.5 text-sm font-medium text-slate-800">
              <span>Email</span>
              <input
                className={inputClass}
                type="email"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                required
              />
            </label>
            <label className="flex flex-col gap-1.5 text-sm font-medium text-slate-800">
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
            <label className="flex flex-col gap-1.5 text-sm font-medium text-slate-800">
              <span>Rôle</span>
              <select
                className={selectClass}
                value={form.role}
                onChange={(e) => setForm((f) => ({ ...f, role: e.target.value as UserRole }))}
              >
                {ROLE_OPTIONS.map((r) => (
                  <option key={r} value={r}>
                    {ROLE_LABELS[r]}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1.5 text-sm font-medium text-slate-800">
              <span>Grade académique / carrière (optionnel)</span>
              <select
                className={selectClass}
                value={form.currentGrade}
                onChange={(e) =>
                  setForm((f) => ({ ...f, currentGrade: e.target.value as typeof f.currentGrade }))
                }
              >
                <option value="">Par défaut (aligné sur le rôle)</option>
                {ACADEMIC_GRADE_OPTIONS.map((g) => (
                  <option key={g} value={g}>
                    {ROLE_LABELS[g]}
                  </option>
                ))}
              </select>
              <span className="text-xs font-normal text-slate-500">
                Valeurs calées sur le référentiel du laboratoire.
              </span>
            </label>
            <label className="flex flex-col gap-1.5 text-sm font-medium text-slate-800">
              <span>Parcours Master / Doctorat (optionnel)</span>
              <select
                className={selectClass}
                value={form.academicProgram}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    academicProgram: e.target.value as '' | 'none' | 'master' | 'doctorate',
                  }))
                }
              >
                <option value="">Auto (selon le rôle)</option>
                <option value="none">{ACADEMIC_PROGRAM_LABELS.none}</option>
                <option value="master">{ACADEMIC_PROGRAM_LABELS.master}</option>
                <option value="doctorate">{ACADEMIC_PROGRAM_LABELS.doctorate}</option>
              </select>
              <span className="text-xs font-normal text-slate-500">
                Distinct du grade de carrière obtenu par concours.
              </span>
            </label>
            <button type="submit" disabled={creating} className="ds-btn-primary w-fit disabled:opacity-60">
              {creating ? 'Création…' : 'Créer le compte'}
            </button>
          </form>
        )}

        {listLoading ? (
          <div className="mt-6 space-y-2">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : displayMembers.length === 0 ? (
          <EmptyState
            icon={<span className="text-4xl text-slate-300">👥</span>}
            title="Aucun membre pour le moment"
            description="Créez un compte avec le bouton « Nouveau compte » ci-dessus."
          />
        ) : (
          <div className="mt-6 overflow-x-auto rounded-lg border border-slate-200">
            <table className="min-w-full divide-y divide-slate-100 text-left text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-xs font-medium uppercase tracking-wide text-slate-500">Nom</th>
                  <th className="px-4 py-3 text-xs font-medium uppercase tracking-wide text-slate-500">Email</th>
                  <th className="px-4 py-3 text-xs font-medium uppercase tracking-wide text-slate-500">Rôle</th>
                  <th className="px-4 py-3 text-xs font-medium uppercase tracking-wide text-slate-500">Créé le</th>
                  <th className="px-4 py-3 text-xs font-medium uppercase tracking-wide text-slate-500">État</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {displayMembers.map((m) => (
                  <tr key={m.id} className="transition-colors hover:bg-slate-50">
                    <td className="whitespace-nowrap px-4 py-3 font-medium text-slate-900">{m.name}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-slate-600">{m.email}</td>
                    <td className="whitespace-nowrap px-4 py-3">
                      <span className="inline-flex rounded-full bg-primary-light px-2.5 py-0.5 text-xs font-medium text-primary-hover">
                        {ROLE_LABELS[m.role]}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-slate-600 tabular-nums">
                      {m.createdAt ? formatDateDMY(m.createdAt) : '—'}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3">
                      {m.isActive ? (
                        <span className="text-success">Actif</span>
                      ) : (
                        <span className="font-medium text-error">Désactivé</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}
