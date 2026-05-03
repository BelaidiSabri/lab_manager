import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { isAxiosError } from 'axios';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { ROLE_LABELS } from '../constants/roles';
import { inputClass } from '../constants/formStyles';
import type { PublicUser } from '../types/user';

type PublicationRow = { title: string; year: string; venue: string };

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

function syncFormFromUser(
  u: PublicUser,
  setters: {
    setFirstName: (v: string) => void;
    setLastName: (v: string) => void;
    setTitle: (v: string) => void;
    setDepartment: (v: string) => void;
    setBiography: (v: string) => void;
    setOrcid: (v: string) => void;
    setSpecialtiesText: (v: string) => void;
    setResearchInterestsText: (v: string) => void;
    setGoogleScholarUrl: (v: string) => void;
    setResearchgateUrl: (v: string) => void;
    setHIndex: (v: string) => void;
    setCitationCount: (v: string) => void;
    setPublications: (v: PublicationRow[]) => void;
  }
): void {
  const ap = (u.academicProfile ?? {}) as Record<string, unknown>;
  setters.setFirstName(u.firstName);
  setters.setLastName(u.lastName);
  setters.setTitle(typeof ap.title === 'string' ? ap.title : '');
  setters.setDepartment(typeof ap.department === 'string' ? ap.department : '');
  setters.setBiography(typeof ap.biography === 'string' ? ap.biography : '');
  setters.setOrcid(typeof ap.orcid === 'string' ? ap.orcid : '');
  setters.setSpecialtiesText(parseStringArray(ap.specialties).join('\n'));
  setters.setResearchInterestsText(parseStringArray(ap.researchInterests).join('\n'));
  setters.setGoogleScholarUrl(typeof ap.googleScholarUrl === 'string' ? ap.googleScholarUrl : '');
  setters.setResearchgateUrl(typeof ap.researchgateUrl === 'string' ? ap.researchgateUrl : '');
  setters.setHIndex(ap.hIndex != null && typeof ap.hIndex === 'number' && Number.isFinite(ap.hIndex) ? String(ap.hIndex) : '');
  setters.setCitationCount(
    ap.citationCount != null && typeof ap.citationCount === 'number' && Number.isFinite(ap.citationCount)
      ? String(ap.citationCount)
      : ''
  );
  setters.setPublications(parsePublications(ap));
}

type ProfileEditorProps = {
  user: PublicUser;
  refreshUser: () => Promise<void>;
};

