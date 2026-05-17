import { useEffect, useState } from 'react';
import { fetchPublicLabInfo, type PublicLabInfo } from '../services/publicApi';

export default function ContactPage() {
  const [lab, setLab] = useState<PublicLabInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void fetchPublicLabInfo()
      .then(setLab)
      .catch(() => {
        setLab({
          labName: 'Laboratoire de recherche',
          tagline: '',
          contact: { email: 'contact@lab.local', phone: '', address: '' },
        });
      })
      .finally(() => setLoading(false));
  }, []);

  const email = lab?.contact.email ?? 'contact@lab.local';
  const labName = lab?.labName ?? 'Laboratoire de recherche';

  return (
    <div>
      <section className="border-b border-slate-200 bg-white py-12 sm:py-16">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <p className="text-sm font-semibold uppercase tracking-wide text-primary">Contact</p>
          <h1 className="mt-2 text-3xl font-bold text-slate-900 sm:text-4xl">Nous contacter</h1>
          <p className="mt-3 max-w-2xl text-slate-600">
            Pour toute question sur les concours, l&apos;accès au portail ou l&apos;organisation du{' '}
            {labName}.
          </p>
        </div>
      </section>

      <section className="py-12 sm:py-16">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          {loading ? (
            <div className="grid gap-6 lg:grid-cols-2">
              <div className="h-48 animate-pulse rounded-xl bg-slate-200" />
              <div className="h-48 animate-pulse rounded-xl bg-slate-200" />
            </div>
          ) : (
            <div className="grid gap-8 lg:grid-cols-2">
              <div className="ds-card">
                <h2 className="ds-card-title">Coordonnées</h2>
                <ul className="mt-5 space-y-4 text-sm text-slate-600">
                  <li>
                    <span className="block font-medium text-slate-800">Email</span>
                    <a href={`mailto:${email}`} className="text-primary hover:underline">
                      {email}
                    </a>
                  </li>
                  {lab?.contact.phone ? (
                    <li>
                      <span className="block font-medium text-slate-800">Téléphone</span>
                      <a href={`tel:${lab.contact.phone}`} className="text-primary hover:underline">
                        {lab.contact.phone}
                      </a>
                    </li>
                  ) : null}
                  {lab?.contact.address ? (
                    <li>
                      <span className="block font-medium text-slate-800">Adresse</span>
                      <span className="whitespace-pre-line">{lab.contact.address}</span>
                    </li>
                  ) : null}
                </ul>
              </div>

              <div className="ds-card">
                <h2 className="ds-card-title">Écrire au laboratoire</h2>
                <p className="ds-body mt-3">
                  Utilisez votre messagerie pour nous écrire. Indiquez dans l&apos;objet s&apos;il s&apos;agit
                  d&apos;un concours, d&apos;un accès membre ou d&apos;une autre demande.
                </p>
                <a href={`mailto:${email}`} className="ds-btn-primary mt-6 inline-flex">
                  Envoyer un email
                </a>
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
