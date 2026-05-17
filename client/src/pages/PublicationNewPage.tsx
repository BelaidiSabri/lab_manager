import { type FormEvent, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { isAxiosError } from 'axios';
import Breadcrumb from '../components/layout/Breadcrumb';
import PublicationVisibilityFields from '../components/publications/PublicationVisibilityFields';
import { inputClass } from '../constants/formStyles';
import type { PublicationVisibilityValue } from '../constants/publicationVisibility';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { createPublication, fetchMembersDirectory } from '../services/labApi';

export default function PublicationNewPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const [submitting, setSubmitting] = useState(false);
  const [visibility, setVisibility] = useState<PublicationVisibilityValue>('lab');
  const [accessRoles, setAccessRoles] = useState<string[]>([]);
  const [authorIds, setAuthorIds] = useState<string[]>([]);
  const [members, setMembers] = useState<{ id: string; name: string }[]>([]);
  const [userTeamName, setUserTeamName] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.id) return;
    setAuthorIds([user.id]);
    void (async () => {
      try {
        const list = await fetchMembersDirectory({ isActive: true });
        setMembers(
          list
            .filter((m) => m.role !== 'super_admin')
            .map((m) => ({ id: m.id, name: m.name }))
        );
        const self = list.find((m) => m.id === user.id);
        setUserTeamName(self?.team?.name ?? null);
      } catch {
        /* optional */
      }
    })();
  }, [user?.id]);

  const toggleAuthor = (id: string) => {
    if (id === user?.id) return;
    setAuthorIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    if (visibility === 'custom_roles' && accessRoles.length === 0) {
      toast('Sélectionnez au moins un rôle pour la visibilité personnalisée.', 'error');
      return;
    }
    setSubmitting(true);
    try {
      await createPublication({
        title: fd.get('title'),
        abstract: fd.get('abstract'),
        journal: fd.get('journal'),
        year: fd.get('year') ? Number(fd.get('year')) : undefined,
        doi: fd.get('doi'),
        type: fd.get('type') || 'article',
        keywords: String(fd.get('keywords') ?? '')
          .split(',')
          .map((k) => k.trim())
          .filter(Boolean),
        fileUrl: fd.get('fileUrl'),
        authors: authorIds,
        visibility,
        accessRoles: visibility === 'custom_roles' ? accessRoles : [],
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
      <p className="ds-body mt-1">Définissez la visibilité : seuls les personnes autorisées verront la fiche dans le catalogue.</p>

      <form className="mt-6 max-w-2xl space-y-6" onSubmit={(ev) => void onSubmit(ev)}>
        <div className="ds-card space-y-4">
          <h2 className="ds-card-title">Informations</h2>
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
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-sm font-medium text-slate-800">
              Année
              <input name="year" type="number" className={inputClass} />
            </label>
            <label className="block text-sm font-medium text-slate-800">
              Type
              <select name="type" className={inputClass} defaultValue="article">
                <option value="article">Article</option>
                <option value="conference">Conférence</option>
                <option value="book">Ouvrage</option>
                <option value="chapter">Chapitre</option>
                <option value="preprint">Prépublication</option>
                <option value="other">Autre</option>
              </select>
            </label>
          </div>
          <label className="block text-sm font-medium text-slate-800">
            DOI
            <input name="doi" className={inputClass} />
          </label>
          <label className="block text-sm font-medium text-slate-800">
            Mots-clés (séparés par des virgules)
            <input name="keywords" className={inputClass} placeholder="machine learning, biologie…" />
          </label>
          <label className="block text-sm font-medium text-slate-800">
            Lien PDF / fichier
            <input name="fileUrl" type="url" className={inputClass} placeholder="https://…" />
          </label>
        </div>

        <div className="ds-card space-y-3">
          <h2 className="ds-card-title">Co-auteurs (membres du labo)</h2>
          <p className="text-xs text-slate-600">Vous êtes toujours co-auteur. Les co-auteurs voient la publication même en visibilité restreinte.</p>
          <div className="flex flex-wrap gap-2">
            {members.map((m) => (
              <label
                key={m.id}
                className={`inline-flex cursor-pointer items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium ${
                  authorIds.includes(m.id)
                    ? 'border-primary bg-primary-light text-slate-900'
                    : 'border-slate-200 bg-white text-slate-700'
                } ${m.id === user?.id ? 'opacity-80' : ''}`}
              >
                <input
                  type="checkbox"
                  className="sr-only"
                  checked={authorIds.includes(m.id)}
                  disabled={m.id === user?.id}
                  onChange={() => toggleAuthor(m.id)}
                />
                {m.name}
                {m.id === user?.id ? ' (vous)' : ''}
              </label>
            ))}
          </div>
        </div>

        <PublicationVisibilityFields
          visibility={visibility}
          onVisibilityChange={setVisibility}
          accessRoles={accessRoles}
          onAccessRolesChange={setAccessRoles}
          userTeamName={userTeamName}
        />

        <div className="flex gap-2">
          <button type="submit" disabled={submitting} className="ds-btn-primary">
            {submitting ? 'Enregistrement…' : 'Enregistrer'}
          </button>
          <Link to="/publications" className="ds-btn-secondary">
            Annuler
          </Link>
        </div>
      </form>
    </main>
  );
}
