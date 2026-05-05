import { useEffect, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import Breadcrumb from '../components/layout/Breadcrumb';
import Skeleton from '../components/ui/Skeleton';
import { inputClass } from '../constants/formStyles';
import { fetchPublications, searchPublications } from '../services/labApi';

type Pub = {
  _id: string;
  title: string;
  year?: number;
  journal?: string;
  authors: { name?: string }[];
};

export default function PublicationsPage() {
  const [q, setQ] = useState('');
  const [rows, setRows] = useState<Pub[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async (search?: string) => {
    if (search?.trim()) {
      const r = await searchPublications(search.trim());
      setRows(r as Pub[]);
    } else {
      const r = await fetchPublications();
      setRows(r as Pub[]);
    }
  };

  useEffect(() => {
    let c = false;
    void (async () => {
      try {
        await load();
      } finally {
        if (!c) setLoading(false);
      }
    })();
    return () => {
      c = true;
    };
  }, []);

  const onSearch = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await load(q);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="text-left">
      <Breadcrumb items={[{ label: 'Accueil', to: '/' }, { label: 'Publications' }]} />
      <div className="mt-4 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="ds-title-page">Publications</h1>
          <p className="ds-body mt-1">Catalogue laboratoire — recherche plein texte.</p>
        </div>
        <Link to="/publications/nouveau" className="ds-btn-primary">
          Nouvelle publication
        </Link>
      </div>

      <form className="mt-6 flex max-w-xl gap-2" onSubmit={(ev) => void onSearch(ev)}>
        <input
          className={inputClass}
          placeholder="Rechercher…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <button type="submit" className="ds-btn-secondary shrink-0">
          Rechercher
        </button>
      </form>

      {loading ? (
        <Skeleton className="mt-8 h-48 w-full" />
      ) : (
        <ul className="mt-8 space-y-3">
          {rows.map((p) => (
            <li key={p._id} className="ds-card">
              <p className="font-semibold text-slate-900">{p.title}</p>
              <p className="ds-muted mt-1">
                {p.year ?? '—'} · {p.journal ?? '—'} ·{' '}
                {(p.authors ?? []).map((a) => a.name).filter(Boolean).join(', ') || '—'}
              </p>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
