import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import Breadcrumb from '../components/layout/Breadcrumb';
import Skeleton from '../components/ui/Skeleton';
import { inputClass } from '../constants/formStyles';
import { PROJECT_STATUS_LABELS, PROJECT_STATUS_OPTIONS } from '../constants/projects';
import { canCreateProjects } from '../constants/roles';
import { useAuth } from '../context/AuthContext';
import { fetchProjects, fetchTeams, type ProjectRow } from '../services/labApi';

export default function ProjectsPage() {
  const { user } = useAuth();
  const [rows, setRows] = useState<ProjectRow[]>([]);
  const [teams, setTeams] = useState<{ _id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [teamFilter, setTeamFilter] = useState('all');
  const [query, setQuery] = useState('');

  useEffect(() => {
    void fetchTeams()
      .then((t) => setTeams(t as { _id: string; name: string }[]))
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    let c = false;
    void (async () => {
      setLoading(true);
      try {
        const params: { status?: string; team?: string } = {};
        if (statusFilter !== 'all') params.status = statusFilter;
        if (teamFilter !== 'all') params.team = teamFilter;
        const projects = await fetchProjects(params);
        if (!c) setRows(projects);
      } finally {
        if (!c) setLoading(false);
      }
    })();
    return () => {
      c = true;
    };
  }, [statusFilter, teamFilter]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((p) =>
      `${p.title} ${p.type ?? ''} ${p.leader?.name ?? ''} ${p.team?.name ?? ''}`.toLowerCase().includes(q)
    );
  }, [query, rows]);

  const canCreate = canCreateProjects(user?.role);

  return (
    <main className="text-left">
      <Breadcrumb items={[{ label: 'Accueil', to: '/' }, { label: 'Projets' }]} />
      <div className="mt-4 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="ds-title-page">Projets de recherche</h1>
          <p className="ds-body mt-1">Planification, suivi et publications liées.</p>
        </div>
        {canCreate && (
          <Link to="/projets/nouveau" className="ds-btn-primary">
            Nouveau projet
          </Link>
        )}
      </div>

      <div className="ds-card mt-6 grid gap-3 md:grid-cols-3">
        <input
          className={inputClass}
          placeholder="Rechercher…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <select className={inputClass} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="all">Tous les statuts</option>
          {PROJECT_STATUS_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <select className={inputClass} value={teamFilter} onChange={(e) => setTeamFilter(e.target.value)}>
          <option value="all">Toutes les équipes</option>
          {teams.map((t) => (
            <option key={t._id} value={t._id}>
              {t.name}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <Skeleton className="mt-8 h-48 w-full" />
      ) : filtered.length === 0 ? (
        <p className="ds-body mt-8">Aucun projet trouvé.</p>
      ) : (
        <ul className="mt-8 space-y-3">
          {filtered.map((p) => (
            <li key={p._id}>
              <Link to={`/projets/${p._id}`} className="ds-card block hover:border-primary/40">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <p className="font-semibold text-slate-900">{p.title}</p>
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700">
                    {PROJECT_STATUS_LABELS[p.status] ?? p.status}
                  </span>
                </div>
                <p className="ds-muted mt-1">
                  {p.type ? `${p.type} · ` : ''}
                  Chef : {p.leader?.name ?? '—'}
                  {p.team?.name ? ` · ${p.team.name}` : ''}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
