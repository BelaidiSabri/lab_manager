import { useEffect, useState, type FormEvent } from 'react';
import { Link, useParams } from 'react-router-dom';
import { isAxiosError } from 'axios';
import Breadcrumb from '../components/layout/Breadcrumb';
import Skeleton from '../components/ui/Skeleton';
import Badge from '../components/ui/Badge';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { fetchConcoursById, applyConcours, fetchMyConcoursCandidatures, type UserEligibility } from '../services/labApi';
import { formatDateDMY } from '../lib/formatDate';
import { ROLE_LABELS } from '../constants/roles';
import type { UserRole } from '../types/user';

type CandRow = {
  _id: string;
  status: string;
  concoursId?: { _id?: string; title?: string } | string;
};
const STATUS_LABELS: Record<'open' | 'closed' | 'finished', string> = {
  open: 'Ouvert',
  closed: 'Fermé',
  finished: 'Terminé',
};

function concoursIdString(ref: CandRow['concoursId']): string {
  if (ref && typeof ref === 'object' && '_id' in ref && ref._id != null) return String(ref._id);
  return String(ref ?? '');
}

export default function ConcoursDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { toast } = useToast();
  const [c, setC] = useState<Record<string, unknown> | null>(null);
  const [eligibility, setEligibility] = useState<UserEligibility | null>(null);
  const [mine, setMine] = useState<CandRow | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    void (async () => {
      try {
        const [detail, allMine] = await Promise.all([fetchConcoursById(id), fetchMyConcoursCandidatures()]);
        if (!cancelled) {
          setC(detail.concours);
          setEligibility(detail.userEligibility);
          const list = allMine as CandRow[];
          const row = detail.concours;
          const cid =
            typeof row === 'object' && row && '_id' in row ? String((row as { _id?: unknown })._id) : id;
          const match = list.find((x) => concoursIdString(x.concoursId) === cid);
          setMine(match ?? null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  const onApply = async (e: FormEvent) => {
    e.preventDefault();
    if (!id) return;
    try {
      await applyConcours(id, {});
      toast('Candidature envoyée.', 'success');
      const allMine = await fetchMyConcoursCandidatures();
      const list = allMine as CandRow[];
      const match = list.find((x) => concoursIdString(x.concoursId) === id);
      setMine(match ?? null);
    } catch (err) {
      toast(isAxiosError(err) ? String(err.response?.data?.error ?? err) : 'Erreur', 'error');
    }
  };

  if (loading || !id) return <Skeleton className="h-40 w-full" />;
  if (!c) return <p>Introuvable.</p>;

  const open =
    c.status === 'open' &&
    new Date() >= new Date(String(c.startDate)) &&
    new Date() <= new Date(String(c.endDate));

  const tg = String(c.targetGrade ?? '');
  const gradeLabel = ROLE_LABELS[tg as UserRole] ?? tg;
  const maxJ = c.maxJuniorEligibleGrade ? String(c.maxJuniorEligibleGrade) : '';
  const maxJLabel = maxJ ? ROLE_LABELS[maxJ as UserRole] ?? maxJ : '';
  const canApplyGrade = eligibility !== null ? eligibility.canApply : true;
  const applyDisabled = Boolean(mine) || !open || !canApplyGrade;
  const canShowApplyForm = user?.role !== 'super_admin';

  return (
    <main className="text-left">
      <Breadcrumb
        items={[{ label: 'Accueil', to: '/' }, { label: 'Concours', to: '/concours' }, { label: String(c.title) }]}
      />
      <div className="ds-card mt-6">
        <h1 className="ds-title-page">{String(c.title)}</h1>
        <p className="ds-body mt-2 whitespace-pre-wrap">{String(c.description ?? '')}</p>
        <dl className="ds-body mt-4 grid gap-2 sm:grid-cols-2">
          <div>
            <dt className="ds-muted">Grade de carrière visé</dt>
            <dd className="font-medium">{gradeLabel}</dd>
          </div>
          <div>
            <dt className="ds-muted">Département</dt>
            <dd className="font-medium">{String(c.department ?? '—')}</dd>
          </div>
          <div>
            <dt className="ds-muted">Statut</dt>
            <dd className="font-medium">
              {STATUS_LABELS[String(c.status) as keyof typeof STATUS_LABELS] ?? String(c.status)}
            </dd>
          </div>
          <div>
            <dt className="ds-muted">Ouverture</dt>
            <dd>{formatDateDMY(String(c.startDate))}</dd>
          </div>
          <div>
            <dt className="ds-muted">Clôture</dt>
            <dd>{formatDateDMY(String(c.endDate))}</dd>
          </div>
          {maxJ && (
            <div className="sm:col-span-2">
              <dt className="ds-muted">Plafond (grade le plus junior autorisé)</dt>
              <dd className="font-medium">{maxJLabel}</dd>
            </div>
          )}
        </dl>

        {eligibility && !eligibility.canApply && (
          <div className="mt-6 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
            {eligibility.message}
          </div>
        )}
        {eligibility?.canApply && open && !mine && (
          <p className="mt-4 text-sm font-medium text-green-800">Vous remplissez les critères pour postuler.</p>
        )}

        {mine && (
          <div className="mt-6 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
            <p className="text-sm font-medium text-slate-800">Votre candidature</p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              {mine.status === 'pending' && <Badge variant="pending">En attente de décision</Badge>}
              {mine.status === 'admitted' && <Badge variant="admitted">Acceptée</Badge>}
              {mine.status === 'rejected' && <Badge variant="rejected">Non retenue</Badge>}
            </div>
            <p className="ds-muted mt-2 text-sm">
              Une notification détaillée est aussi envoyée dans la cloche (en haut à droite).
            </p>
          </div>
        )}

        {open && canShowApplyForm && (
          <form className="mt-6 border-t border-slate-100 pt-6" onSubmit={(ev) => void onApply(ev)}>
            <p className="ds-body mb-3">Envoyer une candidature (pièces jointes : évolution ultérieure).</p>
            <button type="submit" className="ds-btn-primary" disabled={applyDisabled}>
              {mine
                ? 'Vous avez déjà postulé'
                : !canApplyGrade
                  ? 'Postuler (non éligible)'
                  : 'Postuler'}
            </button>
          </form>
        )}
      </div>
      <Link to="/concours" className="mt-6 inline-block text-primary hover:underline">
        ← Liste des concours
      </Link>
    </main>
  );
}
