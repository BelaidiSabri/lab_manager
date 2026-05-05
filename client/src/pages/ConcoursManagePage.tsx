import { useCallback, useEffect, useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { isAxiosError } from 'axios';
import Breadcrumb from '../components/layout/Breadcrumb';
import Skeleton from '../components/ui/Skeleton';
import Badge from '../components/ui/Badge';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { fetchCandidatures, updateCandidature } from '../services/labApi';

type Cand = {
  _id: string;
  status: string;
  userId: { name?: string; email?: string; currentGrade?: string };
};

export default function ConcoursManagePage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { toast } = useToast();
  const [rows, setRows] = useState<Cand[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!id) return;
    const list = await fetchCandidatures(id);
    setRows(list as Cand[]);
  }, [id]);

  useEffect(() => {
    if (!id || user?.role !== 'super_admin') return;
    let c = false;
    void (async () => {
      try {
        await load();
      } catch {
        toast('Impossible de charger les candidatures.', 'error');
      } finally {
        if (!c) setLoading(false);
      }
    })();
    return () => {
      c = true;
    };
  }, [id, user?.role, toast, load]);

  if (user && user.role !== 'super_admin') {
    return <Navigate to="/" replace />;
  }

  const setStatus = async (cid: string, status: 'admitted' | 'rejected') => {
    if (!id) return;
    try {
      await updateCandidature(id, cid, { status });
      toast(status === 'admitted' ? 'Candidat admis — grade mis à jour.' : 'Candidature rejetée.', 'success');
      await load();
    } catch (err) {
      toast(isAxiosError(err) ? String(err.response?.data?.error ?? err) : 'Erreur', 'error');
    }
  };

  if (!id) return null;

  return (
    <main className="text-left">
      <Breadcrumb
        items={[
          { label: 'Accueil', to: '/' },
          { label: 'Concours', to: '/concours' },
          { label: 'Gestion', to: `/concours/${id}` },
        ]}
      />
      <h1 className="ds-title-page mt-4">Candidatures</h1>
      <p className="ds-body mt-2">Admettre ou rejeter — la promotion de grade est journalisée.</p>

      {loading ? (
        <Skeleton className="mt-8 h-32 w-full" />
      ) : (
        <div className="mt-8 overflow-x-auto rounded-lg border border-slate-200">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3 text-left">Candidat</th>
                <th className="px-4 py-3 text-left">Grade actuel</th>
                <th className="px-4 py-3 text-left">Statut</th>
                <th className="px-4 py-3 text-left">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((r) => (
                <tr key={r._id} className="hover:bg-slate-50">
                  <td className="px-4 py-3">
                    {r.userId?.name ?? '—'}{' '}
                    <span className="text-slate-500">{r.userId?.email}</span>
                  </td>
                  <td className="px-4 py-3">{r.userId?.currentGrade ?? '—'}</td>
                  <td className="px-4 py-3">
                    {r.status === 'admitted' && <Badge variant="admitted">Admis</Badge>}
                    {r.status === 'pending' && <Badge variant="pending">En attente</Badge>}
                    {r.status === 'rejected' && <Badge variant="rejected">Rejeté</Badge>}
                  </td>
                  <td className="px-4 py-3">
                    {r.status === 'pending' && (
                      <div className="flex flex-wrap gap-2">
                        <button type="button" className="ds-btn-primary text-xs py-1" onClick={() => void setStatus(r._id, 'admitted')}>
                          Admettre
                        </button>
                        <button type="button" className="ds-btn-secondary text-xs py-1" onClick={() => void setStatus(r._id, 'rejected')}>
                          Rejeter
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <Link to={`/concours/${id}`} className="mt-8 inline-block text-primary">
        ← Détail du concours
      </Link>
    </main>
  );
}
