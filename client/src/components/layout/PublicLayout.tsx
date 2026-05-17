import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { fetchPublicLabInfo, type PublicLabInfo } from '../../services/publicApi';

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  `rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
    isActive ? 'bg-primary-light text-primary' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
  }`;

export default function PublicLayout() {
  const location = useLocation();
  const [lab, setLab] = useState<PublicLabInfo | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    void fetchPublicLabInfo().then(setLab).catch(() => {
      setLab({
        labName: 'Laboratoire de recherche',
        tagline: 'Gestion des équipes, publications, projets et concours.',
        contact: { email: 'contact@lab.local', phone: '', address: '' },
      });
    });
  }, []);

  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  const labName = lab?.labName ?? 'Lab Manager';

  return (
    <div className="flex min-h-svh flex-col bg-page">
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <NavLink to="/" className="flex items-center gap-2 text-slate-900 no-underline">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-sm font-bold text-white">
              LM
            </span>
            <span className="hidden text-base font-semibold sm:inline">{labName}</span>
          </NavLink>

          <nav className="hidden items-center gap-1 md:flex" aria-label="Navigation principale">
            <NavLink to="/" end className={navLinkClass}>
              Accueil
            </NavLink>
            <NavLink to="/contact" className={navLinkClass}>
              Contact
            </NavLink>
            <NavLink to="/login" className={navLinkClass}>
              Connexion
            </NavLink>
            <NavLink
              to="/login"
              className="ml-2 inline-flex items-center rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-hover"
            >
              Espace membre
            </NavLink>
          </nav>

          <button
            type="button"
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 md:hidden"
            aria-expanded={menuOpen}
            aria-controls="public-mobile-menu"
            onClick={() => setMenuOpen((o) => !o)}
          >
            Menu
          </button>
        </div>

        {menuOpen && (
          <nav
            id="public-mobile-menu"
            className="flex flex-col gap-1 border-t border-slate-100 px-4 py-3 md:hidden"
          >
            <NavLink to="/" end className={navLinkClass}>
              Accueil
            </NavLink>
            <NavLink to="/contact" className={navLinkClass}>
              Contact
            </NavLink>
            <NavLink to="/login" className={navLinkClass}>
              Connexion
            </NavLink>
          </nav>
        )}
      </header>

      <main className="flex-1">
        <Outlet />
      </main>

      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-8 text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <p>© {new Date().getFullYear()} {labName}</p>
          <div className="flex flex-wrap gap-4">
            <NavLink to="/" className="text-slate-600 hover:text-primary">
              Accueil
            </NavLink>
            <NavLink to="/contact" className="text-slate-600 hover:text-primary">
              Contact
            </NavLink>
            <NavLink to="/login" className="text-slate-600 hover:text-primary">
              Connexion
            </NavLink>
          </div>
        </div>
      </footer>
    </div>
  );
}
