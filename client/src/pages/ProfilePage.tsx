import { useEffect, useState, type FormEvent } from 'react';
import Breadcrumb from '../components/layout/Breadcrumb';
import { isAxiosError } from 'axios';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { ROLE_LABELS } from '../constants/roles';
import { ACADEMIC_PROGRAM_LABELS } from '../constants/concours';
import { inputClass } from '../constants/formStyles';
import type { PublicUser, UserRole } from '../types/user';

type PublicationRow = { title: string; year: string; venue: string };

type ProfileDoc = {
  academicProfile?: Record<string, unknown>;
  photo?: string;
  bio?: string;
  researchAxe?: string;
  institution?: string;
  socialLinks?: { label?: string; url: string }[];
  diplomas?: { title: string; year?: number; institution?: string }[];
};

function parseStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === 'string' && item.length > 0);
}

function parsePublications(profile: Record<string, unknown>): PublicationRow[] {
  const raw = profile.publications;
  if (!Array.isArray(raw)) return [];
  return raw.map((p) => {
    const o = p as Record<string, unknown>;
    return {
      title: typeof o.title === 'string' ? o.title : '',
      year: o.year != null ? String(o.year) : '',
      venue: typeof o.venue === 'string' ? o.venue : '',
    };
  });
}

function linesToItems(text: string): string[] {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

type ProfileEditorProps = {
  initialUser: PublicUser;
  initialProfile: ProfileDoc | null;
  refreshUser: () => Promise<void>;
};

function ProfileEditor({ initialUser, initialProfile, refreshUser }: ProfileEditorProps) {
  const { toast } = useToast();
  const ap0 = (initialProfile?.academicProfile ?? {}) as Record<string, unknown>;
  const [name, setName] = useState(initialUser.name);
  const [title, setTitle] = useState(typeof ap0.title === 'string' ? ap0.title : '');
  const [department, setDepartment] = useState(typeof ap0.department === 'string' ? ap0.department : '');
  const [biography, setBiography] = useState(typeof ap0.biography === 'string' ? ap0.biography : '');
  const [orcid, setOrcid] = useState(typeof ap0.orcid === 'string' ? ap0.orcid : '');
  const [specialtiesText, setSpecialtiesText] = useState(() => parseStringArray(ap0.specialties).join('\n'));
  const [researchInterestsText, setResearchInterestsText] = useState(() =>
    parseStringArray(ap0.researchInterests).join('\n')
  );
  const [googleScholarUrl, setGoogleScholarUrl] = useState(
    typeof ap0.googleScholarUrl === 'string' ? ap0.googleScholarUrl : ''
  );
  const [researchgateUrl, setResearchgateUrl] = useState(
    typeof ap0.researchgateUrl === 'string' ? ap0.researchgateUrl : ''
  );
  const [hIndex, setHIndex] = useState(() =>
    ap0.hIndex != null && typeof ap0.hIndex === 'number' && Number.isFinite(ap0.hIndex) ? String(ap0.hIndex) : ''
  );
  const [citationCount, setCitationCount] = useState(() =>
    ap0.citationCount != null && typeof ap0.citationCount === 'number' && Number.isFinite(ap0.citationCount)
      ? String(ap0.citationCount)
      : ''
  );
  const [publications, setPublications] = useState<PublicationRow[]>(() => parsePublications(ap0));
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const textareaClass = `${inputClass} min-h-[100px] resize-y`;

  const buildAcademicPayload = () => {
    const pubs = publications
      .filter((p) => p.title.trim())
      .map((p) => {
        const yearNum = Number(p.year);
        const hasYear = p.year.trim().length > 0 && Number.isFinite(yearNum);
        return {
          title: p.title.trim(),
          ...(hasYear ? { year: yearNum } : {}),
          ...(p.venue.trim() ? { venue: p.venue.trim() } : {}),
        };
      });

    const hs = hIndex.trim();
    const cs = citationCount.trim();
    const hn = hs.length === 0 ? null : Number.parseInt(hs, 10);
    const cn = cs.length === 0 ? null : Number.parseInt(cs, 10);
    const hVal = hn === null || !Number.isFinite(hn) ? null : hn;
    const cVal = cn === null || !Number.isFinite(cn) ? null : cn;

    return {
      title: title.trim() || undefined,
      department: department.trim() || undefined,
      biography: biography.trim() || undefined,
      orcid: orcid.trim() || undefined,
      specialties: linesToItems(specialtiesText),
      researchInterests: linesToItems(researchInterestsText),
      googleScholarUrl: googleScholarUrl.trim(),
      researchgateUrl: researchgateUrl.trim(),
      hIndex: hVal,
      citationCount: cVal,
      publications: pubs,
    };
  };

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setMessage(null);
    setError(null);
    setSaving(true);
    const academicProfile = buildAcademicPayload();

    try {
      await api.patch('/users/me', {
        name: name.trim(),
        academicProfile,
      });
      setMessage('Profil enregistré.');
      toast('Profil enregistré.', 'success');
      await refreshUser();
    } catch (err) {
      if (isAxiosError(err) && err.response?.data?.error) {
        const er = err.response.data.error;
        const msg = typeof er === 'string' ? er : JSON.stringify(er);
        setError(msg);
        toast(msg, 'error');
      } else {
        setError('Enregistrement impossible.');
        toast('Enregistrement impossible.', 'error');
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      {message && (
        <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm font-medium text-green-900 dark:border-green-500/30 dark:bg-green-950/40 dark:text-green-100">
          {message}
        </div>
      )}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-900 dark:border-red-500/30 dark:bg-red-950/40 dark:text-red-100">
          {error}
        </div>
      )}

      <form className="grid w-full gap-6 lg:grid-cols-2" onSubmit={(e) => void onSubmit(e)}>
        <fieldset className="rounded-xl border border-slate-200 bg-card p-5 shadow-sm lg:col-span-2">
          <legend className="px-1 text-sm font-semibold text-zinc-900 dark:text-zinc-50">Identité</legend>
          <div className="mt-3 grid gap-4 sm:grid-cols-2">
            <label className="flex flex-col gap-1.5 text-sm font-medium text-zinc-800 dark:text-zinc-200 sm:col-span-2">
              <span>Nom complet</span>
              <input className={inputClass} value={name} onChange={(e) => setName(e.target.value)} required />
            </label>
          </div>
          <div className="mt-4 flex flex-wrap gap-3 rounded-lg bg-zinc-50 px-3 py-3 text-xs text-zinc-600 dark:bg-zinc-800/80 dark:text-zinc-400">
            <span>
              Email (lecture seule) : <strong className="text-zinc-900 dark:text-zinc-100">{initialUser.email}</strong>
            </span>
            <span aria-hidden className="text-zinc-300 dark:text-zinc-600">
              |
            </span>
            <span>
              Identifiant : <code className="rounded bg-zinc-200/80 px-1 dark:bg-zinc-900">{initialUser.id}</code>
            </span>
          </div>
        </fieldset>

        <fieldset className="rounded-xl border border-slate-200 bg-card p-5 shadow-sm lg:col-span-1">
          <legend className="px-1 text-sm font-semibold text-zinc-900 dark:text-zinc-50">Parcours & laboratoire</legend>
          <div className="mt-3 flex flex-col gap-4">
            <label className="flex flex-col gap-1.5 text-sm font-medium text-zinc-800 dark:text-zinc-200">
              <span>Titre / fonction affichée</span>
              <input className={inputClass} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Doctorant, MCF…" />
            </label>
            <label className="flex flex-col gap-1.5 text-sm font-medium text-zinc-800 dark:text-zinc-200">
              <span>Équipe, département ou axe</span>
              <input className={inputClass} value={department} onChange={(e) => setDepartment(e.target.value)} />
            </label>
            <label className="flex flex-col gap-1.5 text-sm font-medium text-zinc-800 dark:text-zinc-200">
              <span>Biographie courte</span>
              <textarea
                className={`${inputClass} min-h-[140px] resize-y`}
                value={biography}
                onChange={(e) => setBiography(e.target.value)}
                rows={4}
              />
            </label>
          </div>
        </fieldset>

        <fieldset className="rounded-xl border border-slate-200 bg-card p-5 shadow-sm lg:col-span-1">
          <legend className="px-1 text-sm font-semibold text-zinc-900 dark:text-zinc-50">Domaines de recherche</legend>
          <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-500">Une ligne = une entrée.</p>
          <div className="mt-3 flex flex-col gap-4">
            <label className="flex flex-col gap-1.5 text-sm font-medium text-zinc-800 dark:text-zinc-200">
              <span>Spécialités</span>
              <textarea
                className={textareaClass}
                value={specialtiesText}
                onChange={(e) => setSpecialtiesText(e.target.value)}
                placeholder={'Ex.\n Apprentissage automatique\n Neurosciences computationnelles'}
              />
            </label>
            <label className="flex flex-col gap-1.5 text-sm font-medium text-zinc-800 dark:text-zinc-200">
              <span>Axes d&apos;intérêt</span>
              <textarea className={textareaClass} value={researchInterestsText} onChange={(e) => setResearchInterestsText(e.target.value)} />
            </label>
          </div>
        </fieldset>

        <fieldset className="rounded-xl border border-slate-200 bg-card p-5 shadow-sm lg:col-span-1">
          <legend className="px-1 text-sm font-semibold text-zinc-900 dark:text-zinc-50">Profils externes</legend>
          <div className="mt-3 flex flex-col gap-4">
            <label className="flex flex-col gap-1.5 text-sm font-medium text-zinc-800 dark:text-zinc-200">
              <span>ORCID</span>
              <input className={inputClass} value={orcid} onChange={(e) => setOrcid(e.target.value)} placeholder="https://orcid.org/..." />
            </label>
            <label className="flex flex-col gap-1.5 text-sm font-medium text-zinc-800 dark:text-zinc-200">
              <span>Google Scholar</span>
              <input className={inputClass} value={googleScholarUrl} onChange={(e) => setGoogleScholarUrl(e.target.value)} placeholder="https://scholar.google.com/..." />
            </label>
            <label className="flex flex-col gap-1.5 text-sm font-medium text-zinc-800 dark:text-zinc-200">
              <span>ResearchGate</span>
              <input className={inputClass} value={researchgateUrl} onChange={(e) => setResearchgateUrl(e.target.value)} placeholder="https://www.researchgate.net/..." />
            </label>
          </div>
        </fieldset>

        <fieldset className="rounded-xl border border-slate-200 bg-card p-5 shadow-sm lg:col-span-1">
          <legend className="px-1 text-sm font-semibold text-zinc-900 dark:text-zinc-50">Indicateurs (aperçu)</legend>
          <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-500">Valeurs indicatives pour le laboratoire.</p>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <label className="flex flex-col gap-1.5 text-sm font-medium text-zinc-800 dark:text-zinc-200">
              <span>Indice h</span>
              <input className={inputClass} inputMode="numeric" value={hIndex} onChange={(e) => setHIndex(e.target.value.replace(/\D/g, ''))} placeholder="—" />
            </label>
            <label className="flex flex-col gap-1.5 text-sm font-medium text-zinc-800 dark:text-zinc-200">
              <span>Citations (total)</span>
              <input
                className={inputClass}
                inputMode="numeric"
                value={citationCount}
                onChange={(e) => setCitationCount(e.target.value.replace(/\D/g, ''))}
                placeholder="—"
              />
            </label>
          </div>
          <button
            type="button"
            className="mt-4 text-left text-xs text-primary underline-offset-2 hover:underline"
            onClick={() => {
              setHIndex('');
              setCitationCount('');
            }}
          >
            Effacer les indicateurs
          </button>
        </fieldset>

        <fieldset className="rounded-xl border border-slate-200 bg-card p-5 shadow-sm lg:col-span-2">
          <legend className="px-1 text-sm font-semibold text-zinc-900 dark:text-zinc-50">Publications (aperçu profil)</legend>
          <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-500">
            Liste légère en attendant le module Publication complet (auteurs croisés, DOI…).
          </p>
          <ul className="mt-4 flex flex-col gap-3">
            {publications.map((row, i) => (
              <li key={i} className="grid gap-2 rounded-lg border border-zinc-200 p-3 dark:border-zinc-700 lg:grid-cols-12">
                <label className="lg:col-span-5">
                  <span className="mb-1 block text-xs font-medium text-zinc-600 dark:text-zinc-400">Titre</span>
                  <input
                    className={inputClass}
                    value={row.title}
                    onChange={(e) => {
                      const next = [...publications];
                      next[i] = { ...next[i], title: e.target.value };
                      setPublications(next);
                    }}
                  />
                </label>
                <label className="lg:col-span-2">
                  <span className="mb-1 block text-xs font-medium text-zinc-600 dark:text-zinc-400">Année</span>
                  <input
                    className={inputClass}
                    inputMode="numeric"
                    value={row.year}
                    onChange={(e) => {
                      const next = [...publications];
                      next[i] = { ...next[i], year: e.target.value };
                      setPublications(next);
                    }}
                  />
                </label>
                <label className="lg:col-span-5">
                  <span className="mb-1 block text-xs font-medium text-zinc-600 dark:text-zinc-400">Lieu / revue</span>
                  <input
                    className={inputClass}
                    value={row.venue}
                    onChange={(e) => {
                      const next = [...publications];
                      next[i] = { ...next[i], venue: e.target.value };
                      setPublications(next);
                    }}
                  />
                </label>
                <div className="flex items-end lg:col-span-12">
                  <button
                    type="button"
                    className="text-sm font-medium text-red-600 hover:underline dark:text-red-400"
                    onClick={() => setPublications(publications.filter((_, j) => j !== i))}
                  >
                    Retirer cette entrée
                  </button>
                </div>
              </li>
            ))}
          </ul>
          <button
            type="button"
            className="ds-btn-secondary mt-3 border-dashed"
            onClick={() => setPublications([...publications, { title: '', year: '', venue: '' }])}
          >
            + Ajouter une publication
          </button>
        </fieldset>

        <div className="flex flex-wrap items-center gap-3 lg:col-span-2">
          <button
            type="submit"
            disabled={saving}
            className="ds-btn-primary px-6 disabled:opacity-60"
          >
            {saving ? 'Enregistrement…' : 'Enregistrer le profil'}
          </button>
          <span className="text-xs text-zinc-500 dark:text-zinc-500">Les changements sont enregistrés dans l&apos;audit serveur.</span>
        </div>
      </form>
    </>
  );
}

