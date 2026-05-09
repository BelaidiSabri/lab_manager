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
import {
  createSupervision,
  fetchMembersDirectory,
  fetchUserDetail,
  promoteUser,
  updateSupervision,
} from '../services/labApi';
import { formatDateDMY } from '../lib/formatDate';

type GradeHistoryRow = {
  _id: string;
  oldGrade: string;
  newGrade: string;
  reason: 'concours' | 'graduation' | 'thesis_defense';
  changedAt?: string;
  concoursId?: { title?: string } | null;
};
type SupervisionRow = {
  _id: string;
  status: 'active' | 'completed' | 'abandoned';
  type: 'thesis' | 'project';
  title?: string;
  startDate?: string;
  endDate?: string;
  supervised?: { _id?: string; name?: string; role?: string };
  supervisor?: { _id?: string; name?: string; role?: string };
};
type CandidatureRow = {
  _id: string;
  status: string;
  createdAt?: string;
  concoursId?: { title?: string; status?: string } | null;
};
type DirectoryUser = { id: string; name: string; role: string; isActive: boolean };

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
      team?: { id?: string; name?: string } | null;
    };
    profile: Record<string, unknown> | null;
    gradeHistory?: GradeHistoryRow[];
    candidatures?: CandidatureRow[];
    activeSupervisions?: { asSupervisor: SupervisionRow[]; asSupervised: SupervisionRow[] };
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
  const [showSupervisionModal, setShowSupervisionModal] = useState(false);
  const [supervisionLoading, setSupervisionLoading] = useState(false);
  const [supervisionError, setSupervisionError] = useState<string | null>(null);
  const [directory, setDirectory] = useState<DirectoryUser[]>([]);
  const [newSupervisorId, setNewSupervisorId] = useState('');
  const [newSupervisedId, setNewSupervisedId] = useState('');
  const [newTitle, setNewTitle] = useState('');
  const [newStartDate, setNewStartDate] = useState(() => new Date().toISOString().slice(0, 10));

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

  useEffect(() => {
    if (viewer?.role !== 'super_admin') return;
    void (async () => {
      try {
        const members = await fetchMembersDirectory({ isActive: true });
        setDirectory(members as DirectoryUser[]);
      } catch {
        setDirectory([]);
      }
    })();
  }, [viewer?.role]);

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
  const isAdmin = viewer?.role === 'super_admin';
  const isSelf = Boolean(viewer && viewer.id === user.id);
  const mySupervisions = data.activeSupervisions?.asSupervisor ?? [];
  const myAsSupervised = data.activeSupervisions?.asSupervised ?? [];
  const showMesEncadrements = isAdmin || isSelf;
  const showMonEncadrement = isAdmin || isSelf;
  const supervisorOptions = directory.filter(
    (m) =>
      m.isActive &&
      ['super_admin', 'professor_emeritus', 'maitre_conference', 'maitre_assistant'].includes(m.role)
  );
  const supervisedOptions = directory.filter(
    (m) => m.isActive && (m.role === 'master_student' || m.role === 'doctorant')
  );
  const selectedSupervisedRole = supervisedOptions.find((u) => u.id === newSupervisedId)?.role;
  const inferredType = selectedSupervisedRole === 'doctorant' ? 'thesis' : 'project';
  const grades = (data.gradeHistory ?? []).map((g) => ({
    key: `g-${g._id}`,
    date: g.changedAt ? new Date(g.changedAt).getTime() : 0,
    label: `Grade: ${g.oldGrade} -> ${g.newGrade} (${reasonLabels[g.reason] ?? g.reason})`,
  }));
  const supers = [...mySupervisions, ...myAsSupervised].map((s) => ({
    key: `s-${s._id}`,
    date: s.startDate ? new Date(s.startDate).getTime() : 0,
    label: `Encadrement ${s.type === 'thesis' ? 'thèse' : 'projet'} - ${s.title ?? 'Sans titre'} (${s.status})`,
  }));
  const cands = (data.candidatures ?? []).map((c) => ({
    key: `c-${c._id}`,
    date: c.createdAt ? new Date(c.createdAt).getTime() : 0,
    label: `Candidature concours - ${c.concoursId?.title ?? 'Concours'} (${c.status})`,
  }));
  const timeline = [...grades, ...supers, ...cands].sort((a, b) => b.date - a.date);

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
  const updateSupervisionStatus = async (sid: string, status: 'completed' | 'abandoned') => {
    try {
      await updateSupervision(sid, {
        status,
        endDate: new Date().toISOString(),
      });
      toast(status === 'completed' ? 'Encadrement marqué terminé.' : 'Encadrement marqué abandonné.', 'success');
      await load();
    } catch (error) {
      toast(isAxiosError(error) ? String(error.response?.data?.error ?? error) : 'Erreur', 'error');
    }
  };

  const submitSupervision = async () => {
    if (!newSupervisorId || !newSupervisedId || !newTitle.trim()) {
      setSupervisionError('Veuillez renseigner encadrant, encadré et titre.');
      return;
    }
    try {
      setSupervisionLoading(true);
      setSupervisionError(null);
      await createSupervision({
        supervisorId: newSupervisorId,
        supervisedId: newSupervisedId,
        type: inferredType,
        title: newTitle.trim(),
        startDate: new Date(newStartDate).toISOString(),
      });
      toast('Encadrement créé.', 'success');
      setShowSupervisionModal(false);
      setNewTitle('');
      setNewSupervisorId('');
      setNewSupervisedId('');
      await load();
    } catch (error) {
      setSupervisionError(isAxiosError(error) ? String(error.response?.data?.error ?? error) : 'Erreur');
    } finally {
      setSupervisionLoading(false);
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
        {user.team && (
          <p className="ds-body mt-3">
            Équipe:{' '}
            <Link to={`/equipes/${String((user.team as { id?: string }).id ?? '')}`} className="text-primary hover:underline">
              {String((user.team as { name?: string }).name ?? '—')}
            </Link>
          </p>
        )}
        {canPromote && (
          <div className="mt-6 flex flex-wrap gap-2">
            <button type="button" className="ds-btn-primary" onClick={() => setShowPromotionModal(true)}>
              Promouvoir
            </button>
            {isAdmin && (
              <button type="button" className="ds-btn-secondary" onClick={() => setShowSupervisionModal(true)}>
                Nouvel encadrement
              </button>
            )}
          </div>
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

      {showMesEncadrements && (
        <section className="ds-card mt-8">
          <h2 className="ds-card-title">Mes encadrements</h2>
          {mySupervisions.length === 0 ? (
            <p className="ds-body mt-3">Aucun encadrement actif.</p>
          ) : (
            <div className="mt-4 space-y-2">
              {mySupervisions.map((s) => (
                <div key={s._id} className="rounded-lg border border-slate-200 p-3">
                  <p className="font-medium text-slate-900">
                    {s.supervised?.name ?? '—'} — {s.title ?? 'Sans titre'}
                  </p>
                  <p className="text-sm text-slate-600">
                    {s.type === 'thesis' ? 'Thèse' : 'Projet'} · {s.status} · Début {formatDateDMY(s.startDate)}
                  </p>
                  {s.status === 'active' && (
                    <div className="mt-2 flex gap-2">
                      <button
                        type="button"
                        className="ds-btn-secondary text-xs py-1"
                        onClick={() => void updateSupervisionStatus(s._id, 'completed')}
                      >
                        Marquer terminé
                      </button>
                      <button
                        type="button"
                        className="ds-btn-secondary text-xs py-1"
                        onClick={() => void updateSupervisionStatus(s._id, 'abandoned')}
                      >
                        Marquer abandonné
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {showMonEncadrement && (
        <section className="ds-card mt-8">
          <h2 className="ds-card-title">Mon encadrement</h2>
          {myAsSupervised.length === 0 ? (
            <p className="ds-body mt-3">Aucun encadrement actif.</p>
          ) : (
            <div className="mt-4 space-y-2">
              {myAsSupervised.map((s) => (
                <div key={s._id} className="rounded-lg border border-slate-200 p-3">
                  <p className="font-medium text-slate-900">{s.supervisor?.name ?? '—'}</p>
                  <p className="text-sm text-slate-600">
                    {s.type === 'thesis' ? 'Thèse' : 'Projet'} · {s.title ?? 'Sans titre'} · {s.status} · Début{' '}
                    {formatDateDMY(s.startDate)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {isAdmin && (
        <section className="ds-card mt-8">
          <h2 className="ds-card-title">Parcours complet</h2>
          <div className="mt-4 grid gap-6 lg:grid-cols-3">
            <div>
              <h3 className="text-sm font-semibold text-slate-800">Changements de grade</h3>
              {(data.gradeHistory ?? []).length === 0 ? (
                <p className="mt-2 text-sm text-slate-600">Aucun changement de grade.</p>
              ) : (
                <ul className="mt-2 space-y-1 text-sm text-slate-700">
                  {(data.gradeHistory ?? []).map((g) => (
                    <li key={g._id}>
                      {formatDateDMY(g.changedAt)} - {g.oldGrade} {'->'} {g.newGrade}
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-800">Encadrements</h3>
              {mySupervisions.length + myAsSupervised.length === 0 ? (
                <p className="mt-2 text-sm text-slate-600">Aucun encadrement.</p>
              ) : (
                <ul className="mt-2 space-y-1 text-sm text-slate-700">
                  {[...mySupervisions, ...myAsSupervised].map((s) => (
                    <li key={s._id}>
                      {formatDateDMY(s.startDate)} - {s.type === 'thesis' ? 'Thèse' : 'Projet'} ({s.status})
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-800">Concours</h3>
              {(data.candidatures ?? []).length === 0 ? (
                <p className="mt-2 text-sm text-slate-600">Aucune participation.</p>
              ) : (
                <ul className="mt-2 space-y-1 text-sm text-slate-700">
                  {(data.candidatures ?? []).map((c) => (
                    <li key={c._id}>
                      {formatDateDMY(c.createdAt)} - {c.concoursId?.title ?? 'Concours'} ({c.status})
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
          <div className="mt-6 border-t border-slate-100 pt-4">
            <h3 className="text-sm font-semibold text-slate-800">Chronologie</h3>
            {timeline.length === 0 ? (
              <p className="mt-2 text-sm text-slate-600">Aucun événement de parcours.</p>
            ) : (
              <ul className="mt-2 space-y-1 text-sm text-slate-700">
                {timeline.map((t) => (
                  <li key={t.key}>
                    {formatDateDMY(t.date)} - {t.label}
                  </li>
                ))}
              </ul>
            )}
          </div>
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
      <Modal
        open={showSupervisionModal}
        title="Créer un encadrement"
        confirmLabel="Créer"
        cancelLabel="Annuler"
        loading={supervisionLoading}
        onCancel={() => {
          setShowSupervisionModal(false);
          setSupervisionError(null);
        }}
        onConfirm={() => void submitSupervision()}
      >
        <div className="space-y-3">
          <label className="block text-sm font-medium text-slate-800">
            Encadrant
            <select className={inputClass} value={newSupervisorId} onChange={(e) => setNewSupervisorId(e.target.value)}>
              <option value="">Choisir…</option>
              {supervisorOptions.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name} ({ROLE_LABELS[u.role as keyof typeof ROLE_LABELS] ?? u.role})
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm font-medium text-slate-800">
            Encadré
            <select className={inputClass} value={newSupervisedId} onChange={(e) => setNewSupervisedId(e.target.value)}>
              <option value="">Choisir…</option>
              {supervisedOptions.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name} ({ROLE_LABELS[u.role as keyof typeof ROLE_LABELS] ?? u.role})
                </option>
              ))}
            </select>
          </label>
          <p className="text-sm text-slate-700">
            Type: {inferredType === 'thesis' ? 'Thèse' : 'Projet'} (auto selon le rôle encadré)
          </p>
          <label className="block text-sm font-medium text-slate-800">
            Titre
            <input className={inputClass} value={newTitle} onChange={(e) => setNewTitle(e.target.value)} />
          </label>
          <label className="block text-sm font-medium text-slate-800">
            Date de début
            <input
              type="date"
              className={inputClass}
              value={newStartDate}
              onChange={(e) => setNewStartDate(e.target.value)}
            />
          </label>
          {supervisionError && <p className="text-sm text-error">{supervisionError}</p>}
        </div>
      </Modal>
    </main>
  );
}
