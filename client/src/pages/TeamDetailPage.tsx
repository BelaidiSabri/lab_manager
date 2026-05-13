import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { isAxiosError } from 'axios';
import Breadcrumb from '../components/layout/Breadcrumb';
import Skeleton from '../components/ui/Skeleton';
import { inputClass } from '../constants/formStyles';
import { canManageTeams, ROLE_LABELS } from '../constants/roles';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { addTeamMember, fetchMembersDirectory, fetchTeamById, removeTeamMember } from '../services/labApi';

type TeamDetail = {
  team: { _id: string; name: string; axis: string; description?: string; leader?: { name?: string } };
  members: { _id: string; name: string; email: string; role: string; currentGrade?: string }[];
};

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

  const load = useCallback(async () => {
    if (!id) return;
    const detail = await fetchTeamById(id);
    setData(detail as TeamDetail);
  }, [id]);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    void (async () => {
      try {
        await load();
        if (canManageTeams(user?.role)) {
          const members = (await fetchMembersDirectory({ isActive: true })) as {
            id: string;
            name: string;
            role: string;
          }[];
          if (!cancelled) setOptions(members.filter((m) => m.role !== 'super_admin'));
        }
      } catch {
        toast('Impossible de charger l’équipe.', 'error');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id, load, toast, user?.role]);

  const canManage = canManageTeams(user?.role);
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
      if (!q) return true;
      return `${m.name} ${m.email} ${ROLE_LABELS[m.role as keyof typeof ROLE_LABELS] ?? m.role}`
        .toLowerCase()
        .includes(q);
    });
  }, [data, memberRoleFilter, memberSearch]);

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

  const onRemoveMember = async (uid: string) => {
    if (!id) return;
    try {
      await removeTeamMember(id, uid);
      toast('Membre retiré.', 'success');
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

      {canManage && (
        <div className="ds-card mt-6">
          <h2 className="ds-card-title">Ajouter un membre</h2>
          <div className="mt-3 flex gap-2">
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
        <h2 className="ds-card-title">Membres</h2>
        <div className="mt-3 grid gap-2 md:grid-cols-2">
          <input
            className={inputClass}
            value={memberSearch}
            onChange={(e) => setMemberSearch(e.target.value)}
            placeholder="Rechercher un membre…"
          />
          <select className={inputClass} value={memberRoleFilter} onChange={(e) => setMemberRoleFilter(e.target.value)}>
            <option value="all">Tous les rôles</option>
            {Object.entries(ROLE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>
        {data.members.length === 0 ? (
          <p className="ds-body mt-3">Aucun membre dans cette équipe.</p>
        ) : (
          <ul className="mt-4 space-y-2">
            {filteredMembers.map((m) => (
              <li key={m._id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-200 px-3 py-2">
                <p className="text-sm text-slate-800">
                  <Link to={`/membres/${m._id}`} className="font-medium text-primary hover:underline">
                    {m.name}
                  </Link>{' '}
                  · {ROLE_LABELS[m.role as keyof typeof ROLE_LABELS] ?? m.role} · {m.currentGrade ?? '—'}
                </p>
                {canManage && (
                  <button type="button" className="ds-btn-secondary text-xs py-1" onClick={() => void onRemoveMember(m._id)}>
                    Retirer
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}
