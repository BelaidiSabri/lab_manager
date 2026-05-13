import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { isAxiosError } from 'axios';
import Breadcrumb from '../components/layout/Breadcrumb';
import Skeleton from '../components/ui/Skeleton';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { api } from '../api/client';
import { fetchConcoursList, updateConcours } from '../services/labApi';
import type { UserEligibility } from '../services/labApi';
import { formatDateDMY } from '../lib/formatDate';
import { toDatetimeLocalValue } from '../lib/datetimeLocal';
import { inputClass } from '../constants/formStyles';
import { maxJuniorGradeOptionsForTarget, ROLE_LABELS } from '../constants/roles';
import { CONCOURS_TARGET_OPTIONS } from '../constants/concours';
import type { UserRole } from '../types/user';

type ConcoursRow = {
  _id: string;
  title: string;
  description?: string;
  department?: string;
  targetGrade: string;
  maxJuniorEligibleGrade?: string;
  status: string;
  startDate: string;
  endDate: string;
  userEligibility?: UserEligibility | null;
};

const STATUS_OPTIONS = [
  { value: 'open', label: 'Ouvert' },
  { value: 'closed', label: 'Fermé' },
  { value: 'finished', label: 'Terminé' },
];
const STATUS_LABELS: Record<'open' | 'closed' | 'finished', string> = {
  open: 'Ouvert',
  closed: 'Fermé',
  finished: 'Terminé',
};

const firstTarget = CONCOURS_TARGET_OPTIONS[0]?.value ?? '';

