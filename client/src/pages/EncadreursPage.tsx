import { useCallback, useEffect, useMemo, useState } from 'react';
import { isAxiosError } from 'axios';
import Breadcrumb from '../components/layout/Breadcrumb';
import Skeleton from '../components/ui/Skeleton';
import Modal from '../components/ui/Modal';
import { inputClass } from '../constants/formStyles';
import { isStudentTrackRole, ROLE_LABELS } from '../constants/roles';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { createEncadrementRequest, fetchEncadreurs } from '../services/labApi';

type EncadreurRow = {
  id: string;
  name: string;
  role: string;
  department?: string;
  speciality?: string;
  activeSupervisionCount: number;
  hasPendingRequestFromMe: boolean;
};

export default function EncadreursPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [rows, setRows] = useState<EncadreurRow[]>([]);
  const [departments, setDepartments] = useState<string[]>([]);
  const [loading, setLoading] = useState(isStudentTrackRole(user?.role));
  const [q, setQ] = useState('');
  const [department, setDepartment] = useState('all');
  const [studentHasActiveSupervision, setStudentHasActiveSupervision] = useState(false);
  const [selected, setSelected] = useState<EncadreurRow | null>(null);
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    const data = await fetchEncadreurs({
      q: q.trim() || undefined,
      department: department === 'all' ? undefined : department,
    });
    setRows(data.encadreurs as EncadreurRow[]);
    setDepartments(data.departments);
    setStudentHasActiveSupervision(data.studentHasActiveSupervision);
  }, [department, q]);

  useEffect(() => {
    if (!isStudentTrackRole(user?.role)) return;
    let c = false;
    void (async () => {
      try {
        await load();
      } catch {
        toast('Impossible de charger les encadreurs.', 'error');
      } finally {
        if (!c) setLoading(false);
      }
    })();
    return () => {
      c = true;
    };
  }, [load, toast, user?.role]);

  const remainingChars = useMemo(() => 1000 - message.length, [message.length]);
  if (!isStudentTrackRole(user?.role)) {
    return (
      <main>
        <p className="text-sm text-slate-700">Cette page est réservée aux étudiants Master et Doctorants.</p>
      </main>
    );
  }

  const sendRequest = async () => {
    if (!selected) return;
    if (!message.trim()) {
      toast('Le message est obligatoire.', 'warning');
      return;
    }
    try {
      setSubmitting(true);
      await createEncadrementRequest({ encadreurId: selected.id, message: message.trim() });
      toast('Demande envoyée.', 'success');
      setRows((prev) =>
        prev.map((r) => (r.id === selected.id ? { ...r, hasPendingRequestFromMe: true } : r))
      );
      setSelected(null);
      setMessage('');
    } catch (e) {
      toast(isAxiosError(e) ? String(e.response?.data?.error ?? e) : 'Erreur', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="text-left">
      <Breadcrumb items={[{ label: 'Accueil', to: '/' }, { label: 'Encadreurs' }]} />
      <h1 className="ds-title-page mt-2">Recherche d’encadreur</h1>
      {studentHasActiveSupervision && (
        <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Vous avez déjà un encadreur actif.
        </div>
      )}
      <div className="ds-card mt-6 grid gap-3 md:grid-cols-2">
        <label className="text-sm font-medium text-slate-800">
          Département
          <select className={inputClass} value={department} onChange={(e) => setDepartment(e.target.value)}>
            <option value="all">Tous</option>
            {departments.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm font-medium text-slate-800">
          Nom
          <input className={inputClass} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Rechercher..." />
        </label>
      </div>

      {loading ? (
        <Skeleton className="mt-6 h-24 w-full" />
      ) : (
        <ul className="mt-6 space-y-3">
          {rows.map((r) => {
            const full = r.activeSupervisionCount >= 5;
            const disabled = full || r.hasPendingRequestFromMe || studentHasActiveSupervision;
            return (
              <li key={r.id} className="ds-card">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="font-semibold text-slate-900">{r.name}</p>
                    <p className="text-sm text-slate-600">
                      {ROLE_LABELS[r.role as keyof typeof ROLE_LABELS] ?? r.role}
                      {r.department ? ` · ${r.department}` : ''}
                      {r.speciality ? ` · ${r.speciality}` : ''}
                    </p>
                    <p className="mt-1 text-sm text-slate-700">{r.activeSupervisionCount}/5 encadrements actifs</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {full && <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-medium">Complet</span>}
                    <button
                      type="button"
                      className="ds-btn-primary"
                      disabled={disabled}
                      onClick={() => setSelected(r)}
                    >
                      {r.hasPendingRequestFromMe ? 'Demande envoyée ⏳' : 'Demander encadrement'}
                    </button>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
      <Modal
        open={Boolean(selected)}
        title="Demander un encadrement"
        confirmLabel="Envoyer"
        cancelLabel="Annuler"
        loading={submitting}
        onCancel={() => {
          setSelected(null);
          setMessage('');
        }}
        onConfirm={() => void sendRequest()}
      >
        <div className="space-y-3">
          <p className="text-sm text-slate-700">
            Encadreur: <span className="font-medium text-slate-900">{selected?.name ?? '—'}</span>
          </p>
          <label className="block text-sm font-medium text-slate-800">
            Message
            <textarea
              className={`${inputClass} min-h-[120px]`}
              value={message}
              onChange={(e) => setMessage(e.target.value.slice(0, 1000))}
              maxLength={1000}
              placeholder="Expliquez brièvement votre demande..."
            />
          </label>
          <p className="text-xs text-slate-500">{remainingChars} caractères restants</p>
        </div>
      </Modal>
    </main>
  );
}
