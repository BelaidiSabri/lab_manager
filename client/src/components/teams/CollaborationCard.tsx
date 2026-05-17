import { useState } from 'react';
import { Link } from 'react-router-dom';
import { isAxiosError } from 'axios';
import { inputClass } from '../../constants/formStyles';
import { PROJECT_STATUS_LABELS, projectTeamsList } from '../../constants/projects';
import { useToast } from '../../context/ToastContext';
import {
  attachCollaborationProject,
  detachCollaborationProject,
  type ProjectRow,
  type TeamCollaborationRow,
} from '../../services/labApi';

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

export default function CollaborationCard({
  teamId,
  collab,
  teamProjects,
  canEdit,
  onSave,
  onEnd,
  onRefresh,
}: {
  teamId: string;
  collab: TeamCollaborationRow;
  teamProjects: ProjectRow[];
  canEdit: boolean;
  onSave: (body: { note?: string; startDate?: string | null; endDate?: string | null }) => void;
  onEnd: () => void;
  onRefresh: () => void;
}) {
  const { toast } = useToast();
  const [editing, setEditing] = useState(false);
  const [note, setNote] = useState(collab.note ?? '');
  const [startDate, setStartDate] = useState(toInputDate(collab.startDate));
  const [endDate, setEndDate] = useState(toInputDate(collab.endDate));
  const [projectMode, setProjectMode] = useState<'link' | 'create'>('link');
  const [linkProjectId, setLinkProjectId] = useState('');
  const [newProjectTitle, setNewProjectTitle] = useState('');

  const partnerId = collab.partnerTeam._id;
  const linkedIds = new Set((collab.projects ?? []).map((p) => p._id));

  const linkableProjects = teamProjects.filter((p) => {
    if (linkedIds.has(p._id)) return false;
    const teamIds = projectTeamsList(p)
      .map((t) => t._id)
      .filter(Boolean) as string[];
    return teamIds.includes(teamId) && !teamIds.includes(partnerId);
  });

  const periodLabel =
    collab.startDate || collab.endDate
      ? `${collab.startDate ? formatDate(collab.startDate) : '—'} → ${collab.endDate ? formatDate(collab.endDate) : '—'}`
      : null;

  const onAttachProject = async () => {
    try {
      if (projectMode === 'link' && linkProjectId) {
        await attachCollaborationProject(teamId, partnerId, { projectId: linkProjectId });
        toast('Projet rattaché à la collaboration.', 'success');
      } else if (projectMode === 'create' && newProjectTitle.trim()) {
        await attachCollaborationProject(teamId, partnerId, { title: newProjectTitle.trim() });
        toast('Projet créé et rattaché.', 'success');
      } else {
        toast('Choisissez un projet ou saisissez un titre.', 'error');
        return;
      }
      setLinkProjectId('');
      setNewProjectTitle('');
      onRefresh();
    } catch (e) {
      toast(isAxiosError(e) ? String(e.response?.data?.error ?? e) : 'Erreur', 'error');
    }
  };

  const onDetachProject = async (projectId: string, title: string) => {
    if (!confirm(`Retirer le projet « ${title} » de cette collaboration ?`)) return;
    try {
      await detachCollaborationProject(teamId, partnerId, projectId);
      toast('Projet détaché.', 'success');
      onRefresh();
    } catch (e) {
      toast(isAxiosError(e) ? String(e.response?.data?.error ?? e) : 'Erreur', 'error');
    }
  };

  return (
    <li className="rounded-lg border border-slate-200 px-3 py-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <Link to={`/equipes/${collab.partnerTeam._id}`} className="font-medium text-primary hover:underline">
            {collab.partnerTeam.name}
          </Link>
          <p className="text-sm text-slate-600">{collab.partnerTeam.axis}</p>
          {periodLabel && !editing && <p className="mt-1 text-sm text-slate-700">Période : {periodLabel}</p>}
          {collab.note && !editing && <p className="mt-1 whitespace-pre-wrap text-sm text-slate-700">{collab.note}</p>}
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

      <div className="mt-3 border-t border-slate-100 pt-3">
        <h4 className="text-sm font-semibold text-slate-800">Projets de la collaboration</h4>
        {(collab.projects ?? []).length === 0 ? (
          <p className="ds-body mt-1">Aucun projet lié.</p>
        ) : (
          <ul className="mt-2 space-y-2">
            {(collab.projects ?? []).map((p) => (
              <li
                key={p._id}
                className="flex flex-wrap items-center justify-between gap-2 rounded border border-slate-200 px-2 py-1.5 text-sm"
              >
                <Link to={`/projets/${p._id}`} className="font-medium text-primary hover:underline">
                  {p.title}
                </Link>
                <span className="text-slate-500">
                  {PROJECT_STATUS_LABELS[p.status] ?? p.status}
                  {canEdit && (
                    <button
                      type="button"
                      className="ml-2 text-xs text-slate-600 underline"
                      onClick={() => void onDetachProject(p._id, p.title)}
                    >
                      Détacher
                    </button>
                  )}
                </span>
              </li>
            ))}
          </ul>
        )}
        {canEdit && (
          <div className="mt-3 space-y-2 rounded-lg bg-slate-50 p-3">
            <select
              className={inputClass}
              value={projectMode}
              onChange={(e) => setProjectMode(e.target.value as 'link' | 'create')}
            >
              <option value="link">Rattacher un projet existant</option>
              <option value="create">Créer un nouveau projet</option>
            </select>
            {projectMode === 'link' ? (
              <select className={inputClass} value={linkProjectId} onChange={(e) => setLinkProjectId(e.target.value)}>
                <option value="">Choisir un projet de l&apos;équipe…</option>
                {linkableProjects.map((p) => (
                  <option key={p._id} value={p._id}>
                    {p.title}
                  </option>
                ))}
              </select>
            ) : (
              <input
                className={inputClass}
                value={newProjectTitle}
                onChange={(e) => setNewProjectTitle(e.target.value)}
                placeholder="Titre du nouveau projet…"
                maxLength={300}
              />
            )}
            <button type="button" className="ds-btn-primary text-xs py-1" onClick={() => void onAttachProject()}>
              Ajouter le projet
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
