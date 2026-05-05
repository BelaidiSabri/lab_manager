import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Breadcrumb from '../components/layout/Breadcrumb';
import Skeleton from '../components/ui/Skeleton';
import EmptyState from '../components/ui/EmptyState';
import { ROLE_LABELS } from '../constants/roles';
import { fetchMembersDirectory } from '../services/labApi';

type Row = { id: string; name: string; email: string; role: string; currentGrade?: string };

export default function MembersPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let c = false;
    void (async () => {
      try {
        const m = await fetchMembersDirectory();
        if (!c) {
          setRows(m as Row[]);
          setErr(null);
        }
      } catch {
        if (!c) setErr('Impossible de charger les membres.');
      } finally {
        if (!c) setLoading(false);
      }
    })();
    return () => {
      c = true;
    };
  }, []);

  return (
    <main className="text-left">
      <Breadcrumb items={[{ label: 'Accueil', to: '/' }, { label: 'Membres' }]} />
      <h1 className="ds-title-page mt-2">Membres du laboratoire</h1>
      <p className="ds-body mt-2">Annuaire interne — tous les comptes actifs.</p>

      {err && <p className="mt-4 text-sm font-medium text-error">{err}</p>}

      {loading ? (
        <div className="mt-8 space-y-3">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      ) : rows.length === 0 ? (
        <EmptyState title="Aucun membre" description="Aucun utilisateur actif en base." />
      ) : (
        <div className="mt-8 overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-sm">
          <table className="min-w-full divide-y divide-slate-100 text-left text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-xs font-medium uppercase tracking-wide text-slate-500">Nom</th>
                <th className="px-4 py-3 text-xs font-medium uppercase tracking-wide text-slate-500">Email</th>
                <th className="px-4 py-3 text-xs font-medium uppercase tracking-wide text-slate-500">Rôle</th>
                <th className="px-4 py-3 text-xs font-medium uppercase tracking-wide text-slate-500">Grade</th>
                <th className="px-4 py-3 text-xs font-medium uppercase tracking-wide text-slate-500"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((m) => (
                <tr key={m.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium text-slate-900">{m.name}</td>
                  <td className="px-4 py-3 text-slate-600">{m.email}</td>
                  <td className="px-4 py-3">
                    <span className="rounded-full bg-primary-light px-2 py-0.5 text-xs font-medium text-primary-hover">
                      {ROLE_LABELS[m.role as keyof typeof ROLE_LABELS] ?? m.role}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{m.currentGrade ?? '—'}</td>
                  <td className="px-4 py-3">
                    <Link to={`/membres/${m.id}`} className="font-medium text-primary hover:underline">
                      Voir
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
