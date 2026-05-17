import { type FormEvent, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { isAxiosError } from 'axios';
import Breadcrumb from '../components/layout/Breadcrumb';
import PublicationVisibilityFields from '../components/publications/PublicationVisibilityFields';
import Skeleton from '../components/ui/Skeleton';
import { inputClass } from '../constants/formStyles';
import {
  PUBLICATION_VISIBILITY_LABELS,
  publicationAccessRoleLabel,
  type PublicationVisibilityValue,
} from '../constants/publicationVisibility';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import {
  deletePublication,
  fetchMembersDirectory,
  fetchPublicationById,
  updatePublication,
} from '../services/labApi';

type Pub = {
  _id: string;
  title: string;
  abstract?: string;
  journal?: string;
  year?: number;
  doi?: string;
  type?: string;
  fileUrl?: string;
  keywords?: string[];
  visibility?: PublicationVisibilityValue;
  accessRoles?: string[];
  authors: { _id: string; name?: string }[];
  teamId?: { name?: string; axis?: string } | null;
};

export default function PublicationDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const [pub, setPub] = useState<Pub | null>(null);
  const [canEdit, setCanEdit] = useState(false);
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [visibility, setVisibility] = useState<PublicationVisibilityValue>('lab');
  const [accessRoles, setAccessRoles] = useState<string[]>([]);
  const [authorIds, setAuthorIds] = useState<string[]>([]);
  const [members, setMembers] = useState<{ id: string; name: string }[]>([]);
  const [userTeamName, setUserTeamName] = useState<string | null>(null);

  const load = async () => {
    if (!id) return;
    const data = await fetchPublicationById(id);
    const p = data.publication as Pub;
    setPub(p);
    setCanEdit(data.canEdit);
    setVisibility((p.visibility as PublicationVisibilityValue) ?? 'lab');
    setAccessRoles(p.accessRoles ?? []);
    setAuthorIds(p.authors.map((a) => a._id));
  };

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    void (async () => {
      try {
        await load();
        const list = await fetchMembersDirectory({ isActive: true });
        if (!cancelled) {
          setMembers(
            list.filter((m) => m.role !== 'super_admin').map((m) => ({ id: m.id, name: m.name }))
          );
          const self = list.find((m) => m.id === user?.id);
          setUserTeamName(self?.team?.name ?? null);
        }
      } catch {
        toast('Publication introuvable ou accès refusé.', 'error');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id, toast, user?.id]);

  const toggleAuthor = (memberId: string) => {
    if (memberId === user?.id) return;
    setAuthorIds((prev) =>
      prev.includes(memberId) ? prev.filter((x) => x !== memberId) : [...prev, memberId]
    );
  };

  const onSave = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!id || !pub) return;
    if (visibility === 'custom_roles' && accessRoles.length === 0) {
      toast('Sélectionnez au moins un rôle.', 'error');
      return;
    }
    const fd = new FormData(e.currentTarget);
    setSaving(true);
    try {
      await updatePublication(id, {
        title: fd.get('title'),
        abstract: fd.get('abstract'),
        journal: fd.get('journal'),
        year: fd.get('year') ? Number(fd.get('year')) : undefined,
        doi: fd.get('doi'),
        type: fd.get('type'),
        keywords: String(fd.get('keywords') ?? '')
          .split(',')
          .map((k) => k.trim())
          .filter(Boolean),
        fileUrl: fd.get('fileUrl'),
        authors: authorIds,
        visibility,
        accessRoles: visibility === 'custom_roles' ? accessRoles : [],
      });
      toast('Publication mise à jour.', 'success');
      setEditing(false);
      await load();
    } catch (err) {
      toast(isAxiosError(err) ? String(err.response?.data?.error ?? err) : 'Erreur', 'error');
    } finally {
      setSaving(false);
    }
  };

  const onDelete = async () => {
    if (!id || !pub) return;
    if (!confirm(`Supprimer « ${pub.title} » ?`)) return;
    try {
      await deletePublication(id);
      toast('Publication supprimée.', 'success');
      void navigate('/publications');
    } catch {
      toast('Suppression impossible.', 'error');
    }
  };

  if (loading || !id) return <Skeleton className="mt-8 h-48 w-full" />;
  if (!pub) return <p className="mt-8 text-sm text-slate-700">Publication introuvable.</p>;

  const visibilityLabel =
    PUBLICATION_VISIBILITY_LABELS[pub.visibility ?? 'lab'] ?? pub.visibility ?? '—';

  return (
    <main className="text-left">
      <Breadcrumb
        items={[
          { label: 'Accueil', to: '/' },
          { label: 'Publications', to: '/publications' },
          { label: pub.title },
        ]}
      />

      {!editing ? (
        <>
          <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1 className="ds-title-page">{pub.title}</h1>
              <p className="mt-2 text-sm text-slate-600">
                {pub.year ?? '—'} · {pub.journal ?? '—'} · {pub.type ?? 'article'}
              </p>
            </div>
            {canEdit && (
              <div className="flex gap-2">
                <button type="button" className="ds-btn-secondary" onClick={() => setEditing(true)}>
                  Modifier
                </button>
                <button type="button" className="ds-btn-secondary text-red-600" onClick={() => void onDelete()}>
                  Supprimer
                </button>
              </div>
            )}
          </div>

          <div className="ds-card mt-6 space-y-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Visibilité</p>
              <p className="mt-1 font-medium text-slate-900">{visibilityLabel}</p>
              {pub.teamId?.name && (
                <p className="mt-1 text-sm text-slate-600">
                  Équipe : {pub.teamId.name}
                  {pub.teamId.axis ? ` · ${pub.teamId.axis}` : ''}
                </p>
              )}
              {pub.visibility === 'custom_roles' && pub.accessRoles && pub.accessRoles.length > 0 && (
                <p className="mt-1 text-sm text-slate-600">
                  Rôles : {pub.accessRoles.map(publicationAccessRoleLabel).join(', ')}
                </p>
              )}
            </div>
            {pub.abstract && (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Résumé</p>
                <p className="mt-1 whitespace-pre-wrap text-sm text-slate-800">{pub.abstract}</p>
              </div>
            )}
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Auteurs</p>
              <p className="mt-1 text-sm text-slate-800">
                {pub.authors.map((a) => a.name).filter(Boolean).join(', ') || '—'}
              </p>
            </div>
            {pub.doi && (
              <p className="text-sm">
                <span className="font-medium text-slate-800">DOI : </span>
                <a href={`https://doi.org/${pub.doi.replace(/^https?:\/\/doi\.org\//i, '')}`} className="text-primary hover:underline" target="_blank" rel="noreferrer">
                  {pub.doi}
                </a>
              </p>
            )}
            {pub.fileUrl && (
              <p className="text-sm">
                <a href={pub.fileUrl} className="text-primary hover:underline" target="_blank" rel="noreferrer">
                  Ouvrir le document
                </a>
              </p>
            )}
          </div>
        </>
      ) : (
        <form className="mt-6 max-w-2xl space-y-6" onSubmit={(ev) => void onSave(ev)}>
          <div className="ds-card space-y-4">
            <h2 className="ds-card-title">Modifier</h2>
            <label className="block text-sm font-medium text-slate-800">
              Titre *
              <input name="title" className={inputClass} defaultValue={pub.title} required />
            </label>
            <label className="block text-sm font-medium text-slate-800">
              Résumé
              <textarea name="abstract" className={inputClass} rows={4} defaultValue={pub.abstract ?? ''} />
            </label>
            <label className="block text-sm font-medium text-slate-800">
              Revue / lieu
              <input name="journal" className={inputClass} defaultValue={pub.journal ?? ''} />
            </label>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block text-sm font-medium text-slate-800">
                Année
                <input name="year" type="number" className={inputClass} defaultValue={pub.year ?? ''} />
              </label>
              <label className="block text-sm font-medium text-slate-800">
                Type
                <select name="type" className={inputClass} defaultValue={pub.type ?? 'article'}>
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
              <input name="doi" className={inputClass} defaultValue={pub.doi ?? ''} />
            </label>
            <label className="block text-sm font-medium text-slate-800">
              Mots-clés
              <input name="keywords" className={inputClass} defaultValue={(pub.keywords ?? []).join(', ')} />
            </label>
            <label className="block text-sm font-medium text-slate-800">
              Lien fichier
              <input name="fileUrl" type="url" className={inputClass} defaultValue={pub.fileUrl ?? ''} />
            </label>
          </div>

          <div className="ds-card space-y-3">
            <h2 className="ds-card-title">Co-auteurs</h2>
            <div className="flex flex-wrap gap-2">
              {members.map((m) => (
                <label
                  key={m.id}
                  className={`inline-flex cursor-pointer items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium ${
                    authorIds.includes(m.id)
                      ? 'border-primary bg-primary-light text-slate-900'
                      : 'border-slate-200 bg-white text-slate-700'
                  }`}
                >
                  <input
                    type="checkbox"
                    className="sr-only"
                    checked={authorIds.includes(m.id)}
                    disabled={m.id === user?.id}
                    onChange={() => toggleAuthor(m.id)}
                  />
                  {m.name}
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
            <button type="submit" disabled={saving} className="ds-btn-primary">
              {saving ? 'Enregistrement…' : 'Enregistrer'}
            </button>
            <button type="button" className="ds-btn-secondary" onClick={() => setEditing(false)}>
              Annuler
            </button>
          </div>
        </form>
      )}
    </main>
  );
}
