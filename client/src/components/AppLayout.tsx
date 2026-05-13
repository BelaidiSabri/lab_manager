import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { canReviewEncadrementRequests, isStudentTrackRole, ROLE_LABELS } from '../constants/roles';
import {
  IconAward,
  IconBook,
  IconBriefcase,
  IconClipboard,
  IconFolder,
  IconHome,
  IconMenu,
  IconUser,
  IconUsers,
} from './layout/navIcons';
import NotificationBell from './NotificationBell';

const linkBase =
  'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors';
const linkInactive = 'text-slate-300 hover:bg-white/10 hover:text-white';
const linkActive = 'bg-white/10 text-white';

function SidebarNav({
  collapsed,
  onNavigate,
}: {
  collapsed: boolean;
  onNavigate?: () => void;
}) {
  const { user } = useAuth();
  const wrap = (cls: string) => (collapsed ? `${cls} justify-center px-2` : cls);

  return (
    <nav className="flex flex-col gap-1 px-2 py-4">
      <NavLink
        to="/"
        end
        onClick={onNavigate}
        className={({ isActive }) =>
          wrap(`${linkBase} ${isActive ? linkActive : linkInactive}`)
        }
        title="Accueil"
      >
        <IconHome className="h-5 w-5 shrink-0 text-slate-400" />
        {!collapsed && <span>Accueil</span>}
      </NavLink>
      <NavLink
        to="/profil"
        onClick={onNavigate}
        className={({ isActive }) =>
          wrap(`${linkBase} ${isActive ? linkActive : linkInactive}`)
        }
        title="Mon profil"
      >
        <IconUser className="h-5 w-5 shrink-0 text-slate-400" />
        {!collapsed && <span>Mon profil</span>}
      </NavLink>
      <NavLink
        to="/membres"
        onClick={onNavigate}
        className={({ isActive }) =>
          wrap(`${linkBase} ${isActive ? linkActive : linkInactive}`)
        }
        title="Annuaire"
      >
        <IconUsers className="h-5 w-5 shrink-0 text-slate-400" />
        {!collapsed && <span>Annuaire</span>}
      </NavLink>
      <NavLink
        to="/concours"
        onClick={onNavigate}
        className={({ isActive }) =>
          wrap(`${linkBase} ${isActive ? linkActive : linkInactive}`)
        }
        title="Concours"
      >
        <IconAward className="h-5 w-5 shrink-0 text-slate-400" />
        {!collapsed && <span>Concours</span>}
      </NavLink>
      <NavLink
        to="/publications"
        onClick={onNavigate}
        className={({ isActive }) =>
          wrap(`${linkBase} ${isActive ? linkActive : linkInactive}`)
        }
        title="Publications"
      >
        <IconBook className="h-5 w-5 shrink-0 text-slate-400" />
        {!collapsed && <span>Publications</span>}
      </NavLink>
      <NavLink
        to="/projets"
        onClick={onNavigate}
        className={({ isActive }) =>
          wrap(`${linkBase} ${isActive ? linkActive : linkInactive}`)
        }
        title="Projets"
      >
        <IconBriefcase className="h-5 w-5 shrink-0 text-slate-400" />
        {!collapsed && <span>Projets</span>}
      </NavLink>
      <NavLink
        to="/equipes"
        onClick={onNavigate}
        className={({ isActive }) =>
          wrap(`${linkBase} ${isActive ? linkActive : linkInactive}`)
        }
        title="Équipes"
      >
        <IconUsers className="h-5 w-5 shrink-0 text-slate-400" />
        {!collapsed && <span>Équipes</span>}
      </NavLink>
      {isStudentTrackRole(user?.role) && (
        <NavLink
          to="/encadreurs"
          onClick={onNavigate}
          className={({ isActive }) =>
            wrap(`${linkBase} ${isActive ? linkActive : linkInactive}`)
          }
          title="Encadreurs"
        >
          <IconUsers className="h-5 w-5 shrink-0 text-slate-400" />
          {!collapsed && <span>Encadreurs</span>}
        </NavLink>
      )}
      {(isStudentTrackRole(user?.role) || canReviewEncadrementRequests(user?.role)) && (
        <NavLink
          to="/mes-demandes"
          onClick={onNavigate}
          className={({ isActive }) =>
            wrap(`${linkBase} ${isActive ? linkActive : linkInactive}`)
          }
          title="Demandes"
        >
          <IconClipboard className="h-5 w-5 shrink-0 text-slate-400" />
          {!collapsed && <span>Demandes</span>}
        </NavLink>
      )}
      <NavLink
        to="/documents"
        onClick={onNavigate}
        className={({ isActive }) =>
          wrap(`${linkBase} ${isActive ? linkActive : linkInactive}`)
        }
        title="Documents"
      >
        <IconFolder className="h-5 w-5 shrink-0 text-slate-400" />
        {!collapsed && <span>Documents</span>}
      </NavLink>
      {user?.role === 'super_admin' && (
        <>
          <NavLink
            to="/admin/membres"
            onClick={onNavigate}
            className={({ isActive }) =>
              wrap(`${linkBase} ${isActive ? linkActive : linkInactive}`)
            }
            title="Comptes"
          >
            <IconUsers className="h-5 w-5 shrink-0 text-slate-400" />
            {!collapsed && <span>Comptes</span>}
          </NavLink>
          <NavLink
            to="/admin/grades"
            onClick={onNavigate}
            className={({ isActive }) =>
              wrap(`${linkBase} ${isActive ? linkActive : linkInactive}`)
            }
            title="Historique grades"
          >
            <IconClipboard className="h-5 w-5 shrink-0 text-slate-400" />
            {!collapsed && <span>Grades</span>}
          </NavLink>
        </>
      )}
    </nav>
  );
}

