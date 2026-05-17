import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { isAxiosError } from 'axios';
import Breadcrumb from '../components/layout/Breadcrumb';
import Skeleton from '../components/ui/Skeleton';
import { inputClass } from '../constants/formStyles';
import { canManageTeams, ROLE_LABELS } from '../constants/roles';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { createTeam, deleteTeam, fetchMembersDirectory, fetchTeams } from '../services/labApi';

type TeamRow = {
  _id: string;
  name: string;
  axis: string;
  description?: string;
  leader?: { name?: string; role?: string };
  memberCount?: number;
  collaborationCount?: number;
};
type LeaderOption = { id: string; name: string; role: string; isActive: boolean };

export default function TeamsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [rows, setRows] = useState<TeamRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [leaders, setLeaders] = useState<LeaderOption[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ name: '', axis: '', description: '', leader: '' });
  const [query, setQuery] = useState('');
  const [axisFilter, setAxisFilter] = useState('all');
  const [leaderSearch, setLeaderSearch] = useState('');

  const load = async () => {
    const teams = await fetchTeams();
    setRows(teams as TeamRow[]);
  };

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        await load();
        if (canManageTeams(user?.role)) {
          const members = (await fetchMembersDirectory({ isActive: true })) as LeaderOption[];
          if (!cancelled) {
            setLeaders(
              members.filter((m) =>
                ['professor_emeritus', 'maitre_conference', 'maitre_assistant'].includes(m.role)
              )
            );
          }
        }
      } catch {
        toast('Impossible de charger les équipes.', 'error');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [toast, user?.role]);

  const canManage = canManageTeams(user?.role);
  const axes = useMemo(() => {
    const vals = Array.from(new Set(rows.map((r) => r.axis).filter(Boolean)));
    return vals.sort((a, b) => a.localeCompare(b, 'fr', { sensitivity: 'base' }));
  }, [rows]);
  const filteredRows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((r) => {
      if (axisFilter !== 'all' && r.axis !== axisFilter) return false;
      if (!q) return true;
      return `${r.name} ${r.axis} ${r.leader?.name ?? ''}`.toLowerCase().includes(q);
    });
  }, [axisFilter, query, rows]);
  const visibleLeaders = useMemo(() => {
    const q = leaderSearch.trim().toLowerCase();
    if (!q) return leaders;
    return leaders.filter((l) => `${l.name} ${ROLE_LABELS[l.role as keyof typeof ROLE_LABELS] ?? l.role}`.toLowerCase().includes(q));
  }, [leaderSearch, leaders]);

  const onCreate = async () => {
    try {
      await createTeam({
        ...form,
        leader: user?.role === 'super_admin' ? form.leader : user?.id ?? '',
      });
      toast('Équipe créée.', 'success');
      setShowCreate(false);
      setForm({ name: '', axis: '', description: '', leader: '' });
      await load();
    } catch (e) {
      toast(isAxiosError(e) ? String(e.response?.data?.error ?? e) : 'Erreur', 'error');
    }
  };

  const onDelete = async (id: string) => {
    if (!confirm('Supprimer cette équipe ?')) return;
    try {
      await deleteTeam(id);
      toast('Équipe supprimée.', 'success');
      await load();
    } catch (e) {
      toast(isAxiosError(e) ? String(e.response?.data?.error ?? e) : 'Erreur', 'error');
    }
  };

  return (
    <main className="text-left">
      <Breadcrumb items={[{ label: 'Accueil', to: '/' }, { label: 'Équipes' }]} />
      <div className="mt-2 flex items-center justify-between gap-3">
        <div>
          <h1 className="ds-title-page">Équipes de recherche</h1>
          <p className="ds-body mt-1">Axes, leader, membres et collaborations inter-équipes.</p>
        </div>
        {canManage && (
          <button type="button" className="ds-btn-secondary" onClick={() => setShowCreate((s) => !s)}>
            {showCreate ? 'Fermer' : 'Nouvelle équipe'}
          </button>
        )}
      </div>
      <div className="ds-card mt-6 grid gap-3 md:grid-cols-2">
        <label className="text-sm font-medium text-slate-800">
          Recherche
          <input
            className={inputClass}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Nom, axe, leader…"
          />
        </label>
        <label className="text-sm font-medium text-slate-800">
          Axe
          <select className={inputClass} value={axisFilter} onChange={(e) => setAxisFilter(e.target.value)}>
            <option value="all">Tous</option>
            {axes.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
        </label>
      </div>

      {showCreate && canManage && (
        <div className="ds-card mt-6 grid gap-3 md:max-w-xl">
          <label className="text-sm font-medium text-slate-800">
            Nom
            <input className={inputClass} value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
          </label>
          <label className="text-sm font-medium text-slate-800">
            Axe
            <input className={inputClass} value={form.axis} onChange={(e) => setForm((f) => ({ ...f, axis: e.target.value }))} />
          </label>
          {user?.role === 'super_admin' ? (
            <label className="text-sm font-medium text-slate-800">
              Leader
              <input
                className={inputClass}
                value={leaderSearch}
                onChange={(e) => setLeaderSearch(e.target.value)}
                placeholder="Rechercher un leader…"
              />
              <select className={inputClass} value={form.leader} onChange={(e) => setForm((f) => ({ ...f, leader: e.target.value }))}>
                <option value="">Choisir…</option>
                {visibleLeaders.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.name} ({ROLE_LABELS[l.role as keyof typeof ROLE_LABELS] ?? l.role})
                  </option>
                ))}
              </select>
            </label>
          ) : (
            <div className="text-sm">
              <p className="font-medium text-slate-800">Leader</p>
              <p className="mt-1 text-slate-600">
                Vous serez automatiquement défini comme leader de cette équipe.
              </p>
            </div>
          )}
          <label className="text-sm font-medium text-slate-800">
            Description
            <textarea className={inputClass} rows={3} value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
          </label>
          <button type="button" className="ds-btn-primary w-fit" onClick={() => void onCreate()}>
            Créer
          </button>
        </div>
      )}

      {loading ? (
        <Skeleton className="mt-6 h-28 w-full" />
      ) : (
        <ul className="mt-6 space-y-3">
          {filteredRows.map((t) => (
            <li key={t._id} className="ds-card flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="font-semibold text-slate-900">{t.name}</p>
                <p className="text-sm text-slate-600">
                  {t.axis} · Leader: {t.leader?.name ?? '—'} · Membres: {t.memberCount ?? 0}
                  {(t.collaborationCount ?? 0) > 0 && ` · Collaborations: ${t.collaborationCount}`}
                </p>
              </div>
              <div className="flex gap-2">
                <Link to={`/equipes/${t._id}`} className="ds-btn-secondary">
                  Détail
                </Link>
                {user?.role === 'super_admin' && (
                  <button type="button" className="ds-btn-secondary" onClick={() => void onDelete(t._id)}>
                    Supprimer
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
