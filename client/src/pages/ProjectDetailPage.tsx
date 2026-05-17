import { type FormEvent, useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { isAxiosError } from 'axios';
import Breadcrumb from '../components/layout/Breadcrumb';
import Skeleton from '../components/ui/Skeleton';
import { inputClass } from '../constants/formStyles';
import { PROJECT_STATUS_LABELS, projectTeamsList } from '../constants/projects';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import {
  addProjectMember,
  addProjectTeam,
  deleteProject,
  fetchMembersDirectory,
  fetchProjectById,
  fetchPublications,
  fetchTeams,
  linkProjectPublication,
  removeProjectMember,
  removeProjectTeam,
  unlinkProjectPublication,
  updateProject,
  type ProjectRow,
} from '../services/labApi';
import { formatDateDMY } from '../lib/formatDate';
import { ROLE_LABELS } from '../constants/roles';

function toInputDate(value?: string): string {
  if (!value) return '';
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? '' : d.toISOString().slice(0, 10);
}

export default function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const [project, setProject] = useState<ProjectRow | null>(null);
  const [canEdit, setCanEdit] = useState(false);
  const [canDelete, setCanDelete] = useState(false);
  const [locked, setLocked] = useState(false);
  const [nextStatuses, setNextStatuses] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [members, setMembers] = useState<{ id: string; name: string; role?: string }[]>([]);
  const [teams, setTeams] = useState<{ _id: string; name: string }[]>([]);
  const [publications, setPublications] = useState<{ _id: string; title: string }[]>([]);
  const [newMemberId, setNewMemberId] = useState('');
  const [memberSearch, setMemberSearch] = useState('');
  const [linkPubId, setLinkPubId] = useState('');
  const [pubSearch, setPubSearch] = useState('');
  const [newTeamId, setNewTeamId] = useState('');
  const [teamSearch, setTeamSearch] = useState('');

  const load = useCallback(async () => {
    if (!id) return;
    const data = await fetchProjectById(id);
    setProject(data.project);
    setCanEdit(data.canEdit);
    setCanDelete(data.canDelete);
    setLocked(data.locked);
    setNextStatuses(data.nextStatuses);
  }, [id]);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    void (async () => {
      try {
        await load();
        if (!cancelled) {
          const [memberList, teamList, pubList] = await Promise.all([
            fetchMembersDirectory({ isActive: true }),
            fetchTeams() as Promise<{ _id: string; name: string }[]>,
            fetchPublications() as Promise<{ _id: string; title: string }[]>,
          ]);
          setMembers(
            memberList
              .filter((m) => m.role !== 'super_admin')
              .map((m) => ({ id: m.id, name: m.name, role: m.role }))
          );
          setTeams(teamList);
          setPublications(pubList.map((p) => ({ _id: p._id, title: p.title })));
        }
      } catch {
        toast('Projet introuvable.', 'error');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id, load, toast]);

  const onStatusChange = async (status: string) => {
    if (!id) return;
    try {
      await updateProject(id, { status });
      toast('Statut mis à jour.', 'success');
      await load();
    } catch (e) {
      toast(isAxiosError(e) ? String(e.response?.data?.error ?? e) : 'Erreur', 'error');
    }
  };

  const onSave = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!id) return;
    const fd = new FormData(e.currentTarget);
    try {
      await updateProject(id, {
        title: fd.get('title'),
        description: fd.get('description'),
        type: fd.get('type'),
        fundingSource: fd.get('fundingSource'),
        startDate: fd.get('startDate') || null,
        endDate: fd.get('endDate') || null,
      });
      toast('Projet enregistré.', 'success');
      setEditing(false);
      await load();
    } catch (err) {
      toast(isAxiosError(err) ? String(err.response?.data?.error ?? err) : 'Erreur', 'error');
    }
  };

  const onDelete = async () => {
    if (!id || !project) return;
    if (!confirm(`Supprimer le projet « ${project.title} » ?`)) return;
    try {
      await deleteProject(id);
      toast('Projet supprimé.', 'success');
      void navigate('/projets');
    } catch (e) {
      toast(isAxiosError(e) ? String(e.response?.data?.error ?? e) : 'Erreur', 'error');
    }
  };

  const onAddMember = async () => {
    if (!id || !newMemberId) return;
    try {
      await addProjectMember(id, newMemberId);
      toast('Membre ajouté.', 'success');
      setNewMemberId('');
      setMemberSearch('');
      await load();
    } catch (e) {
      toast(isAxiosError(e) ? String(e.response?.data?.error ?? e) : 'Erreur', 'error');
    }
  };

  const onRemoveMember = async (uid: string) => {
    if (!id) return;
    try {
      await removeProjectMember(id, uid);
      toast('Membre retiré.', 'success');
      await load();
    } catch (e) {
      toast(isAxiosError(e) ? String(e.response?.data?.error ?? e) : 'Erreur', 'error');
    }
  };

  const onLinkPub = async () => {
    if (!id || !linkPubId) return;
    try {
      await linkProjectPublication(id, linkPubId);
      toast('Publication liée.', 'success');
      setLinkPubId('');
      setPubSearch('');
      await load();
    } catch (e) {
      toast(isAxiosError(e) ? String(e.response?.data?.error ?? e) : 'Erreur', 'error');
    }
  };

  const onAddTeam = async () => {
    if (!id || !newTeamId) return;
    try {
      await addProjectTeam(id, newTeamId);
      toast('Équipe rattachée.', 'success');
      setNewTeamId('');
      setTeamSearch('');
      await load();
    } catch (e) {
      toast(isAxiosError(e) ? String(e.response?.data?.error ?? e) : 'Erreur', 'error');
    }
  };

  const onRemoveTeam = async (teamId: string, name: string) => {
    if (!id) return;
    if (!confirm(`Retirer l'équipe « ${name} » de ce projet ?`)) return;
    try {
      await removeProjectTeam(id, teamId);
      toast('Équipe retirée.', 'success');
      await load();
    } catch (e) {
      toast(isAxiosError(e) ? String(e.response?.data?.error ?? e) : 'Erreur', 'error');
    }
  };

  const onUnlinkPub = async (pubId: string) => {
    if (!id) return;
    try {
      await unlinkProjectPublication(id, pubId);
      toast('Lien retiré.', 'success');
      await load();
    } catch (e) {
      toast(isAxiosError(e) ? String(e.response?.data?.error ?? e) : 'Erreur', 'error');
    }
  };

  if (loading || !id) return <Skeleton className="mt-8 h-48 w-full" />;
  if (!project) return <p className="mt-8">Projet introuvable.</p>;

  const leaderId = project.leader?._id;
  const memberIds = new Set((project.members ?? []).map((m) => m._id));
  const memberQ = memberSearch.trim().toLowerCase();
  const availableMembers = members.filter((m) => {
    if (memberIds.has(m.id)) return false;
    if (!memberQ) return true;
    const roleLabel = m.role ? (ROLE_LABELS[m.role as keyof typeof ROLE_LABELS] ?? m.role) : '';
    return `${m.name} ${roleLabel}`.toLowerCase().includes(memberQ);
  });
  const linkedPubIds = new Set((project.relatedPublications ?? []).map((p) => p._id));
  const pubQ = pubSearch.trim().toLowerCase();
  const linkedTeamIds = new Set(
    projectTeamsList(project).map((t) => t._id).filter(Boolean) as string[]
  );
  const teamQ = teamSearch.trim().toLowerCase();
  const availableTeams = teams.filter((t) => {
    if (linkedTeamIds.has(t._id)) return false;
    if (!teamQ) return true;
    return t.name.toLowerCase().includes(teamQ);
  });

  const availablePubs = publications.filter((p) => {
    if (linkedPubIds.has(p._id)) return false;
    if (!pubQ) return true;
    return p.title.toLowerCase().includes(pubQ);
  });

  return (
    <main className="text-left">
      <Breadcrumb
        items={[
          { label: 'Accueil', to: '/' },
          { label: 'Projets', to: '/projets' },
          { label: project.title },
        ]}
      />

      <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="ds-title-page">{project.title}</h1>
          <p className="mt-2 text-sm text-slate-600">
            <span className="rounded-full bg-slate-100 px-2 py-0.5 font-medium text-slate-800">
              {PROJECT_STATUS_LABELS[project.status] ?? project.status}
            </span>
            {locked && <span className="ml-2 text-amber-700">(verrouillé)</span>}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {canEdit && !locked && !editing && (
            <button type="button" className="ds-btn-secondary" onClick={() => setEditing(true)}>
              Modifier
            </button>
          )}
          {canDelete && (
            <button type="button" className="ds-btn-secondary text-red-600" onClick={() => void onDelete()}>
              Supprimer
            </button>
          )}
        </div>
      </div>

      {canEdit && !locked && nextStatuses.length > 0 && (
        <div className="ds-card mt-4 flex flex-wrap items-center gap-2">
          <span className="text-sm font-medium text-slate-800">Avancer le statut :</span>
          {nextStatuses.map((s) => (
            <button key={s} type="button" className="ds-btn-secondary text-xs py-1" onClick={() => void onStatusChange(s)}>
              → {PROJECT_STATUS_LABELS[s] ?? s}
            </button>
          ))}
        </div>
      )}

      {editing ? (
        <form className="ds-card mt-6 max-w-2xl space-y-4" onSubmit={(ev) => void onSave(ev)}>
          <label className="block text-sm font-medium text-slate-800">
            Titre
            <input name="title" className={inputClass} defaultValue={project.title} required />
          </label>
          <label className="block text-sm font-medium text-slate-800">
            Description
            <textarea name="description" className={inputClass} rows={4} defaultValue={project.description ?? ''} />
          </label>
          <label className="block text-sm font-medium text-slate-800">
            Type
            <input name="type" className={inputClass} defaultValue={project.type ?? ''} />
          </label>
          <label className="block text-sm font-medium text-slate-800">
            Financement
            <input name="fundingSource" className={inputClass} defaultValue={project.fundingSource ?? ''} />
          </label>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-sm font-medium text-slate-800">
              Début
              <input name="startDate" type="date" className={inputClass} defaultValue={toInputDate(project.startDate)} />
            </label>
            <label className="block text-sm font-medium text-slate-800">
              Fin
              <input name="endDate" type="date" className={inputClass} defaultValue={toInputDate(project.endDate)} />
            </label>
          </div>
          <div className="flex gap-2">
            <button type="submit" className="ds-btn-primary">
              Enregistrer
            </button>
            <button type="button" className="ds-btn-secondary" onClick={() => setEditing(false)}>
              Annuler
            </button>
          </div>
        </form>
      ) : (
        <div className="ds-card mt-6 space-y-4">
          {project.description && (
            <p className="whitespace-pre-wrap text-sm text-slate-800">{project.description}</p>
          )}
          <dl className="grid gap-3 text-sm sm:grid-cols-2">
            <div>
              <dt className="font-medium text-slate-500">Type</dt>
              <dd className="text-slate-900">{project.type || '—'}</dd>
            </div>
            <div>
              <dt className="font-medium text-slate-500">Financement</dt>
              <dd className="text-slate-900">{project.fundingSource || '—'}</dd>
            </div>
            <div>
              <dt className="font-medium text-slate-500">Chef de projet</dt>
              <dd>
                {leaderId ? (
                  <Link to={`/membres/${leaderId}`} className="text-primary hover:underline">
                    {project.leader?.name}
                  </Link>
                ) : (
                  '—'
                )}
              </dd>
            </div>
            <div>
              <dt className="font-medium text-slate-500">Équipes</dt>
              <dd className="text-slate-900">
                {projectTeamsList(project).length === 0 ? (
                  '—'
                ) : (
                  <ul className="mt-1 space-y-1">
                    {projectTeamsList(project).map((t) =>
                      t._id ? (
                        <li key={t._id}>
                          <Link to={`/equipes/${t._id}`} className="text-primary hover:underline">
                            {t.name}
                          </Link>
                        </li>
                      ) : null
                    )}
                  </ul>
                )}
              </dd>
            </div>
            <div>
              <dt className="font-medium text-slate-500">Période</dt>
              <dd className="text-slate-900">
                {project.startDate ? formatDateDMY(project.startDate) : '—'} →{' '}
                {project.endDate ? formatDateDMY(project.endDate) : '—'}
              </dd>
            </div>
          </dl>
        </div>
      )}

      <div className="ds-card mt-6">
        <h2 className="ds-card-title">Équipes</h2>
        <p className="ds-body mt-1 text-slate-600">
          Une équipe seule ou plusieurs (collaboration inter-équipes requise). Les membres du projet sont des
          personnes ; les équipes structurent le rattachement organisationnel.
        </p>
        {projectTeamsList(project).length === 0 ? (
          <p className="ds-body mt-3">Aucune équipe rattachée.</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {projectTeamsList(project).map((t) =>
              t._id ? (
                <li
                  key={t._id}
                  className="flex items-center justify-between gap-2 rounded border border-slate-200 px-3 py-2 text-sm"
                >
                  <Link to={`/equipes/${t._id}`} className="font-medium text-primary hover:underline">
                    {t.name}
                  </Link>
                  {canEdit && !locked && (
                    <button
                      type="button"
                      className="ds-btn-secondary text-xs py-1"
                      onClick={() => void onRemoveTeam(t._id!, t.name ?? 'Équipe')}
                    >
                      Retirer
                    </button>
                  )}
                </li>
              ) : null
            )}
          </ul>
        )}
        {canEdit && !locked && (
          <div className="mt-4 flex flex-col gap-2 sm:flex-row">
            <input
              className={inputClass}
              value={teamSearch}
              onChange={(e) => setTeamSearch(e.target.value)}
              placeholder="Rechercher une équipe…"
            />
            <select className={inputClass} value={newTeamId} onChange={(e) => setNewTeamId(e.target.value)}>
              <option value="">{availableTeams.length === 0 ? 'Aucun résultat' : 'Choisir une équipe…'}</option>
              {availableTeams.slice(0, 100).map((t) => (
                <option key={t._id} value={t._id}>
                  {t.name}
                </option>
              ))}
            </select>
            <button type="button" className="ds-btn-primary shrink-0" onClick={() => void onAddTeam()}>
              Rattacher
            </button>
          </div>
        )}
      </div>

      <div className="ds-card mt-6">
        <h2 className="ds-card-title">Membres</h2>
        <ul className="mt-3 space-y-2">
          {(project.members ?? []).map((m) => (
            <li key={m._id} className="flex items-center justify-between gap-2 rounded border border-slate-200 px-3 py-2 text-sm">
              <span>
                <Link to={`/membres/${m._id}`} className="font-medium text-primary hover:underline">
                  {m.name}
                </Link>
                {m._id === leaderId && <span className="ml-2 text-xs text-slate-500">(chef)</span>}
              </span>
              {canEdit && !locked && m._id !== leaderId && (
                <button type="button" className="ds-btn-secondary text-xs py-1" onClick={() => void onRemoveMember(m._id)}>
                  Retirer
                </button>
              )}
            </li>
          ))}
        </ul>
        {canEdit && !locked && (
          <div className="mt-4 space-y-2">
            <div className="flex flex-col gap-2 sm:flex-row">
              <input
                className={inputClass}
                value={memberSearch}
                onChange={(e) => setMemberSearch(e.target.value)}
                placeholder="Rechercher un membre…"
              />
              <select className={inputClass} value={newMemberId} onChange={(e) => setNewMemberId(e.target.value)}>
                <option value="">
                  {availableMembers.length === 0 ? 'Aucun résultat' : 'Choisir un membre…'}
                </option>
                {availableMembers.slice(0, 100).map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                    {m.role ? ` (${ROLE_LABELS[m.role as keyof typeof ROLE_LABELS] ?? m.role})` : ''}
                  </option>
                ))}
              </select>
              <button type="button" className="ds-btn-primary shrink-0" onClick={() => void onAddMember()}>
                Ajouter
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="ds-card mt-6">
        <h2 className="ds-card-title">Publications liées</h2>
        {(project.relatedPublications ?? []).length === 0 ? (
          <p className="ds-body mt-2">Aucune publication liée.</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {(project.relatedPublications ?? []).map((p) => (
              <li key={p._id} className="flex items-center justify-between gap-2 rounded border border-slate-200 px-3 py-2 text-sm">
                <Link to={`/publications/${p._id}`} className="font-medium text-primary hover:underline">
                  {p.title}
                  {p.year ? ` (${p.year})` : ''}
                </Link>
                {canEdit && !locked && (
                  <button type="button" className="ds-btn-secondary text-xs py-1" onClick={() => void onUnlinkPub(p._id)}>
                    Retirer
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
        {canEdit && !locked && (
          <div className="mt-4 flex flex-col gap-2 sm:flex-row">
            <input
              className={inputClass}
              value={pubSearch}
              onChange={(e) => setPubSearch(e.target.value)}
              placeholder="Rechercher une publication…"
            />
            <select className={inputClass} value={linkPubId} onChange={(e) => setLinkPubId(e.target.value)}>
              <option value="">
                {availablePubs.length === 0 ? 'Aucun résultat' : 'Choisir une publication…'}
              </option>
              {availablePubs.slice(0, 100).map((p) => (
                <option key={p._id} value={p._id}>
                  {p.title}
                </option>
              ))}
            </select>
            <button type="button" className="ds-btn-primary shrink-0" onClick={() => void onLinkPub()}>
              Lier
            </button>
          </div>
        )}
      </div>
    </main>
  );
}
