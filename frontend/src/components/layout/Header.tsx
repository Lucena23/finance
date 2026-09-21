import { NavLink } from 'react-router-dom';
import { useState, useRef, useEffect } from 'react';
import { LogOut } from 'lucide-react';

import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/cn';

import { NAV_ITEMS } from './nav-items';

export function Header(): JSX.Element {
  const { user } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [menuRef]);

  const handleLogout = () => {
    localStorage.removeItem('aksurim.auth.token');
    localStorage.removeItem('aksurim.auth.user');
    window.location.href = '/login';
  };

  return (
    <header className="bg-slate-950 sticky top-0 z-40 border-b border-slate-800">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between gap-4 px-4">
        {/* Marca */}
        <div className="flex items-center gap-2">
          <img
            src="/logo-full.png"
            alt="Finanças Aksurim"
            className="h-6"
          />
        </div>

        {/* Navegação horizontal — visível apenas em desktop/tablet */}
        <nav
          aria-label="Navegação principal"
          className="hidden md:flex md:items-center md:gap-1"
        >
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400',
                    isActive
                      ? 'bg-slate-800 text-slate-50'
                      : 'text-slate-400 hover:bg-slate-800 hover:text-slate-50',
                  )
                }
              >
                <Icon aria-hidden="true" className="h-4 w-4" />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>

        {/* Avatar do usuário autenticado e Menu */}
        {user ? (
          <div className="relative" ref={menuRef}>
            <button
              aria-label={`Menu de usuário: ${user.name}`}
              onClick={() => setMenuOpen(!menuOpen)}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold text-slate-950 hover:opacity-80 transition-opacity focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-slate-950 shadow-[0_0_10px_rgba(217,249,36,0.3)]"
              style={{ backgroundColor: user.avatarColor || '#D9F924' }}
            >
              {user.initials}
            </button>

            {menuOpen && (
              <div className="absolute right-0 mt-2 w-48 rounded-md border border-border bg-card p-1 shadow-lg animate-in fade-in zoom-in-95 duration-200">
                <div className="px-2 py-1.5 text-sm font-medium border-b border-border mb-1 truncate text-foreground">
                  {user.name}
                </div>
                <button
                  onClick={handleLogout}
                  className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm text-destructive hover:bg-destructive/10 transition-colors"
                >
                  <LogOut className="h-4 w-4" />
                  Sair do Sistema
                </button>
              </div>
            )}
          </div>
        ) : null}
      </div>
    </header>
  );
}