function ProfileEditor({ user, refreshUser }: ProfileEditorProps) {
  const [firstName, setFirstName] = useState(user.firstName);
  const [lastName, setLastName] = useState(user.lastName);
  const ap0 = (user.academicProfile ?? {}) as Record<string, unknown>;
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
      const { data } = await api.patch<{ user: PublicUser }>('/users/me', {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        academicProfile,
      });
      setMessage('Profil enregistré.');
      syncFormFromUser(data.user, {
        setFirstName,
        setLastName,
        setTitle,
        setDepartment,
        setBiography,
        setOrcid,
        setSpecialtiesText,
        setResearchInterestsText,
        setGoogleScholarUrl,
        setResearchgateUrl,
        setHIndex,
        setCitationCount,
        setPublications,
      });
      await refreshUser();
    } catch (err) {
      if (isAxiosError(err) && err.response?.data?.error) {
        const er = err.response.data.error;
        setError(typeof er === 'string' ? er : JSON.stringify(er));
      } else {
        setError('Enregistrement impossible.');
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
        <fieldset className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/60 lg:col-span-2">
          <legend className="px-1 text-sm font-semibold text-zinc-900 dark:text-zinc-50">Identité</legend>
          <div className="mt-3 grid gap-4 sm:grid-cols-2">
            <label className="flex flex-col gap-1.5 text-sm font-medium text-zinc-800 dark:text-zinc-200">
              <span>Prénom</span>
              <input className={inputClass} value={firstName} onChange={(e) => setFirstName(e.target.value)} required />
            </label>
            <label className="flex flex-col gap-1.5 text-sm font-medium text-zinc-800 dark:text-zinc-200">
              <span>Nom</span>
              <input className={inputClass} value={lastName} onChange={(e) => setLastName(e.target.value)} required />
            </label>
          </div>
          <div className="mt-4 flex flex-wrap gap-3 rounded-lg bg-zinc-50 px-3 py-3 text-xs text-zinc-600 dark:bg-zinc-800/80 dark:text-zinc-400">
            <span>
              Email (lecture seule) : <strong className="text-zinc-900 dark:text-zinc-100">{user.email}</strong>
            </span>
            <span aria-hidden className="text-zinc-300 dark:text-zinc-600">
              |
            </span>
            <span>
              Identifiant utilisateur : <code className="rounded bg-zinc-200/80 px-1 dark:bg-zinc-900">{user.id}</code>
            </span>
          </div>
        </fieldset>

        <fieldset className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/60 lg:col-span-1">
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

        <fieldset className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/60 lg:col-span-1">
          <legend className="px-1 text-sm font-semibold text-zinc-900 dark:text-zinc-50">Domaines de recherche</legend>
          <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-500">
            Une ligne = une entrée ; aligné avec votre futur schéma <em>Member / AcademicProfile</em> unifié.
          </p>
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

        <fieldset className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/60 lg:col-span-1">
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

        <fieldset className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/60 lg:col-span-1">
          <legend className="px-1 text-sm font-semibold text-zinc-900 dark:text-zinc-50">Indicateurs (aperçu)</legend>
          <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-500">Valeurs indicatives pour le laboratoire ; à synchroniser avec les bases bibliographiques dans une évolution ultérieure.</p>
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
            className="mt-4 text-left text-xs text-violet-600 underline-offset-2 hover:underline dark:text-violet-400"
            onClick={() => {
              setHIndex('');
              setCitationCount('');
            }}
          >
            Effacer les indicateurs
          </button>
        </fieldset>

        <fieldset className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/60 lg:col-span-2">
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
            className="mt-3 rounded-lg border border-dashed border-zinc-300 px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-600 dark:text-zinc-200 dark:hover:bg-zinc-800"
            onClick={() => setPublications([...publications, { title: '', year: '', venue: '' }])}
          >
            + Ajouter une publication
          </button>
        </fieldset>

        <div className="flex flex-wrap items-center gap-3 lg:col-span-2">
          <button
            type="submit"
            disabled={saving}
            className="inline-flex justify-center rounded-lg bg-violet-600 px-6 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-60"
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

  if (!user) {
    return null;
  }

  const backBtnClass =
    'inline-flex items-center gap-2 rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm font-medium text-zinc-800 shadow-sm transition hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800';

  return (
    <main className="w-full max-w-none space-y-6 text-left">
      <div>
        <Link to="/" className={backBtnClass}>
          <span aria-hidden className="text-lg leading-none">
            ←
          </span>
          Retour à l’accueil
        </Link>
      </div>

      <div className="border-b border-zinc-200 pb-6 dark:border-zinc-800">
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50 sm:text-3xl">Mon profil</h1>
        <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <p className="max-w-2xl text-sm text-zinc-600 dark:text-zinc-400">
            Complétez votre identité de recherche : parcours, spécialités, liens publics et indicateurs. Le rôle{' '}
            <strong className="text-zinc-800 dark:text-zinc-200">{ROLE_LABELS[user.role]}</strong> et l’adresse email
            restent attribués par la direction ou l’administration.
          </p>
          <div className="shrink-0 rounded-xl border border-violet-200 bg-violet-50 px-4 py-3 text-sm dark:border-violet-500/30 dark:bg-violet-950/30">
            <p className="font-medium text-violet-950 dark:text-violet-100">Session</p>
            <p className="mt-1 text-xs text-violet-900/90 dark:text-violet-200/90">
              Modifications tracées (audit serveur).
            </p>
          </div>
        </div>
      </div>

      <ProfileEditor key={user.id} user={user} refreshUser={refreshUser} />
    </main>
  );
}
