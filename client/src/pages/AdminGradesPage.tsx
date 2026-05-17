import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import Breadcrumb from '../components/layout/Breadcrumb';
import Skeleton from '../components/ui/Skeleton';
import { useAuth } from '../context/AuthContext';
import { fetchGradeHistory } from '../services/labApi';
import { formatDateDMY } from '../lib/formatDate';

type Row = {
  _id: string;
  oldGrade: string;
  newGrade: string;
  changedAt: string;
  userId?: { name?: string };
  concoursId?: { title?: string };
  changedBy?: { name?: string };
};

export default function AdminGradesPage() {
  const { user } = useAuth();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.role !== 'super_admin') return;
    let c = false;
    void (async () => {
      try {
        const h = await fetchGradeHistory();
        if (!c) setRows(h as Row[]);
      } finally {
        if (!c) setLoading(false);
      }
    })();
    return () => {
      c = true;
    };
  }, [user?.role]);

  if (user && user.role !== 'super_admin') {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <main className="text-left">
      <Breadcrumb items={[{ label: 'Accueil', to: '/' }, { label: 'Historique des grades' }]} />
      <h1 className="ds-title-page mt-4">Historique des grades</h1>
      <p className="ds-body mt-2">Promotions suite aux concours (audit).</p>

      {loading ? (
        <Skeleton className="mt-8 h-48 w-full" />
      ) : (
        <div className="mt-8 overflow-x-auto rounded-lg border border-slate-200">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3 text-left">Date</th>
                <th className="px-4 py-3 text-left">Membre</th>
                <th className="px-4 py-3 text-left">Ancien → nouveau</th>
                <th className="px-4 py-3 text-left">Concours</th>
                <th className="px-4 py-3 text-left">Par</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((r) => (
                <tr key={r._id}>
                  <td className="px-4 py-3 tabular-nums">{formatDateDMY(r.changedAt)}</td>
                  <td className="px-4 py-3">{r.userId?.name ?? '—'}</td>
                  <td className="px-4 py-3">
                    {r.oldGrade} → {r.newGrade}
                  </td>
                  <td className="px-4 py-3">{(r.concoursId as { title?: string })?.title ?? '—'}</td>
                  <td className="px-4 py-3">{r.changedBy?.name ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
