import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ROLE_LABELS } from '../constants/roles';

export default function DashboardPage() {
  const { user, loading } = useAuth();

  if (loading || !user) {
    return (
      <main className="text-left">
        <p className="text-zinc-600 dark:text-zinc-400">Chargement…</p>
      </main>
    );
  }

  return (
    <main className="flex flex-col gap-6 text-left">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">Accueil laboratoire</h1>
        <p className="mt-2 text-zinc-600 dark:text-zinc-400">
          Bienvenue, <strong className="text-zinc-800 dark:text-zinc-200">{user.firstName}</strong>. Vous êtes connecté
          en tant que <strong className="text-zinc-800 dark:text-zinc-200">{ROLE_LABELS[user.role]}</strong>. Tous les
          rôles (étudiants, enseignants-chercheurs, personnel…) utilisent le même espace : navigation en haut, profil
          personnel, puis modules métier au fil du développement.
        </p>
      </div>

      <section className="grid gap-4 sm:grid-cols-2">
        <Link
          to="/profil"
          className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm transition hover:border-violet-300 hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900/60 dark:hover:border-violet-600/50"
        >
          <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">Mon profil</h2>
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
            Identité, parcours, biographie, ORCID et publications (aperçu). Modifications tracées côté serveur.
          </p>
          <span className="mt-3 inline-block text-sm font-medium text-violet-600 dark:text-violet-400">
            Ouvrir →
          </span>
        </Link>

        <div className="rounded-xl border border-dashed border-zinc-300 bg-zinc-50/80 p-5 dark:border-zinc-600 dark:bg-zinc-900/40">
          <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">Encadrements & équipes</h2>
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">À venir : thèses, projets, axes de recherche.</p>
        </div>

        <div className="rounded-xl border border-dashed border-zinc-300 bg-zinc-50/80 p-5 dark:border-zinc-600 dark:bg-zinc-900/40">
          <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">Grades & concours</h2>
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
            À venir : dossiers, résultats, promotion uniquement après concours, historique inaltérable.
          </p>
        </div>

        <div className="rounded-xl border border-dashed border-zinc-300 bg-zinc-50/80 p-5 dark:border-zinc-600 dark:bg-zinc-900/40">
          <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">Publications & documents</h2>
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
            À venir : catalogue d’articles, recherche, espace documentaire par rôle.
          </p>
        </div>

        <div className="rounded-xl border border-dashed border-zinc-300 bg-zinc-50/80 p-5 dark:border-zinc-600 dark:bg-zinc-900/40 sm:col-span-2">
          <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">Tableau de bord analytique & IA</h2>
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
            À venir : statistiques, graphiques, chatbot, recommandations, éligibilité concours, aide rédactionnelle.
          </p>
        </div>
      </section>

      {user.role === 'administrateur' && (
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          <Link className="font-medium text-violet-600 underline-offset-2 hover:underline dark:text-violet-400" to="/admin/membres">
            Gérer les comptes membres
          </Link>
        </p>
      )}
    </main>
  );
}
