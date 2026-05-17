import { type FormEvent, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { isAxiosError } from 'axios';
import Breadcrumb from '../components/layout/Breadcrumb';
import ProjectMemberPicker, { type MemberOption } from '../components/projects/ProjectMemberPicker';
import { inputClass } from '../constants/formStyles';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { createProject, fetchMembersDirectory, fetchTeams } from '../services/labApi';

export default function ProjectNewPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const [submitting, setSubmitting] = useState(false);
  const [teams, setTeams] = useState<{ _id: string; name: string }[]>([]);
  const [memberOptions, setMemberOptions] = useState<MemberOption[]>([]);
  const [selectedMembers, setSelectedMembers] = useState<MemberOption[]>([]);
  const [teamId, setTeamId] = useState('');

  useEffect(() => {
    void (async () => {
      try {
        const [teamList, memberList] = await Promise.all([
          fetchTeams() as Promise<{ _id: string; name: string }[]>,
          fetchMembersDirectory({ isActive: true }),
        ]);
        setTeams(teamList);
        setMemberOptions(
          memberList
            .filter((m) => m.role !== 'super_admin')
            .map((m) => ({ id: m.id, name: m.name, role: m.role }))
        );
        const self = memberList.find((m) => m.id === user?.id);
        if (self?.team?.id) setTeamId(self.team.id);
      } catch {
        /* optional */
      }
    })();
  }, [user?.id]);

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setSubmitting(true);
    try {
      await createProject({
        title: fd.get('title'),
        description: fd.get('description'),
        type: fd.get('type'),
        fundingSource: fd.get('fundingSource'),
        team: teamId || undefined,
        startDate: fd.get('startDate') || undefined,
        endDate: fd.get('endDate') || undefined,
        members: user?.id ? [user.id, ...selectedMembers.map((m) => m.id)] : selectedMembers.map((m) => m.id),
        status: 'planned',
      });
      toast('Projet créé.', 'success');
      void navigate('/projets');
    } catch (err) {
      toast(isAxiosError(err) ? String(err.response?.data?.error ?? err) : 'Erreur', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="text-left">
      <Breadcrumb
        items={[{ label: 'Accueil', to: '/' }, { label: 'Projets', to: '/projets' }, { label: 'Nouveau' }]}
      />
      <h1 className="ds-title-page mt-4">Nouveau projet de recherche</h1>
      <p className="ds-body mt-1">Le projet démarre au statut « planifié ». Vous en êtes le chef de projet.</p>

      <form className="ds-card mt-6 max-w-2xl space-y-4" onSubmit={(ev) => void onSubmit(ev)}>
        <label className="block text-sm font-medium text-slate-800">
          Titre *
          <input name="title" className={inputClass} required />
        </label>
        <label className="block text-sm font-medium text-slate-800">
          Description
          <textarea name="description" className={inputClass} rows={4} />
        </label>
        <label className="block text-sm font-medium text-slate-800">
          Type (libre)
          <input name="type" className={inputClass} placeholder="ANR, collaboration industrielle, thèse CIFRE…" />
        </label>
        <label className="block text-sm font-medium text-slate-800">
          Source de financement
          <input name="fundingSource" className={inputClass} placeholder="ANR, FEDER, budget labo…" />
        </label>
        <label className="block text-sm font-medium text-slate-800">
          Équipe associée
          <select className={inputClass} value={teamId} onChange={(e) => setTeamId(e.target.value)}>
            <option value="">— Aucune / personnelle —</option>
            {teams.map((t) => (
              <option key={t._id} value={t._id}>
                {t.name}
              </option>
            ))}
          </select>
        </label>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-sm font-medium text-slate-800">
            Date de début
            <input name="startDate" type="date" className={inputClass} />
          </label>
          <label className="block text-sm font-medium text-slate-800">
            Date de fin prévue
            <input name="endDate" type="date" className={inputClass} />
          </label>
        </div>

        <ProjectMemberPicker
          options={memberOptions}
          selected={selectedMembers}
          onSelectedChange={setSelectedMembers}
          excludeIds={user?.id ? [user.id] : []}
        />

        <div className="flex gap-2 pt-2">
          <button type="submit" disabled={submitting} className="ds-btn-primary">
            {submitting ? 'Création…' : 'Créer le projet'}
          </button>
          <Link to="/projets" className="ds-btn-secondary">
            Annuler
          </Link>
        </div>
      </form>
    </main>
  );
}
