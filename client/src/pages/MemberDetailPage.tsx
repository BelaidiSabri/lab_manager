import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import Breadcrumb from '../components/layout/Breadcrumb';
import Skeleton from '../components/ui/Skeleton';
import { ROLE_LABELS } from '../constants/roles';
import { fetchUserDetail } from '../services/labApi';

export default function MemberDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<{
    user: {
      id: string;
      name: string;
      email?: string;
      role: string;
      currentGrade?: string;
    };
    profile: Record<string, unknown> | null;
    supervisions?: {
      asSupervisor: { _id: string; title?: string; type?: string; supervised?: { name?: string } }[];
      asSupervised: { _id: string; title?: string; type?: string; supervisor?: { name?: string } }[];
    };
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    let c = false;
    void (async () => {
      try {
        const d = await fetchUserDetail(id, true);
        if (!c) {
          setData(d as typeof data);
          setErr(null);
        }
      } catch {
        if (!c) setErr('Membre introuvable.');
      } finally {
        if (!c) setLoading(false);
      }
    })();
    return () => {
      c = true;
    };
  }, [id]);

  if (loading || !id) {
    return (
      <main className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-24 w-full" />
      </main>
    );
  }

  if (err || !data) {
    return (
      <main>
        <p className="text-error">{err ?? 'Erreur'}</p>
        <Link to="/membres" className="mt-4 inline-block text-primary">
          Retour à la liste
        </Link>
      </main>
    );
  }

  const { user, profile, supervisions } = data;
  const bio = typeof profile?.bio === 'string' ? profile.bio : '';
  const institution = typeof profile?.institution === 'string' ? profile.institution : '';
  const researchAxe = typeof profile?.researchAxe === 'string' ? profile.researchAxe : '';

  return (
    <main className="text-left">
      <Breadcrumb
        items={[{ label: 'Accueil', to: '/' }, { label: 'Membres', to: '/membres' }, { label: user.name }]}
      />
      <div className="ds-card mt-6">
        <h1 className="ds-title-page">{user.name}</h1>
        <p className="ds-body mt-2">
          {ROLE_LABELS[user.role as keyof typeof ROLE_LABELS] ?? user.role}
          {user.currentGrade ? ` · ${user.currentGrade}` : ''}
        </p>
        {user.email && (
          <p className="ds-body mt-2">
            <a href={`mailto:${user.email}`} className="text-primary hover:underline">
              {user.email}
            </a>
          </p>
        )}
        {institution && <p className="ds-body mt-4">{institution}</p>}
        {researchAxe && <p className="ds-body mt-2">{researchAxe}</p>}
        {bio && <p className="ds-body mt-4 whitespace-pre-wrap">{bio}</p>}
      </div>

      {supervisions && (
        <div className="mt-8 grid gap-6 lg:grid-cols-2">
          <section className="ds-card">
            <h2 className="ds-card-title">Encadrements (directeur)</h2>
            <ul className="ds-body mt-3 list-inside list-disc space-y-2">
              {supervisions.asSupervisor?.length ? (
                supervisions.asSupervisor.map((s) => (
                  <li key={s._id}>
                    {(s.supervised as { name?: string } | undefined)?.name ?? '—'} — {s.title ?? s.type}
                  </li>
                ))
              ) : (
                <li>Aucune entrée</li>
              )}
            </ul>
          </section>
          <section className="ds-card">
            <h2 className="ds-card-title">Encadrements (doctorant / stagiaire)</h2>
            <ul className="ds-body mt-3 list-inside list-disc space-y-2">
              {supervisions.asSupervised?.length ? (
                supervisions.asSupervised.map((s) => (
                  <li key={s._id}>
                    {(s.supervisor as { name?: string } | undefined)?.name ?? '—'} — {s.title ?? s.type}
                  </li>
                ))
              ) : (
                <li>Aucune entrée</li>
              )}
            </ul>
          </section>
        </div>
      )}
    </main>
  );
}
