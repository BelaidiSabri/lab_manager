import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { isAxiosError } from 'axios';
import Breadcrumb from '../components/layout/Breadcrumb';
import Skeleton from '../components/ui/Skeleton';
import { inputClass } from '../constants/formStyles';
import {
  ACADEMIC_GRADE_OPTIONS,
  canManageCollaboration,
  canManageThisTeam,
  ROLE_LABELS,
} from '../constants/roles';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import {
  addTeamCollaboration,
  addTeamMember,
  fetchMembersDirectory,
  fetchTeamById,
  fetchTeamCollaborations,
  fetchTeams,
  removeTeamCollaboration,
  removeTeamMember,
  updateTeamCollaboration,
  type TeamCollaborationRow,
} from '../services/labApi';

type TeamLeader = { _id?: string; name?: string };
type TeamDetail = {
  team: {
    _id: string;
    name: string;
    axis: string;
    description?: string;
    leader?: TeamLeader;
  };
  members: { _id: string; name: string; email: string; role: string; currentGrade?: string }[];
};

function formatDate(value?: string | null): string {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
}

function toInputDate(value?: string | null): string {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  return d.toISOString().slice(0, 10);
}

export default function TeamDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { toast } = useToast();
  const [data, setData] = useState<TeamDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [candidate, setCandidate] = useState('');
  const [options, setOptions] = useState<{ id: string; name: string; role: string }[]>([]);
  const [candidateSearch, setCandidateSearch] = useState('');
  const [memberSearch, setMemberSearch] = useState('');
  const [memberRoleFilter, setMemberRoleFilter] = useState('all');
  const [memberGradeFilter, setMemberGradeFilter] = useState('all');
  const [collaborations, setCollaborations] = useState<TeamCollaborationRow[]>([]);
  const [allTeams, setAllTeams] = useState<{ _id: string; name: string; axis: string }[]>([]);
  const [partnerTeamId, setPartnerTeamId] = useState('');
  const [collabNote, setCollabNote] = useState('');
  const [collabStart, setCollabStart] = useState('');
  const [collabEnd, setCollabEnd] = useState('');
  const [collabSearch, setCollabSearch] = useState('');

  const teamLeaderId = data?.team.leader?._id;

  const canManage = canManageThisTeam(user?.id, user?.role, teamLeaderId);

  const load = useCallback(async () => {
    if (!id) return;
    const [detail, collabs] = await Promise.all([fetchTeamById(id), fetchTeamCollaborations(id)]);
    setData(detail as TeamDetail);
    setCollaborations(collabs);
  }, [id]);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    void (async () => {
      try {
        await load();
      } catch {
        toast('Impossible de charger l’équipe.', 'error');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id, load, toast]);

  useEffect(() => {
    if (!id || !data) return;
    if (!canManageThisTeam(user?.id, user?.role, data.team.leader?._id)) return;
    let cancelled = false;
    void (async () => {
      try {
        const [members, teams] = await Promise.all([
          fetchMembersDirectory({ isActive: true }) as Promise<{ id: string; name: string; role: string }[]>,
          fetchTeams() as Promise<{ _id: string; name: string; axis: string }[]>,
        ]);
        if (!cancelled) {
          setOptions(members.filter((m) => m.role !== 'super_admin'));
          setAllTeams(teams.filter((t) => t._id !== id));
        }
      } catch {
        /* optional for managers */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [data, id, user?.id, user?.role]);

  const filteredOptions = useMemo(() => {
    const q = candidateSearch.trim().toLowerCase();
    if (!q) return options;
    return options.filter((o) =>
      `${o.name} ${ROLE_LABELS[o.role as keyof typeof ROLE_LABELS] ?? o.role}`.toLowerCase().includes(q)
    );
  }, [candidateSearch, options]);

  const filteredMembers = useMemo(() => {
    if (!data) return [];
    const q = memberSearch.trim().toLowerCase();
    return data.members.filter((m) => {
      if (memberRoleFilter !== 'all' && m.role !== memberRoleFilter) return false;
      if (memberGradeFilter !== 'all' && (m.currentGrade ?? '') !== memberGradeFilter) return false;
      if (!q) return true;
      return `${m.name} ${m.email} ${ROLE_LABELS[m.role as keyof typeof ROLE_LABELS] ?? m.role} ${
        m.currentGrade ? (ROLE_LABELS[m.currentGrade as keyof typeof ROLE_LABELS] ?? m.currentGrade) : ''
      }`
        .toLowerCase()
        .includes(q);
    });
  }, [data, memberGradeFilter, memberRoleFilter, memberSearch]);

  const partnerOptions = useMemo(() => {
    const linked = new Set(collaborations.map((c) => c.partnerTeam._id));
    const q = collabSearch.trim().toLowerCase();
    return allTeams.filter((t) => {
      if (linked.has(t._id)) return false;
      if (!q) return true;
      return `${t.name} ${t.axis}`.toLowerCase().includes(q);
    });
  }, [allTeams, collabSearch, collaborations]);

  const canManageCollab = (c: TeamCollaborationRow) =>
    canManageCollaboration(user?.id, user?.role, teamLeaderId, c.partnerTeam.leader?._id);

  const onAddMember = async () => {
    if (!id || !candidate) return;
    try {
      await addTeamMember(id, candidate);
      toast('Membre ajouté.', 'success');
      setCandidate('');
      await load();
    } catch (e) {
      toast(isAxiosError(e) ? String(e.response?.data?.error ?? e) : 'Erreur', 'error');
    }
  };

  const onRemoveMember = async (uid: string, name: string) => {
    if (!id) return;
    if (!confirm(`Retirer ${name} de cette équipe ?`)) return;
    try {
      await removeTeamMember(id, uid);
      toast('Membre retiré.', 'success');
      await load();
    } catch (e) {
      toast(isAxiosError(e) ? String(e.response?.data?.error ?? e) : 'Erreur', 'error');
    }
  };

  const onAddCollaboration = async () => {
    if (!id || !partnerTeamId) return;
    try {
      await addTeamCollaboration(id, {
        partnerTeamId,
        note: collabNote.trim() || undefined,
        startDate: collabStart || undefined,
        endDate: collabEnd || undefined,
      });
      toast('Collaboration ajoutée.', 'success');
      setPartnerTeamId('');
      setCollabNote('');
      setCollabStart('');
      setCollabEnd('');
      await load();
    } catch (e) {
      toast(isAxiosError(e) ? String(e.response?.data?.error ?? e) : 'Erreur', 'error');
    }
  };

  const onUpdateCollaboration = async (
    partnerId: string,
    body: { note?: string; startDate?: string | null; endDate?: string | null }
  ) => {
    if (!id) return;
    try {
      await updateTeamCollaboration(id, partnerId, body);
      toast('Collaboration mise à jour.', 'success');
      await load();
    } catch (e) {
      toast(isAxiosError(e) ? String(e.response?.data?.error ?? e) : 'Erreur', 'error');
    }
  };

  const onRemoveCollaboration = async (partnerId: string, partnerName: string) => {
    if (!id) return;
    if (!confirm(`Mettre fin à la collaboration avec « ${partnerName} » ?`)) return;
    try {
      await removeTeamCollaboration(id, partnerId);
      toast('Collaboration terminée.', 'success');
      await load();
    } catch (e) {
      toast(isAxiosError(e) ? String(e.response?.data?.error ?? e) : 'Erreur', 'error');
    }
  };

  if (loading || !id) return <Skeleton className="h-32 w-full" />;
  if (!data) return <p>Équipe introuvable.</p>;

  return (
    <main className="text-left">
      <Breadcrumb items={[{ label: 'Accueil', to: '/' }, { label: 'Équipes', to: '/equipes' }, { label: data.team.name }]} />
      <div className="ds-card mt-6">
        <h1 className="ds-title-page">{data.team.name}</h1>
        <p className="ds-body mt-2">{data.team.axis}</p>
        <p className="ds-body mt-2">Leader: {data.team.leader?.name ?? '—'}</p>
        {data.team.description && <p className="ds-body mt-3 whitespace-pre-wrap">{data.team.description}</p>}
      </div>

      <div className="ds-card mt-6">
        <h2 className="ds-card-title">Membres</h2>
        <p className="ds-body mt-1 text-slate-600">
          {data.members.length} membre{data.members.length !== 1 ? 's' : ''}
          {filteredMembers.length !== data.members.length &&
            ` · ${filteredMembers.length} affiché${filteredMembers.length !== 1 ? 's' : ''} après filtre`}
        </p>
        <div className="mt-3 grid gap-2 md:grid-cols-3">
          <input
            className={inputClass}
            value={memberSearch}
            onChange={(e) => setMemberSearch(e.target.value)}
            placeholder="Rechercher (nom, e-mail, rôle)…"
          />
          <select className={inputClass} value={memberRoleFilter} onChange={(e) => setMemberRoleFilter(e.target.value)}>
            <option value="all">Tous les rôles</option>
            {Object.entries(ROLE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
          <select
            className={inputClass}
            value={memberGradeFilter}
            onChange={(e) => setMemberGradeFilter(e.target.value)}
          >
            <option value="all">Tous les grades</option>
            {ACADEMIC_GRADE_OPTIONS.map((g) => (
              <option key={g} value={g}>
                {ROLE_LABELS[g]}
              </option>
            ))}
          </select>
        </div>
        {data.members.length === 0 ? (
          <p className="ds-body mt-3">Aucun membre dans cette équipe.</p>
        ) : filteredMembers.length === 0 ? (
          <p className="ds-body mt-3">Aucun membre ne correspond aux filtres.</p>
        ) : (
          <ul className="mt-4 space-y-2">
            {filteredMembers.map((m) => (
              <li
                key={m._id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-200 px-3 py-2"
              >
                <p className="text-sm text-slate-800">
                  <Link to={`/membres/${m._id}`} className="font-medium text-primary hover:underline">
                    {m.name}
                  </Link>{' '}
                  · {ROLE_LABELS[m.role as keyof typeof ROLE_LABELS] ?? m.role}
                  {m.currentGrade && (
                    <>
                      {' '}
                      · {ROLE_LABELS[m.currentGrade as keyof typeof ROLE_LABELS] ?? m.currentGrade}
                    </>
                  )}
                </p>
                {canManage && (
                  <button
                    type="button"
                    className="ds-btn-secondary text-xs py-1"
                    onClick={() => void onRemoveMember(m._id, m.name)}
                  >
                    Retirer
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      {canManage && (
        <div className="ds-card mt-6">
          <h2 className="ds-card-title">Ajouter un membre</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            <input
              className={inputClass}
              value={candidateSearch}
              onChange={(e) => setCandidateSearch(e.target.value)}
              placeholder="Rechercher un membre…"
            />
            <select className={inputClass} value={candidate} onChange={(e) => setCandidate(e.target.value)}>
              <option value="">Choisir un membre…</option>
              {filteredOptions.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.name} ({ROLE_LABELS[o.role as keyof typeof ROLE_LABELS] ?? o.role})
                </option>
              ))}
            </select>
            <button type="button" className="ds-btn-primary" onClick={() => void onAddMember()}>
              Ajouter
            </button>
          </div>
        </div>
      )}

      <div className="ds-card mt-6">
        <h2 className="ds-card-title">Collaborations inter-équipes</h2>
        <p className="ds-body mt-1 text-slate-600">
          Les leaders des deux équipes (ou les responsables du labo) peuvent définir une période et mettre fin à une
          collaboration.
        </p>
        {canManage && (
          <div className="mt-4 grid gap-3 border-t border-slate-100 pt-4 md:grid-cols-2">
            <input
              className={inputClass}
              value={collabSearch}
              onChange={(e) => setCollabSearch(e.target.value)}
              placeholder="Rechercher une équipe partenaire…"
            />
            <select className={inputClass} value={partnerTeamId} onChange={(e) => setPartnerTeamId(e.target.value)}>
              <option value="">Choisir une équipe…</option>
              {partnerOptions.map((t) => (
                <option key={t._id} value={t._id}>
                  {t.name} ({t.axis})
                </option>
              ))}
            </select>
            <input
              className={`${inputClass} md:col-span-2`}
              value={collabNote}
              onChange={(e) => setCollabNote(e.target.value)}
              placeholder="Objet de la collaboration (optionnel)…"
              maxLength={500}
            />
            <label className="text-sm font-medium text-slate-800">
              Début
              <input
                type="date"
                className={inputClass}
                value={collabStart}
                onChange={(e) => setCollabStart(e.target.value)}
              />
            </label>
            <label className="text-sm font-medium text-slate-800">
              Fin
              <input
                type="date"
                className={inputClass}
                value={collabEnd}
                onChange={(e) => setCollabEnd(e.target.value)}
              />
            </label>
            <button type="button" className="ds-btn-primary w-fit md:col-span-2" onClick={() => void onAddCollaboration()}>
              Ajouter la collaboration
            </button>
          </div>
        )}
        {collaborations.length === 0 ? (
          <p className="ds-body mt-3">Aucune collaboration enregistrée.</p>
        ) : (
          <ul className="mt-4 space-y-3">
            {collaborations.map((c) => (
              <CollaborationCard
                key={c._id}
                collab={c}
                canEdit={canManageCollab(c)}
                onSave={(body) => void onUpdateCollaboration(c.partnerTeam._id, body)}
                onEnd={() => void onRemoveCollaboration(c.partnerTeam._id, c.partnerTeam.name)}
              />
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}

function CollaborationCard({
  collab,
  canEdit,
  onSave,
  onEnd,
}: {
  collab: TeamCollaborationRow;
  canEdit: boolean;
  onSave: (body: { note?: string; startDate?: string | null; endDate?: string | null }) => void;
  onEnd: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [note, setNote] = useState(collab.note ?? '');
  const [startDate, setStartDate] = useState(toInputDate(collab.startDate));
  const [endDate, setEndDate] = useState(toInputDate(collab.endDate));

  const periodLabel =
    collab.startDate || collab.endDate
      ? `${collab.startDate ? formatDate(collab.startDate) : '—'} → ${collab.endDate ? formatDate(collab.endDate) : '—'}`
      : null;

  return (
    <li className="rounded-lg border border-slate-200 px-3 py-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <Link to={`/equipes/${collab.partnerTeam._id}`} className="font-medium text-primary hover:underline">
            {collab.partnerTeam.name}
          </Link>
          <p className="text-sm text-slate-600">{collab.partnerTeam.axis}</p>
          {periodLabel && !editing && <p className="mt-1 text-sm text-slate-700">Période : {periodLabel}</p>}
          {collab.note && !editing && <p className="mt-1 text-sm text-slate-700 whitespace-pre-wrap">{collab.note}</p>}
        </div>
        {canEdit && !editing && (
          <div className="flex gap-2">
            <button type="button" className="ds-btn-secondary text-xs py-1" onClick={() => setEditing(true)}>
              Modifier
            </button>
            <button type="button" className="ds-btn-secondary text-xs py-1" onClick={onEnd}>
              Terminer
            </button>
          </div>
        )}
      </div>
      {canEdit && editing && (
        <div className="mt-3 grid gap-2 border-t border-slate-100 pt-3 md:grid-cols-2">
          <textarea
            className={`${inputClass} md:col-span-2`}
            rows={2}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Objet…"
            maxLength={500}
          />
          <label className="text-sm font-medium text-slate-800">
            Début
            <input type="date" className={inputClass} value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          </label>
          <label className="text-sm font-medium text-slate-800">
            Fin
            <input type="date" className={inputClass} value={endDate} onChange={(e) => setEndDate(e.target.value)} />
          </label>
          <div className="flex gap-2 md:col-span-2">
            <button
              type="button"
              className="ds-btn-primary text-xs py-1"
              onClick={() => {
                onSave({
                  note,
                  startDate: startDate || null,
                  endDate: endDate || null,
                });
                setEditing(false);
              }}
            >
              Enregistrer
            </button>
            <button
              type="button"
              className="ds-btn-secondary text-xs py-1"
              onClick={() => {
                setNote(collab.note ?? '');
                setStartDate(toInputDate(collab.startDate));
                setEndDate(toInputDate(collab.endDate));
                setEditing(false);
              }}
            >
              Annuler
            </button>
          </div>
        </div>
      )}
    </li>
  );
}
