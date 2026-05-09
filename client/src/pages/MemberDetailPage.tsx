import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { isAxiosError } from 'axios';
import Breadcrumb from '../components/layout/Breadcrumb';
import Skeleton from '../components/ui/Skeleton';
import Modal from '../components/ui/Modal';
import { inputClass } from '../constants/formStyles';
import { ROLE_LABELS } from '../constants/roles';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { fetchUserDetail, promoteUser } from '../services/labApi';
import { formatDateDMY } from '../lib/formatDate';

type GradeHistoryRow = {
  _id: string;
  oldGrade: string;
  newGrade: string;
  reason: 'concours' | 'graduation' | 'thesis_defense';
  changedAt?: string;
  concoursId?: { title?: string } | null;
};

export default function MemberDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user: viewer } = useAuth();
  const { toast } = useToast();
  const [data, setData] = useState<{
    user: {
      id: string;
      name: string;
      email?: string;
      role: string;
      currentGrade?: string;
      isActive?: boolean;
    };
    profile: Record<string, unknown> | null;
    gradeHistory?: GradeHistoryRow[];
    supervisions?: {
      asSupervisor: { _id: string; title?: string; type?: string; supervised?: { name?: string } }[];
      asSupervised: { _id: string; title?: string; type?: string; supervisor?: { name?: string } }[];
    };
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [showPromotionModal, setShowPromotionModal] = useState(false);
  const [promotionDate, setPromotionDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [promotionLoading, setPromotionLoading] = useState(false);
  const [promotionError, setPromotionError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!id) return;
    const d = await fetchUserDetail(id, true);
    setData(d as typeof data);
  }, [id]);

  useEffect(() => {
    if (!id) return;
    let c = false;
    void (async () => {
      try {
        const d = await fetchUserDetail(id, true);
        if (!c) {
          setData(d as typeof data);
          setErr(null);
        }
      } catch {
        if (!c) setErr('Membre introuvable.');
      } finally {
        if (!c) setLoading(false);
      }
    })();
    return () => {
      c = true;
    };
  }, [id]);

  if (loading || !id) {
    return (
      <main className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-24 w-full" />
      </main>
    );
  }

  if (err || !data) {
    return (
      <main>
        <p className="text-error">{err ?? 'Erreur'}</p>
        <Link to="/membres" className="mt-4 inline-block text-primary">
          Retour à la liste
        </Link>
      </main>
    );
  }

  const { user, profile, supervisions } = data;
  const bio = typeof profile?.bio === 'string' ? profile.bio : '';
  const institution = typeof profile?.institution === 'string' ? profile.institution : '';
  const researchAxe = typeof profile?.researchAxe === 'string' ? profile.researchAxe : '';
  const gradeHistory = data.gradeHistory ?? [];
  const canPromote =
    viewer?.role === 'super_admin' &&
    Boolean(user.isActive) &&
    (user.role === 'master_student' || user.role === 'doctorant');
  const promotionReason = user.role === 'master_student' ? 'graduation' : 'thesis_defense';
  const promotionLabel = user.role === 'master_student' ? 'Diplomation Master' : 'Soutenance de thèse';
  const promotionTarget = user.role === 'master_student' ? 'doctorant' : 'docteur';
  const promotionTargetLabel = ROLE_LABELS[promotionTarget];
  const maxDate = new Date().toISOString().slice(0, 10);
  const reasonLabels: Record<GradeHistoryRow['reason'], string> = {
    concours: 'Concours',
    graduation: 'Diplomation Master',
    thesis_defense: 'Soutenance de thèse',
  };

  const submitPromotion = async () => {
    if (!id) return;
    setPromotionLoading(true);
    setPromotionError(null);
    try {
      await promoteUser(id, { reason: promotionReason, date: new Date(promotionDate).toISOString() });
      toast('Promotion enregistrée avec succès.', 'success');
      setShowPromotionModal(false);
      await load();
    } catch (error) {
      setPromotionError(
        isAxiosError(error)
          ? String(error.response?.data?.error ?? 'Échec de la promotion.')
          : 'Échec de la promotion.'
      );
    } finally {
      setPromotionLoading(false);
    }
  };

  return (
    <main className="text-left">
      <Breadcrumb
        items={[{ label: 'Accueil', to: '/' }, { label: 'Membres', to: '/membres' }, { label: user.name }]}
      />
      <div className="ds-card mt-6">
        <h1 className="ds-title-page">{user.name}</h1>
        <p className="ds-body mt-2">
          {ROLE_LABELS[user.role as keyof typeof ROLE_LABELS] ?? user.role}
          {user.currentGrade ? ` · ${user.currentGrade}` : ''}
        </p>
        {user.email && (
          <p className="ds-body mt-2">
            <a href={`mailto:${user.email}`} className="text-primary hover:underline">
              {user.email}
            </a>
          </p>
        )}
        {institution && <p className="ds-body mt-4">{institution}</p>}
        {researchAxe && <p className="ds-body mt-2">{researchAxe}</p>}
        {bio && <p className="ds-body mt-4 whitespace-pre-wrap">{bio}</p>}
        {canPromote && (
          <button type="button" className="ds-btn-primary mt-6" onClick={() => setShowPromotionModal(true)}>
            Promouvoir
          </button>
        )}
      </div>

      {Array.isArray(data.gradeHistory) && (
        <section className="ds-card mt-8">
          <h2 className="ds-card-title">Historique des grades</h2>
          {gradeHistory.length === 0 ? (
            <p className="ds-body mt-3">Aucun changement de grade enregistré.</p>
          ) : (
            <div className="mt-4 overflow-x-auto rounded-lg border border-slate-200">
              <table className="min-w-full text-sm">
                <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                  <tr>
                    <th className="px-4 py-3 text-left">Date</th>
                    <th className="px-4 py-3 text-left">Ancien grade</th>
                    <th className="px-4 py-3 text-left">Nouveau grade</th>
                    <th className="px-4 py-3 text-left">Motif</th>
                    <th className="px-4 py-3 text-left">Concours</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {gradeHistory.map((row) => (
                    <tr key={row._id}>
                      <td className="px-4 py-3">{formatDateDMY(row.changedAt)}</td>
                      <td className="px-4 py-3">{ROLE_LABELS[row.oldGrade as keyof typeof ROLE_LABELS] ?? row.oldGrade}</td>
                      <td className="px-4 py-3">{ROLE_LABELS[row.newGrade as keyof typeof ROLE_LABELS] ?? row.newGrade}</td>
                      <td className="px-4 py-3">{reasonLabels[row.reason] ?? row.reason}</td>
                      <td className="px-4 py-3">{row.concoursId?.title ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      {supervisions && (
        <div className="mt-8 grid gap-6 lg:grid-cols-2">
          <section className="ds-card">
            <h2 className="ds-card-title">Encadrements (directeur)</h2>
            <ul className="ds-body mt-3 list-inside list-disc space-y-2">
              {supervisions.asSupervisor?.length ? (
                supervisions.asSupervisor.map((s) => (
                  <li key={s._id}>
                    {(s.supervised as { name?: string } | undefined)?.name ?? '—'} — {s.title ?? s.type}
                  </li>
                ))
              ) : (
                <li>Aucune entrée</li>
              )}
            </ul>
          </section>
          <section className="ds-card">
            <h2 className="ds-card-title">Encadrements (doctorant / stagiaire)</h2>
            <ul className="ds-body mt-3 list-inside list-disc space-y-2">
              {supervisions.asSupervised?.length ? (
                supervisions.asSupervised.map((s) => (
                  <li key={s._id}>
                    {(s.supervisor as { name?: string } | undefined)?.name ?? '—'} — {s.title ?? s.type}
                  </li>
                ))
              ) : (
                <li>Aucune entrée</li>
              )}
            </ul>
          </section>
        </div>
      )}
      <Modal
        open={showPromotionModal}
        title="Confirmer la promotion"
        confirmLabel="Confirmer"
        cancelLabel="Annuler"
        loading={promotionLoading}
        onCancel={() => {
          setShowPromotionModal(false);
          setPromotionError(null);
        }}
        onConfirm={() => void submitPromotion()}
      >
        <div className="space-y-3">
          <div>
            <p className="text-xs uppercase tracking-wide text-slate-500">Événement</p>
            <p className="font-medium text-slate-900">{promotionLabel}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-slate-500">Nouveau grade</p>
            <p className="font-medium text-slate-900">{promotionTargetLabel}</p>
          </div>
          <label className="block text-sm font-medium text-slate-800">
            Date
            <input
              type="date"
              className={inputClass}
              value={promotionDate}
              max={maxDate}
              onChange={(e) => setPromotionDate(e.target.value)}
            />
          </label>
          {promotionError && <p className="text-sm text-error">{promotionError}</p>}
        </div>
      </Modal>
    </main>
  );
}
