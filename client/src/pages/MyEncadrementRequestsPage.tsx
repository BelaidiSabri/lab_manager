import { useEffect, useState } from 'react';
import { isAxiosError } from 'axios';
import Breadcrumb from '../components/layout/Breadcrumb';
import Skeleton from '../components/ui/Skeleton';
import Modal from '../components/ui/Modal';
import { inputClass } from '../constants/formStyles';
import { canReviewEncadrementRequests, isStudentTrackRole, ROLE_LABELS } from '../constants/roles';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import {
  deleteEncadrementRequest,
  fetchEncadrementRequests,
  updateEncadrementRequest,
} from '../services/labApi';
import { formatDateDMY } from '../lib/formatDate';

type ReqRow = {
  _id: string;
  status: 'pending' | 'accepted' | 'refused';
  message: string;
  refusalReason?: string;
  createdAt?: string;
  student?: { _id?: string; name?: string; role?: string; department?: string };
  encadreur?: { _id?: string; name?: string; role?: string; department?: string };
  createdSupervisionId?: { _id?: string; status?: string } | null;
};

export default function MyEncadrementRequestsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [rows, setRows] = useState<ReqRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCount, setActiveCount] = useState(0);
  const [refusalById, setRefusalById] = useState<Record<string, string>>({});
  const [pendingAccept, setPendingAccept] = useState<ReqRow | null>(null);
  const canReview = canReviewEncadrementRequests(user?.role);

  const load = async () => {
    const data = await fetchEncadrementRequests();
    setRows(data.requests as ReqRow[]);
    setActiveCount(data.activeSupervisionCount ?? 0);
  };

  useEffect(() => {
    let c = false;
    void (async () => {
      try {
        await load();
      } catch {
        toast('Impossible de charger les demandes.', 'error');
      } finally {
        if (!c) setLoading(false);
      }
    })();
    return () => {
      c = true;
    };
  }, [toast]);

  const act = async (id: string, status: 'accepted' | 'refused') => {
    try {
      await updateEncadrementRequest(id, {
        status,
        refusalReason: status === 'refused' ? refusalById[id]?.trim() : undefined,
      });
      toast(status === 'accepted' ? 'Demande acceptée.' : 'Demande refusée.', 'success');
      setRows((prev) => prev.map((r) => (r._id === id ? { ...r, status, refusalReason: refusalById[id] } : r)));
      setPendingAccept(null);
      await load();
    } catch (e) {
      toast(isAxiosError(e) ? String(e.response?.data?.error ?? e) : 'Erreur', 'error');
    }
  };

  const withdraw = async (id: string) => {
    try {
      await deleteEncadrementRequest(id);
      toast('Demande retirée.', 'success');
      setRows((prev) => prev.filter((r) => r._id !== id));
    } catch (e) {
      toast(isAxiosError(e) ? String(e.response?.data?.error ?? e) : 'Erreur', 'error');
    }
  };

  return (
    <main className="text-left">
      <Breadcrumb items={[{ label: 'Accueil', to: '/' }, { label: 'Demandes encadrement' }]} />
      <h1 className="ds-title-page mt-2">Demandes d’encadrement</h1>
      {canReview && (
        <p className="ds-body mt-1">
          Encadrements actifs: <span className="font-semibold">{activeCount}/5</span>
        </p>
      )}
      {loading ? (
        <Skeleton className="mt-6 h-24 w-full" />
      ) : (
        <ul className="mt-6 space-y-3">
          {rows.map((r) => (
            <li key={r._id} className="ds-card space-y-2">
              <p className="text-sm text-slate-600">Envoyée le {formatDateDMY(r.createdAt)}</p>
              <p className="font-medium text-slate-900">
                Étudiant: {r.student?.name ?? '—'} {r.student?.role ? `(${ROLE_LABELS[r.student.role as keyof typeof ROLE_LABELS] ?? r.student.role})` : ''}
              </p>
              <p className="text-sm text-slate-700">
                Encadreur: {r.encadreur?.name ?? '—'} {r.encadreur?.department ? `· ${r.encadreur.department}` : ''}
              </p>
              <details className="rounded border border-slate-200 p-2 text-sm text-slate-700">
                <summary className="cursor-pointer font-medium">Message</summary>
                <p className="mt-2 whitespace-pre-wrap">{r.message}</p>
              </details>
              <p className="text-sm">
                Statut:{' '}
                <span className="font-semibold">
                  {r.status === 'pending' ? 'En attente' : r.status === 'accepted' ? 'Acceptée' : 'Refusée'}
                </span>
              </p>
              {r.status === 'refused' && r.refusalReason && (
                <p className="text-sm text-slate-700">Motif: {r.refusalReason}</p>
              )}
              {isStudentTrackRole(user?.role) && r.status === 'pending' && (
                <button type="button" className="ds-btn-secondary text-xs py-1" onClick={() => void withdraw(r._id)}>
                  Retirer la demande
                </button>
              )}
              {isStudentTrackRole(user?.role) && r.status === 'accepted' && r.createdSupervisionId?._id && (
                <p className="text-sm text-primary">Encadrement créé (ID: {r.createdSupervisionId._id})</p>
              )}
              {canReview && r.status === 'pending' && (
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-slate-800">
                    Motif de refus (optionnel)
                    <input
                      className={inputClass}
                      value={refusalById[r._id] ?? ''}
                      onChange={(e) => setRefusalById((prev) => ({ ...prev, [r._id]: e.target.value }))}
                    />
                  </label>
                  <div className="flex gap-2">
                    <button type="button" className="ds-btn-primary text-xs py-1" onClick={() => setPendingAccept(r)}>
                      Accepter
                    </button>
                    <button type="button" className="ds-btn-secondary text-xs py-1" onClick={() => void act(r._id, 'refused')}>
                      Refuser
                    </button>
                  </div>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
      <Modal
        open={Boolean(pendingAccept)}
        title="Confirmer l’acceptation"
        confirmLabel="Accepter"
        cancelLabel="Annuler"
        onCancel={() => setPendingAccept(null)}
        onConfirm={() => {
          if (pendingAccept) void act(pendingAccept._id, 'accepted');
        }}
      >
        Ceci créera automatiquement un encadrement actif.
      </Modal>
    </main>
  );
}
