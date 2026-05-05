import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Breadcrumb from '../components/layout/Breadcrumb';
import Skeleton from '../components/ui/Skeleton';
import { fetchProjects } from '../services/labApi';

type Proj = {
  _id: string;
  title: string;
  status: string;
  leader?: { name?: string };
};

export default function ProjectsPage() {
  const [rows, setRows] = useState<Proj[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let c = false;
    void (async () => {
      try {
        const r = await fetchProjects();
        if (!c) setRows(r as Proj[]);
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
      <Breadcrumb items={[{ label: 'Accueil', to: '/' }, { label: 'Projets' }]} />
      <h1 className="ds-title-page mt-4">Projets</h1>
      {loading ? (
        <Skeleton className="mt-8 h-40 w-full" />
      ) : (
        <ul className="mt-8 space-y-3">
          {rows.map((p) => (
            <li key={p._id} className="ds-card flex justify-between gap-4">
              <div>
                <p className="font-semibold text-slate-900">{p.title}</p>
                <p className="ds-muted mt-1">
                  {p.status} · chef : {p.leader?.name ?? '—'}
                </p>
              </div>
              <Link to={`/projets/${p._id}`} className="ds-btn-secondary shrink-0">
                Détail
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