export default function ConcoursListPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [rows, setRows] = useState<ConcoursRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editSubmitting, setEditSubmitting] = useState(false);

  const [newTarget, setNewTarget] = useState<string>(firstTarget);
  const [newDepartment, setNewDepartment] = useState<string>('');
  const [newMaxJunior, setNewMaxJunior] = useState<string>('');
  const [editTarget, setEditTarget] = useState<string>('');
  const [editDepartment, setEditDepartment] = useState<string>('');
  const [editMaxJunior, setEditMaxJunior] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'open' | 'closed' | 'finished'>('all');
  const [gradeFilter, setGradeFilter] = useState<'all' | UserRole>('all');
  const [departmentFilter, setDepartmentFilter] = useState('all');

  const load = async () => {
    const list = await fetchConcoursList();
    setRows(list as ConcoursRow[]);
  };

  useEffect(() => {
    let c = false;
    void (async () => {
      try {
        await load();
        if (!c) setLoading(false);
      } catch {
        if (!c) setLoading(false);
      }
    })();
    return () => {
      c = true;
    };
  }, []);

  const onCreate = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formEl = e.currentTarget;
    const fd = new FormData(formEl);
    const title = String(fd.get('title') ?? '').trim();
    const department = newDepartment.trim();
    const targetGrade = newTarget;
    const startRaw = String(fd.get('startDate') ?? '');
    const endRaw = String(fd.get('endDate') ?? '');
    const start = new Date(startRaw);
    const end = new Date(endRaw);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      toast('Dates invalides.', 'error');
      setSubmitting(false);
      return;
    }
    if (!department) {
      toast('Le département est obligatoire.', 'error');
      setSubmitting(false);
      return;
    }
    setSubmitting(true);
    try {
      const body: Record<string, unknown> = {
        title,
        description: fd.get('description'),
        department,
        targetGrade,
        startDate: start.toISOString(),
        endDate: end.toISOString(),
      };
      if (newMaxJunior) body.maxJuniorEligibleGrade = newMaxJunior;
      const { data } = await api.post<{ concours: ConcoursRow }>('/concours', body);
      const created = data.concours;
      if (created) {
        setRows((prev) => [created, ...prev]);
      }
      toast('Concours créé.', 'success');
      formEl.reset();
      setNewDepartment('');
      setNewTarget(firstTarget);
      setNewMaxJunior('');
      setShowCreate(false);
    } catch (err) {
      toast(isAxiosError(err) ? String(err.response?.data?.error ?? err) : 'Erreur', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const onEdit = async (e: FormEvent<HTMLFormElement>, concours: ConcoursRow) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const startRaw = String(fd.get('startDate') ?? '');
    const endRaw = String(fd.get('endDate') ?? '');
    const start = new Date(startRaw);
    const end = new Date(endRaw);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      toast('Dates invalides.', 'error');
      return;
    }
    if (!editDepartment.trim()) {
      toast('Le département est obligatoire.', 'error');
      return;
    }
    setEditSubmitting(true);
    try {
      await updateConcours(concours._id, {
        title: String(fd.get('title') ?? '').trim(),
        description: fd.get('description'),
        department: editDepartment.trim(),
        targetGrade: editTarget,
        maxJuniorEligibleGrade: editMaxJunior === '' ? null : editMaxJunior,
        startDate: start.toISOString(),
        endDate: end.toISOString(),
        status: String(fd.get('status') ?? concours.status),
      });
      toast('Concours mis à jour.', 'success');
      setEditingId(null);
      await load();
    } catch (err) {
      toast(isAxiosError(err) ? String(err.response?.data?.error ?? err) : 'Erreur', 'error');
    } finally {
      setEditSubmitting(false);
    }
  };

  const gradeLabel = (g: string) => ROLE_LABELS[g as UserRole] ?? g;

  const newMaxJuniorOpts = maxJuniorGradeOptionsForTarget(newTarget);
  const editMaxJuniorOpts = maxJuniorGradeOptionsForTarget(editTarget);
  const departmentOptions = useMemo(() => {
    const vals = Array.from(
      new Set(
        rows
          .map((r) => (r.department ?? '').trim())
          .filter((d) => d.length > 0)
      )
    );
    vals.sort((a, b) => a.localeCompare(b, 'fr', { sensitivity: 'base' }));
    return vals;
  }, [rows]);
  const filteredRows = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return rows.filter((r) => {
      if (statusFilter !== 'all' && r.status !== statusFilter) return false;
      if (gradeFilter !== 'all' && r.targetGrade !== gradeFilter) return false;
      if (departmentFilter !== 'all' && (r.department ?? '') !== departmentFilter) return false;
      if (!q) return true;
      const haystack = [r.title, r.description ?? '', r.department ?? '', gradeLabel(r.targetGrade), r.status]
        .join(' ')
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [rows, searchTerm, statusFilter, gradeFilter, departmentFilter]);

  return (
    <main className="text-left">
      <Breadcrumb items={[{ label: 'Accueil', to: '/' }, { label: 'Concours' }]} />
      <div className="mt-2 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="ds-title-page">Concours</h1>
          <p className="ds-body mt-1">
            Seuls les grades de carrière strictement plus juniors que le grade visé peuvent postuler. Optionnellement,
            un plafond exclut les profils trop juniors.
          </p>
        </div>
        {user?.role === 'super_admin' && (
          <button type="button" className="ds-btn-secondary" onClick={() => setShowCreate((s) => !s)}>
            {showCreate ? 'Fermer' : 'Nouveau concours'}
          </button>
        )}
      </div>
      <div className="ds-card mt-6 grid gap-3 md:grid-cols-2 lg:grid-cols-4">
        <label className="block text-sm font-medium text-slate-800">
          Recherche
          <input
            className={inputClass}
            placeholder="Titre, grade, département…"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </label>
        <label className="block text-sm font-medium text-slate-800">
          Statut
          <select
            className={inputClass}
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
          >
            <option value="all">Tous</option>
            {STATUS_OPTIONS.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm font-medium text-slate-800">
          Grade cible
          <select
            className={inputClass}
            value={gradeFilter}
            onChange={(e) => setGradeFilter(e.target.value as typeof gradeFilter)}
          >
            <option value="all">Tous</option>
            {CONCOURS_TARGET_OPTIONS.map((g) => (
              <option key={g.value} value={g.value}>
                {g.label}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm font-medium text-slate-800">
          Département
          <select
            className={inputClass}
            value={departmentFilter}
            onChange={(e) => setDepartmentFilter(e.target.value)}
          >
            <option value="all">Tous</option>
            {departmentOptions.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </label>
      </div>

      {showCreate && user?.role === 'super_admin' && (
        <form className="ds-card mt-6 grid max-w-xl gap-3" onSubmit={(ev) => void onCreate(ev)}>
          <label className="block text-sm font-medium text-slate-800">
            Titre
            <input name="title" className={inputClass} required />
          </label>
          <label className="block text-sm font-medium text-slate-800">
            Description
            <textarea name="description" className={inputClass} rows={2} />
          </label>
          <label className="block text-sm font-medium text-slate-800">
            Département
            <input
              name="department"
              className={inputClass}
              required
              value={newDepartment}
              onChange={(e) => setNewDepartment(e.target.value)}
              placeholder="Ex: Informatique"
            />
          </label>
          <label className="block text-sm font-medium text-slate-800">
            Grade cible (carrière)
            <select
              name="targetGrade"
              className={inputClass}
              required
              value={newTarget}
              onChange={(e) => {
                const v = e.target.value;
                setNewTarget(v);
                const allowed = maxJuniorGradeOptionsForTarget(v);
                setNewMaxJunior((prev) =>
                  prev && !(allowed as readonly string[]).includes(prev) ? '' : prev
                );
              }}
            >
              {CONCOURS_TARGET_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm font-medium text-slate-800">
            Grade le plus junior autorisé (optionnel)
            <select
              className={inputClass}
              value={newMaxJunior}
              onChange={(e) => setNewMaxJunior(e.target.value)}
            >
              <option value="">Aucun plafond — tout grade plus junior que le grade visé</option>
              {newMaxJuniorOpts.map((g) => (
                <option key={g} value={g}>
                  Jusqu&apos;à {ROLE_LABELS[g]} inclus (plus juniors exclus)
                </option>
              ))}
            </select>
            <span className="text-xs font-normal text-slate-500">
              Les candidats plus juniors que ce plafond ne peuvent pas postuler. Les profils Doctorant et Étudiant
              master sont exclus du parcours concours.
            </span>
          </label>
          <label className="block text-sm font-medium text-slate-800">
            Début
            <input name="startDate" type="datetime-local" className={inputClass} required />
          </label>
          <label className="block text-sm font-medium text-slate-800">
            Fin
            <input name="endDate" type="datetime-local" className={inputClass} required />
          </label>
          <button type="submit" disabled={submitting} className="ds-btn-primary w-fit">
            {submitting ? '…' : 'Créer'}
          </button>
        </form>
      )}

      {loading ? (
        <Skeleton className="mt-8 h-40 w-full" />
      ) : (
        <ul className="mt-8 flex flex-col gap-3">
          {filteredRows.length === 0 && (
            <li className="ds-card text-sm text-slate-600">
              Aucun concours ne correspond aux filtres actuels.
            </li>
          )}
          {filteredRows.map((c) => (
            <li key={c._id} className="ds-card flex flex-col gap-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-semibold text-slate-900">{c.title}</p>
                  <p className="ds-muted mt-1">
                    {STATUS_LABELS[c.status as keyof typeof STATUS_LABELS] ?? c.status} · {gradeLabel(c.targetGrade)}
                    {c.department ? <> · {c.department}</> : null}
                    {c.maxJuniorEligibleGrade && (
                      <>
                        {' '}
                        · plafond junior : {gradeLabel(c.maxJuniorEligibleGrade)}
                      </>
                    )}{' '}
                    · {formatDateDMY(c.startDate)} → {formatDateDMY(c.endDate)}
                  </p>
                  {c.userEligibility && user?.role !== 'super_admin' && (
                    <p
                      className={`mt-2 text-xs font-medium ${
                        c.userEligibility.canApply ? 'text-green-700' : 'text-amber-800'
                      }`}
                    >
                      {c.userEligibility.canApply ? 'Vous êtes éligible pour ce concours.' : c.userEligibility.message}
                    </p>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  <Link to={`/concours/${c._id}`} className="ds-btn-secondary">
                    Détail
                  </Link>
                  {user?.role === 'super_admin' && (
                    <>
                      <Link to={`/concours/${c._id}/manage`} className="ds-btn-primary">
                        Gérer
                      </Link>
                      <button
                        type="button"
                        className="ds-btn-secondary"
                        onClick={() => {
                          if (editingId === c._id) {
                            setEditingId(null);
                          } else {
                            setEditingId(c._id);
                            setEditTarget(c.targetGrade);
                            setEditDepartment(c.department ?? '');
                            setEditMaxJunior(c.maxJuniorEligibleGrade ?? '');
                          }
                        }}
                      >
                        {editingId === c._id ? 'Fermer' : 'Modifier'}
                      </button>
                    </>
                  )}
                </div>
              </div>

              {editingId === c._id && user?.role === 'super_admin' && (
                <form
                  className="grid gap-3 border-t border-slate-100 pt-4 md:max-w-xl"
                  onSubmit={(ev) => void onEdit(ev, c)}
                >
                  <label className="block text-sm font-medium text-slate-800">
                    Titre
                    <input name="title" className={inputClass} required defaultValue={c.title} />
                  </label>
                  <label className="block text-sm font-medium text-slate-800">
                    Description
                    <textarea
                      name="description"
                      className={inputClass}
                      rows={2}
                      defaultValue={c.description ?? ''}
                    />
                  </label>
                  <label className="block text-sm font-medium text-slate-800">
                    Département
                    <input
                      name="department"
                      className={inputClass}
                      required
                      value={editDepartment}
                      onChange={(e) => setEditDepartment(e.target.value)}
                    />
                  </label>
                  <label className="block text-sm font-medium text-slate-800">
                    Grade cible
                    <select
                      className={inputClass}
                      required
                      value={editTarget}
                      onChange={(e) => {
                        const v = e.target.value;
                        setEditTarget(v);
                        const allowed = maxJuniorGradeOptionsForTarget(v);
                        setEditMaxJunior((prev) =>
                          prev && !(allowed as readonly string[]).includes(prev) ? '' : prev
                        );
                      }}
                    >
                      {CONCOURS_TARGET_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="block text-sm font-medium text-slate-800">
                    Grade le plus junior autorisé
                    <select
                      className={inputClass}
                      value={editMaxJunior}
                      onChange={(e) => setEditMaxJunior(e.target.value)}
                    >
                      <option value="">Aucun plafond</option>
                      {editMaxJuniorOpts.map((g) => (
                        <option key={g} value={g}>
                          Jusqu&apos;à {ROLE_LABELS[g]} inclus
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="block text-sm font-medium text-slate-800">
                    Début
                    <input
                      name="startDate"
                      type="datetime-local"
                      className={inputClass}
                      required
                      defaultValue={toDatetimeLocalValue(c.startDate)}
                    />
                  </label>
                  <label className="block text-sm font-medium text-slate-800">
                    Fin
                    <input
                      name="endDate"
                      type="datetime-local"
                      className={inputClass}
                      required
                      defaultValue={toDatetimeLocalValue(c.endDate)}
                    />
                  </label>
                  <label className="block text-sm font-medium text-slate-800">
                    Statut
                    <select name="status" className={inputClass} defaultValue={c.status}>
                      {STATUS_OPTIONS.map((s) => (
                        <option key={s.value} value={s.value}>
                          {s.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <button type="submit" disabled={editSubmitting} className="ds-btn-primary w-fit">
                    {editSubmitting ? '…' : 'Enregistrer'}
                  </button>
                </form>
              )}
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
