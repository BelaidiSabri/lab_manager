import { type FormEvent, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { isAxiosError } from 'axios';
import Breadcrumb from '../components/layout/Breadcrumb';
import { inputClass } from '../constants/formStyles';
import { createPublication } from '../services/labApi';
import { useToast } from '../context/ToastContext';

export default function PublicationNewPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setSubmitting(true);
    try {
      await createPublication({
        title: fd.get('title'),
        abstract: fd.get('abstract'),
        journal: fd.get('journal'),
        year: fd.get('year') ? Number(fd.get('year')) : undefined,
        doi: fd.get('doi'),
        type: fd.get('type') || 'article',
      });
      toast('Publication créée.', 'success');
      void navigate('/publications');
    } catch (err) {
      toast(isAxiosError(err) ? String(err.response?.data?.error ?? err) : 'Erreur', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="text-left">
      <Breadcrumb
        items={[{ label: 'Accueil', to: '/' }, { label: 'Publications', to: '/publications' }, { label: 'Nouveau' }]}
      />
      <h1 className="ds-title-page mt-4">Nouvelle publication</h1>
      <form className="ds-card mt-6 max-w-xl space-y-4" onSubmit={(ev) => void onSubmit(ev)}>
        <label className="block text-sm font-medium text-slate-800">
          Titre *
          <input name="title" className={inputClass} required />
        </label>
        <label className="block text-sm font-medium text-slate-800">
          Résumé
          <textarea name="abstract" className={inputClass} rows={4} />
        </label>
        <label className="block text-sm font-medium text-slate-800">
          Revue / lieu
          <input name="journal" className={inputClass} />
        </label>
        <label className="block text-sm font-medium text-slate-800">
          Année
          <input name="year" type="number" className={inputClass} />
        </label>
        <label className="block text-sm font-medium text-slate-800">
          DOI
          <input name="doi" className={inputClass} />
        </label>
        <label className="block text-sm font-medium text-slate-800">
          Type
          <select name="type" className={inputClass}>
            <option value="article">Article</option>
            <option value="conference">Conférence</option>
            <option value="book">Ouvrage</option>
            <option value="other">Autre</option>
          </select>
        </label>
        <div className="flex gap-2">
          <button type="submit" disabled={submitting} className="ds-btn-primary">
            Enregistrer
          </button>
          <Link to="/publications" className="ds-btn-secondary">
            Annuler
          </Link>
        </div>
      </form>
    </main>
  );
}
