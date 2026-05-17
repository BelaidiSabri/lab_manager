import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { isAxiosError } from 'axios';
import Breadcrumb from '../components/layout/Breadcrumb';
import CollaborationCard from '../components/teams/CollaborationCard';
import FormModal from '../components/ui/FormModal';
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
  fetchProjects,
  fetchTeamCollaborations,
  fetchTeams,
  removeTeamCollaboration,
  removeTeamMember,
  updateTeamCollaboration,
  type ProjectRow,
  type TeamCollaborationRow,
} from '../services/labApi';
import { PROJECT_STATUS_LABELS } from '../constants/projects';

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

export default function TeamDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { toast } = useToast();
  const [data, setData] = useState<TeamDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [memberModalOpen, setMemberModalOpen] = useState(false);
  const [collabModalOpen, setCollabModalOpen] = useState(false);
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
  const [teamProjects, setTeamProjects] = useState<ProjectRow[]>([]);
  const [collabProjectMode, setCollabProjectMode] = useState<'none' | 'link' | 'create'>('none');
  const [collabLinkProjectId, setCollabLinkProjectId] = useState('');
  const [collabNewProjectTitle, setCollabNewProjectTitle] = useState('');

  const teamLeaderId = data?.team.leader?._id;
  const canManage = canManageThisTeam(user?.id, user?.role, teamLeaderId);

  const load = useCallback(async () => {
    if (!id) return;
    const [detail, collabs, projects] = await Promise.all([
      fetchTeamById(id),
      fetchTeamCollaborations(id),
      fetchProjects({ team: id }),
    ]);
    setData(detail as TeamDetail);
    setCollaborations(collabs);
    setTeamProjects(projects);
  }, [id]);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    void (async () => {
      try {
        await load();
      } catch {
        toast("Impossible de charger l'équipe.", 'error');
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

  const resetMemberModal = () => {
    setCandidate('');
    setCandidateSearch('');
    setMemberModalOpen(false);
  };

  const resetCollabModal = () => {
    setPartnerTeamId('');
    setCollabNote('');
    setCollabStart('');
    setCollabEnd('');
    setCollabSearch('');
    setCollabProjectMode('none');
    setCollabLinkProjectId('');
    setCollabNewProjectTitle('');
    setCollabModalOpen(false);
  };

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
      resetMemberModal();
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
      const body: Parameters<typeof addTeamCollaboration>[1] = {
        partnerTeamId,
        note: collabNote.trim() || undefined,
        startDate: collabStart || undefined,
        endDate: collabEnd || undefined,
      };
      if (collabProjectMode === 'link' && collabLinkProjectId) {
        body.projectId = collabLinkProjectId;
      } else if (collabProjectMode === 'create' && collabNewProjectTitle.trim()) {
        body.projectTitle = collabNewProjectTitle.trim();
      }
      await addTeamCollaboration(id, body);
      toast('Collaboration ajoutée.', 'success');
      resetCollabModal();
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
      <Breadcrumb
        items={[{ label: 'Accueil', to: '/' }, { label: 'Équipes', to: '/equipes' }, { label: data.team.name }]}
      />

      <div className="ds-card mt-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="ds-title-page">{data.team.name}</h1>
            <p className="ds-body mt-2">{data.team.axis}</p>
            <p className="ds-body mt-2">Leader : {data.team.leader?.name ?? '—'}</p>
            {data.team.description && (
              <p className="ds-body mt-3 whitespace-pre-wrap">{data.team.description}</p>
            )}
          </div>
          {canManage && (
            <div className="flex flex-wrap gap-2">
              <button type="button" className="ds-btn-secondary" onClick={() => setMemberModalOpen(true)}>
                Ajouter un membre
              </button>
              <button type="button" className="ds-btn-primary" onClick={() => setCollabModalOpen(true)}>
                Collaborations inter-équipes
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="ds-card mt-6">
        <h2 className="ds-card-title">Projets de l'équipe</h2>
        {teamProjects.length === 0 ? (
          <p className="ds-body mt-3">Aucun projet rattaché à cette équipe.</p>
        ) : (
          <ul className="mt-4 space-y-2">
            {teamProjects.map((p) => (
              <li
                key={p._id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm"
              >
                <Link to={`/projets/${p._id}`} className="font-medium text-primary hover:underline">
                  {p.title}
                </Link>
                <span className="text-slate-600">
                  {PROJECT_STATUS_LABELS[p.status] ?? p.status}
                  {' · '}
                  {p.leader?.name ?? '—'}
                </span>
              </li>
            ))}
          </ul>
        )}
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
                  </Link>
                  {' · '}
                  {ROLE_LABELS[m.role as keyof typeof ROLE_LABELS] ?? m.role}
                  {m.currentGrade && (
                    <>
                      {' · '}
                      {ROLE_LABELS[m.currentGrade as keyof typeof ROLE_LABELS] ?? m.currentGrade}
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

      <div className="ds-card mt-6">
        <h2 className="ds-card-title">Collaborations inter-équipes</h2>
        <p className="ds-body mt-1 text-slate-600">
          {collaborations.length} collaboration{collaborations.length !== 1 ? 's' : ''} enregistrée
          {collaborations.length !== 1 ? 's' : ''}. Les leaders des deux équipes (ou les responsables du labo)
          peuvent définir une période, rattacher des projets et mettre fin à une collaboration.
        </p>
        {collaborations.length === 0 ? (
          <p className="ds-body mt-3">Aucune collaboration enregistrée.</p>
        ) : (
          <ul className="mt-4 space-y-3">
            {collaborations.map((c) => (
              <CollaborationCard
                key={c._id}
                teamId={id}
                collab={c}
                teamProjects={teamProjects}
                canEdit={canManageCollab(c)}
                onSave={(body) => void onUpdateCollaboration(c.partnerTeam._id, body)}
                onEnd={() => void onRemoveCollaboration(c.partnerTeam._id, c.partnerTeam.name)}
                onRefresh={() => void load()}
              />
            ))}
          </ul>
        )}
      </div>

      <FormModal open={memberModalOpen} title="Ajouter un membre" onClose={resetMemberModal}>
        <div className="flex flex-col gap-3">
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
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" className="ds-btn-secondary" onClick={resetMemberModal}>
              Annuler
            </button>
            <button type="button" className="ds-btn-primary" disabled={!candidate} onClick={() => void onAddMember()}>
              Ajouter
            </button>
          </div>
        </div>
      </FormModal>

      <FormModal open={collabModalOpen} title="Nouvelle collaboration inter-équipes" onClose={resetCollabModal} wide>
        <div className="grid gap-3 md:grid-cols-2">
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
            <input type="date" className={inputClass} value={collabEnd} onChange={(e) => setCollabEnd(e.target.value)} />
          </label>
          <div className="md:col-span-2 space-y-3 rounded-lg border border-slate-100 bg-slate-50/80 p-3">
            <p className="text-sm font-medium text-slate-800">Projet de la collaboration (optionnel)</p>
            <select
              className={inputClass}
              value={collabProjectMode}
              onChange={(e) => setCollabProjectMode(e.target.value as 'none' | 'link' | 'create')}
            >
              <option value="none">Aucun pour l'instant</option>
              <option value="link">Rattacher un projet existant de l'équipe</option>
              <option value="create">Créer un nouveau projet inter-équipes</option>
            </select>
            {collabProjectMode === 'link' && (
              <select
                className={inputClass}
                value={collabLinkProjectId}
                onChange={(e) => setCollabLinkProjectId(e.target.value)}
              >
                <option value="">Choisir un projet…</option>
                {teamProjects.map((p) => (
                  <option key={p._id} value={p._id}>
                    {p.title}
                  </option>
                ))}
              </select>
            )}
            {collabProjectMode === 'create' && (
              <input
                className={inputClass}
                value={collabNewProjectTitle}
                onChange={(e) => setCollabNewProjectTitle(e.target.value)}
                placeholder="Titre du nouveau projet…"
                maxLength={300}
              />
            )}
          </div>
          <div className="flex justify-end gap-2 md:col-span-2">
            <button type="button" className="ds-btn-secondary" onClick={resetCollabModal}>
              Annuler
            </button>
            <button
              type="button"
              className="ds-btn-primary"
              disabled={!partnerTeamId}
              onClick={() => void onAddCollaboration()}
            >
              Créer la collaboration
            </button>
          </div>
        </div>
      </FormModal>
    </main>
  );
}
