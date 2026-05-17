import { useEffect, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ROLE_LABELS } from '../constants/roles';
import { CONCOURS_STATUS_LABELS } from '../constants/concours';
import { formatDateDMY } from '../lib/formatDate';
import {
  fetchPublicConcours,
  fetchPublicLabInfo,
  type PublicConcours,
  type PublicLabInfo,
} from '../services/publicApi';

function ConcoursStatusBadge({ status }: { status: PublicConcours['status'] }) {
  const styles =
    status === 'open'
      ? 'bg-emerald-50 text-emerald-700 ring-emerald-600/20'
      : status === 'closed'
        ? 'bg-amber-50 text-amber-800 ring-amber-600/20'
        : 'bg-slate-100 text-slate-600 ring-slate-500/20';
  return (
    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${styles}`}>
      {CONCOURS_STATUS_LABELS[status]}
    </span>
  );
}

export default function LandingPage() {
  const { user, loading: authLoading } = useAuth();
  const [lab, setLab] = useState<PublicLabInfo | null>(null);
  const [concours, setConcours] = useState<PublicConcours[]>([]);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    void Promise.all([fetchPublicLabInfo(), fetchPublicConcours()])
      .then(([info, rows]) => {
        setLab(info);
        setConcours(rows);
      })
      .catch(() => setLoadError(true));
  }, []);

  if (!authLoading && user) {
    return <Navigate to="/dashboard" replace />;
  }

  const openConcours = concours.filter((c) => c.status === 'open');
  const otherConcours = concours.filter((c) => c.status !== 'open').slice(0, 6);
  const labName = lab?.labName ?? 'Laboratoire de recherche';
  const tagline = lab?.tagline ?? 'Plateforme de gestion du laboratoire.';

  return (
    <div>
      <section className="relative overflow-hidden border-b border-slate-200 bg-gradient-to-br from-primary-light via-white to-page">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
          <p className="text-sm font-semibold uppercase tracking-wide text-primary">Portail public</p>
          <h1 className="mt-3 max-w-2xl text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">
            {labName}
          </h1>
          <p className="mt-4 max-w-xl text-lg text-slate-600">{tagline}</p>
        </div>
      </section>

      <section className="border-b border-slate-200 bg-white py-14">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <h2 className="ds-title-page text-center">Au sein du laboratoire</h2>
          <p className="mx-auto mt-2 max-w-2xl text-center text-slate-600">
            L&apos;espace membre centralise la vie du labo : équipes, publications, projets de recherche et
            concours de carrière.
          </p>
          <ul className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {[
              {
                title: 'Concours',
                text: 'Appels ouverts, candidatures et suivi des promotions académiques.',
              },
              {
                title: 'Équipes',
                text: 'Organisation des équipes et collaborations inter-équipes.',
              },
              {
                title: 'Publications',
                text: 'Répertoire des productions scientifiques du laboratoire.',
              },
              {
                title: 'Projets',
                text: 'Projets de recherche, membres associés et livrables.',
              },
            ].map((item) => (
              <li key={item.title} className="ds-card">
                <h3 className="ds-card-title">{item.title}</h3>
                <p className="ds-body mt-2">{item.text}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section id="actualites" className="py-14">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <h2 className="ds-title-page">Actualités — concours</h2>
          <p className="ds-body mt-2">
            Les appels ouverts et récents. Connectez-vous pour déposer une candidature ou consulter le détail.
          </p>

          {loadError && (
            <p className="mt-6 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              Impossible de charger les concours pour le moment. Réessayez plus tard ou contactez
              l&apos;administration.
            </p>
          )}

          {!loadError && openConcours.length > 0 && (
            <div className="mt-8">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-emerald-700">Appels ouverts</h3>
              <ul className="mt-4 grid gap-4 sm:grid-cols-2">
                {openConcours.map((c) => (
                  <li key={c._id} className="ds-card border-emerald-100">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <h4 className="font-semibold text-slate-900">{c.title}</h4>
                      <ConcoursStatusBadge status={c.status} />
                    </div>
                    {c.description && <p className="ds-body mt-2 line-clamp-3">{c.description}</p>}
                    <dl className="mt-4 space-y-1 text-xs text-slate-500">
                      <div>
                        <dt className="inline font-medium text-slate-700">Grade visé : </dt>
                        <dd className="inline">
                          {ROLE_LABELS[c.targetGrade as keyof typeof ROLE_LABELS] ?? c.targetGrade}
                        </dd>
                      </div>
                      {c.department && (
                        <div>
                          <dt className="inline font-medium text-slate-700">Département : </dt>
                          <dd className="inline">{c.department}</dd>
                        </div>
                      )}
                      <div>
                        <dt className="inline font-medium text-slate-700">Clôture : </dt>
                        <dd className="inline">{formatDateDMY(c.endDate)}</dd>
                      </div>
                    </dl>
                    <Link to="/login" className="mt-4 inline-block text-sm font-medium text-primary hover:underline">
                      Se connecter pour candidater →
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {!loadError && openConcours.length === 0 && concours.length === 0 && (
            <p className="mt-6 ds-card text-slate-600">Aucun concours publié pour le moment.</p>
          )}

          {!loadError && openConcours.length === 0 && concours.length > 0 && (
            <p className="mt-6 text-sm text-slate-600">Aucun appel ouvert actuellement.</p>
          )}

          {!loadError && otherConcours.length > 0 && (
            <div className="mt-10">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Autres concours récents</h3>
              <ul className="mt-4 divide-y divide-slate-200 rounded-xl border border-slate-200 bg-white">
                {otherConcours.map((c) => (
                  <li key={c._id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-5">
                    <div>
                      <p className="font-medium text-slate-900">{c.title}</p>
                      <p className="text-xs text-slate-500">
                        {ROLE_LABELS[c.targetGrade as keyof typeof ROLE_LABELS] ?? c.targetGrade}
                        {' · '}
                        clôture {formatDateDMY(c.endDate)}
                      </p>
                    </div>
                    <ConcoursStatusBadge status={c.status} />
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </section>

      <section className="border-t border-slate-200 bg-white py-14">
        <div className="mx-auto max-w-6xl px-4 text-center sm:px-6">
          <h2 className="ds-title-page">Une question ?</h2>
          <p className="mx-auto mt-2 max-w-xl text-slate-600">
            Concours, accès au portail ou organisation du laboratoire — notre page contact regroupe toutes les
            coordonnées.
          </p>
          <Link to="/contact" className="ds-btn-secondary mt-6 inline-flex px-6 py-2.5">
            Page contact
          </Link>
        </div>
      </section>
    </div>
  );
}