export default function AppLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const closeDrawer = () => setDrawerOpen(false);

  return (
    <div className="flex min-h-svh">
      {/* Desktop: full sidebar */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-60 flex-col bg-sidebar lg:flex">
        <div className="flex h-16 shrink-0 items-center border-b border-white/10 px-4">
          <span className="truncate text-sm font-semibold text-white">Laboratoire</span>
        </div>
        <SidebarNav collapsed={false} />
        <div className="mt-auto border-t border-white/10 p-4">
          <p className="truncate text-xs text-slate-400">{user?.name}</p>
          <p className="truncate text-xs text-slate-500">{user ? ROLE_LABELS[user.role] : ''}</p>
        </div>
      </aside>

      {/* Tablet: icon-only sidebar */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-16 flex-col bg-sidebar md:flex lg:hidden">
        <div className="flex h-16 shrink-0 items-center justify-center border-b border-white/10">
          <span className="text-xs font-bold text-white">L</span>
        </div>
        <SidebarNav collapsed />
      </aside>

      {/* Mobile drawer */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-slate-900/60"
            aria-label="Fermer le menu"
            onClick={closeDrawer}
          />
          <aside className="absolute inset-y-0 left-0 flex w-60 flex-col bg-sidebar shadow-xl">
            <div className="flex h-16 shrink-0 items-center justify-between border-b border-white/10 px-4">
              <span className="text-sm font-semibold text-white">Menu</span>
              <button
                type="button"
                className="rounded p-1 text-slate-400 hover:bg-white/10 hover:text-white"
                onClick={closeDrawer}
              >
                ×
              </button>
            </div>
            <SidebarNav collapsed={false} onNavigate={closeDrawer} />
            <div className="mt-auto border-t border-white/10 p-4">
              <p className="truncate text-xs text-slate-400">{user?.name}</p>
            </div>
          </aside>
        </div>
      )}

      <div className="flex min-h-svh flex-1 flex-col md:pl-16 lg:pl-60">
        <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center justify-between gap-4 border-b border-slate-200 bg-white px-4 lg:px-8">
          <div className="flex items-center gap-3">
            <button
              type="button"
              className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 md:hidden"
              onClick={() => setDrawerOpen(true)}
              aria-label="Ouvrir le menu"
            >
              <IconMenu />
            </button>
            <div className="hidden min-w-0 sm:block">
              <p className="truncate text-sm font-medium text-slate-900">{user?.name}</p>
              <p className="truncate text-xs text-fg-muted">{user ? ROLE_LABELS[user.role] : ''}</p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <NotificationBell />
            <button
              type="button"
              className="ds-btn-secondary"
              onClick={() => {
                void logout().then(() => navigate('/login', { replace: true }));
              }}
            >
              Déconnexion
            </button>
          </div>
        </header>

        <main className="flex-1 overflow-auto bg-page px-4 py-6 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
