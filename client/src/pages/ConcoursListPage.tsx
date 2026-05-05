import { useEffect, useState, type FormEvent } from 'react';
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
  const [newMaxJunior, setNewMaxJunior] = useState<string>('');
  const [editTarget, setEditTarget] = useState<string>('');
  const [editMaxJunior, setEditMaxJunior] = useState<string>('');

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
    const fd = new FormData(e.currentTarget);
    const title = String(fd.get('title') ?? '').trim();
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
    setSubmitting(true);
    try {
      const body: Record<string, unknown> = {
        title,
        description: fd.get('description'),
        targetGrade,
        startDate: start.toISOString(),
        endDate: end.toISOString(),
      };
      if (newMaxJunior) body.maxJuniorEligibleGrade = newMaxJunior;
      await api.post('/concours', body);
      toast('Concours créé.', 'success');
      e.currentTarget.reset();
      setNewTarget(firstTarget);
      setNewMaxJunior('');
      setShowCreate(false);
      await load();
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
    setEditSubmitting(true);
    try {
      await updateConcours(concours._id, {
        title: String(fd.get('title') ?? '').trim(),
        description: fd.get('description'),
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
              Les candidats plus juniors que ce plafond ne peuvent pas postuler (ex. doctorants exclus si vous fixez
              « jusqu&apos;à Assistant »).
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
          {rows.map((c) => (
            <li key={c._id} className="ds-card flex flex-col gap-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-semibold text-slate-900">{c.title}</p>
                  <p className="ds-muted mt-1">
                    {c.status} · {gradeLabel(c.targetGrade)}
                    {c.maxJuniorEligibleGrade && (
                      <>
                        {' '}
                        · plafond junior : {gradeLabel(c.maxJuniorEligibleGrade)}
                      </>
                    )}{' '}
                    · {formatDateDMY(c.startDate)} → {formatDateDMY(c.endDate)}
                  </p>
                  {c.userEligibility && (
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
