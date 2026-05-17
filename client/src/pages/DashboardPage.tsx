import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useAuth } from '../context/AuthContext';
import { ROLE_LABELS } from '../constants/roles';
import Skeleton from '../components/ui/Skeleton';
import { fetchDashboardStats, type DashboardStats } from '../services/labApi';

function StatCard({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="ds-card">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-semibold tabular-nums text-slate-900">{value}</p>
    </div>
  );
}

export default function DashboardPage() {
  const { user, loading: authLoading } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);

  useEffect(() => {
    if (authLoading || !user) return;
    let c = false;
    void (async () => {
      try {
        const s = await fetchDashboardStats();
        if (!c) setStats(s);
      } catch {
        if (!c) setStats(null);
      } finally {
        if (!c) setStatsLoading(false);
      }
    })();
    return () => {
      c = true;
    };
  }, [user, authLoading]);

  if (authLoading || !user) {
    return (
      <main className="space-y-4 text-left">
        <Skeleton className="h-9 w-64" />
        <Skeleton className="h-4 w-full max-w-xl" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-28 w-full" />
          ))}
        </div>
      </main>
    );
  }

  const globalChart =
    stats?.global != null
      ? [
          { name: 'Publications', value: stats.global.publications },
          { name: 'Projets', value: stats.global.projects },
          { name: 'Documents', value: stats.global.documents },
          { name: 'Concours ouverts', value: stats.global.openConcours },
        ]
      : [];

  return (
    <main className="flex flex-col gap-8 text-left">
      <div>
        <h1 className="ds-title-page">Accueil laboratoire</h1>
        <p className="ds-body mt-2">
          Bienvenue, <strong className="font-semibold text-slate-800">{user.name}</strong>. Rôle :{' '}
          <strong className="font-semibold text-slate-800">{ROLE_LABELS[user.role]}</strong>.
        </p>
      </div>

      {statsLoading ? (
        <Skeleton className="h-64 w-full" />
      ) : stats ? (
        <>
          <section>
            <h2 className="ds-card-title mb-4">Mon activité</h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
              <StatCard label="Mes publications" value={stats.mine.publications} />
              <StatCard label="Mes projets" value={stats.mine.projects} />
              <StatCard label="Projets dirigés" value={stats.mine.projectsLed ?? 0} />
              <StatCard label="Projets actifs" value={stats.mine.projectsActive ?? 0} />
              <StatCard label="Encadrements (directeur)" value={stats.mine.supervisionsSupervisor} />
              <StatCard label="Encadrements (doctorant)" value={stats.mine.supervisionsStudent} />
            </div>
          </section>

          {stats.role === 'super_admin' && stats.totals && (
            <section>
              <h2 className="ds-card-title mb-4">Vue administration</h2>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
                <StatCard label="Membres actifs" value={stats.totals.users} />
                <StatCard label="Publications (total)" value={stats.totals.publications} />
                <StatCard label="Projets (total)" value={stats.totals.projects} />
                <StatCard label="Projets actifs" value={stats.totals.projectsActive ?? 0} />
                <StatCard label="Documents (total)" value={stats.totals.documents} />
                <StatCard label="Concours ouverts" value={stats.totals.openConcours} />
              </div>
            </section>
          )}

          <section className="ds-card">
            <h2 className="ds-card-title mb-4">Volume global du laboratoire</h2>
            <div className="h-72 w-full min-w-0">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={globalChart} margin={{ top: 8, right: 8, left: 0, bottom: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-slate-200" />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                  <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0' }} />
                  <Bar dataKey="value" fill="var(--color-primary, #2563eb)" radius={[4, 4, 0, 0]} name="" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </section>
        </>
      ) : (
        <p className="ds-body text-error">Impossible de charger les statistiques.</p>
      )}

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Link to="/profil" className="ds-card transition-colors hover:border-primary/30 hover:shadow-md">
          <h2 className="ds-card-title">Mon profil</h2>
          <p className="ds-body mt-2">Identité, parcours, biographie, ORCID.</p>
          <span className="mt-3 inline-block text-sm font-medium text-primary">Ouvrir →</span>
        </Link>
        <Link to="/concours" className="ds-card transition-colors hover:border-primary/30 hover:shadow-md">
          <h2 className="ds-card-title">Concours</h2>
          <p className="ds-body mt-2">Examens compétitifs et promotions.</p>
          <span className="mt-3 inline-block text-sm font-medium text-primary">Voir →</span>
        </Link>
        <Link to="/publications" className="ds-card transition-colors hover:border-primary/30 hover:shadow-md">
          <h2 className="ds-card-title">Publications</h2>
          <p className="ds-body mt-2">Catalogue et ajout d’articles.</p>
          <span className="mt-3 inline-block text-sm font-medium text-primary">Voir →</span>
        </Link>
      </section>

      {user.role === 'super_admin' && (
        <p className="ds-body">
          <Link className="font-medium text-primary hover:text-primary-hover" to="/admin/membres">
            Gérer les comptes membres
          </Link>
          {' · '}
          <Link className="font-medium text-primary hover:text-primary-hover" to="/admin/grades">
            Historique des grades
          </Link>
        </p>
      )}
    </main>
  );
}