export default function ProfilePage() {
  const { user, refreshUser } = useAuth();
  const [payload, setPayload] = useState<{
    user: PublicUser;
    profile: ProfileDoc | null;
  } | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const { data } = await api.get<{ user: PublicUser; profile: ProfileDoc | null }>('/users/me');
        if (!cancelled) {
          setPayload({
            user: data.user,
            profile: data.profile,
          });
          setLoadError(null);
        }
      } catch {
        if (!cancelled) {
          setLoadError('Impossible de charger le profil.');
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (!user) {
    return null;
  }

  return (
    <main className="w-full max-w-none space-y-6 text-left">
      <Breadcrumb items={[{ label: 'Accueil', to: '/' }, { label: 'Mon profil' }]} />

      <div className="border-b border-slate-200 pb-6">
        <h1 className="ds-title-page">Mon profil</h1>
        <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <p className="ds-body max-w-2xl">
            Complétez votre identité de recherche : spécialités, liens publics et indicateurs. Le{' '}
            <strong className="font-semibold text-slate-800">{ROLE_LABELS[user.role]}</strong>
            {user.currentGrade && (
              <>
                {' '}
                · grade de carrière (concours){' '}
                <strong className="font-semibold text-slate-800">
                  {ROLE_LABELS[user.currentGrade as UserRole] ?? user.currentGrade}
                </strong>
              </>
            )}
            {user.academicProgram && user.academicProgram !== 'none' && (
              <>
                {' '}
                · parcours académique{' '}
                <strong className="font-semibold text-slate-800">{ACADEMIC_PROGRAM_LABELS[user.academicProgram]}</strong>
              </>
            )}
            {' '}
            — email attribué par l’administration.
          </p>
          <div className="shrink-0 rounded-xl border border-blue-100 bg-primary-light px-4 py-3 text-sm">
            <p className="font-medium text-slate-900">Session</p>
            <p className="ds-muted mt-1">Modifications tracées (audit serveur).</p>
          </div>
        </div>
      </div>

      {loadError && <p className="text-sm font-medium text-error">{loadError}</p>}
      {payload && (
        <ProfileEditor
          key={`${payload.user.id}-${payload.profile?.bio ?? ''}`}
          initialUser={payload.user}
          initialProfile={payload.profile}
          refreshUser={refreshUser}
        />
      )}
    </main>
  );
}
