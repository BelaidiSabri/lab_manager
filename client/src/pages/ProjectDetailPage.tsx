import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import Breadcrumb from '../components/layout/Breadcrumb';
import Skeleton from '../components/ui/Skeleton';
import { fetchProjectById } from '../services/labApi';

export default function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [p, setP] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    let c = false;
    void (async () => {
      try {
        const doc = await fetchProjectById(id);
        if (!c) setP(doc);
      } finally {
        if (!c) setLoading(false);
      }
    })();
    return () => {
      c = true;
    };
  }, [id]);

  if (loading || !id) return <Skeleton className="h-40 w-full" />;
  if (!p) return <p>Introuvable.</p>;

  const leader = p.leader as { name?: string; email?: string } | undefined;
  const members = (p.members as { name?: string }[]) ?? [];

  return (
    <main className="text-left">
      <Breadcrumb items={[{ label: 'Accueil', to: '/' }, { label: 'Projets', to: '/projets' }, { label: String(p.title) }]} />
      <div className="ds-card mt-6">
        <h1 className="ds-title-page">{String(p.title)}</h1>
        <p className="ds-body mt-4 whitespace-pre-wrap">{String(p.description ?? '')}</p>
        <dl className="ds-body mt-6 grid gap-3 sm:grid-cols-2">
          <div>
            <dt className="ds-muted">Statut</dt>
            <dd>{String(p.status)}</dd>
          </div>
          <div>
            <dt className="ds-muted">Chef de projet</dt>
            <dd>{leader?.name ?? '—'}</dd>
          </div>
        </dl>
        <div className="mt-6">
          <h2 className="ds-card-title">Membres</h2>
          <ul className="ds-body mt-2 list-inside list-disc">
            {members.map((m, i) => (
              <li key={i}>{m.name ?? '—'}</li>
            ))}
          </ul>
        </div>
      </div>
      <Link to="/projets" className="mt-6 inline-block text-primary">
        ← Projets
      </Link>
    </main>
  );
}
