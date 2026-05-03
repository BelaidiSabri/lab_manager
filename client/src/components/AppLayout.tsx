import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ROLE_LABELS } from '../constants/roles';

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  [
    'rounded-lg px-3 py-2 text-sm font-medium transition',
    isActive
      ? 'bg-violet-100 text-violet-900 dark:bg-violet-950/80 dark:text-violet-100'
      : 'text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800',
  ].join(' ');

export default function AppLayout() {
  const { user, logout } = useAuth();

  return (
    <div className="flex min-h-svh flex-col gap-6">
      <header className="flex flex-col gap-4 border-b border-zinc-200 pb-4 dark:border-zinc-800 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="truncate text-sm text-zinc-500 dark:text-zinc-400">
            {user?.firstName} {user?.lastName} · {user ? ROLE_LABELS[user.role] : ''}
          </p>
          <p className="text-xs text-zinc-500 dark:text-zinc-500">Espace connecté — tous les rôles du laboratoire</p>
        </div>
        <nav className="flex flex-wrap items-center gap-2">
          <NavLink to="/" end className={navLinkClass}>
            Accueil
          </NavLink>
          <NavLink to="/profil" className={navLinkClass}>
            Mon profil
          </NavLink>
          {user?.role === 'administrateur' && (
            <NavLink to="/admin/membres" className={navLinkClass}>
              Membres
            </NavLink>
          )}
          <button
            type="button"
            onClick={() => logout()}
            className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm font-medium text-zinc-800 shadow-sm hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800"
          >
            Déconnexion
          </button>
        </nav>
      </header>
      <Outlet />
    </div>
  );
}
