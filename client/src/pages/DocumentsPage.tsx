import { useEffect, useState, type FormEvent } from 'react';
import { isAxiosError } from 'axios';
import Breadcrumb from '../components/layout/Breadcrumb';
import Skeleton from '../components/ui/Skeleton';
import { inputClass } from '../constants/formStyles';
import { fetchDocuments, uploadDocument, deleteDocument } from '../services/labApi';
import { useToast } from '../context/ToastContext';

type DocRow = {
  _id: string;
  title: string;
  fileUrl: string;
  category?: string;
  uploadedBy?: { name?: string };
};

export default function DocumentsPage() {
  const { toast } = useToast();
  const [rows, setRows] = useState<DocRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    const r = await fetchDocuments();
    setRows(r as DocRow[]);
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

  const onUpload = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const file = fd.get('file');
    if (!(file instanceof File) || file.size === 0) {
      toast('Choisissez un fichier.', 'warning');
      return;
    }
    try {
      await uploadDocument(fd);
      toast('Document téléversé.', 'success');
      e.currentTarget.reset();
      await load();
    } catch (err) {
      toast(isAxiosError(err) ? String(err.response?.data?.error ?? err) : 'Échec upload', 'error');
    }
  };

  const onDelete = async (id: string) => {
    if (!confirm('Supprimer ce document ?')) return;
    try {
      await deleteDocument(id);
      toast('Supprimé.', 'success');
      await load();
    } catch (err) {
      toast(isAxiosError(err) ? String(err.response?.data?.error ?? err) : 'Erreur', 'error');
    }
  };

  return (
    <main className="text-left">
      <Breadcrumb items={[{ label: 'Accueil', to: '/' }, { label: 'Documents' }]} />
      <h1 className="ds-title-page mt-4">Bibliothèque documentaire</h1>
      <p className="ds-body mt-2">Fichiers PDF ou images (10 Mo max). Visibilité selon les rôles configurés.</p>

      <form className="ds-card mt-6 max-w-lg space-y-3" onSubmit={(ev) => void onUpload(ev)}>
        <label className="block text-sm font-medium text-slate-800">
          Titre
          <input name="title" className={inputClass} />
        </label>
        <label className="block text-sm font-medium text-slate-800">
          Catégorie
          <input name="category" className={inputClass} placeholder="rapport, charte…" />
        </label>
        <label className="block text-sm font-medium text-slate-800">
          Fichier *
          <input name="file" type="file" className={inputClass} required />
        </label>
        <button type="submit" className="ds-btn-primary">
          Téléverser
        </button>
      </form>

      {loading ? (
        <Skeleton className="mt-8 h-32 w-full" />
      ) : (
        <ul className="mt-8 space-y-2">
          {rows.map((d) => (
            <li key={d._id} className="ds-card flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="font-medium text-slate-900">{d.title}</p>
                <p className="ds-muted">
                  {d.category ?? '—'} · {d.uploadedBy?.name ?? '—'}
                </p>
              </div>
              <div className="flex gap-2">
                <a href={d.fileUrl} target="_blank" rel="noreferrer" className="ds-btn-secondary">
                  Ouvrir
                </a>
                <button type="button" className="text-sm text-error hover:underline" onClick={() => void onDelete(d._id)}>
                  Supprimer
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
