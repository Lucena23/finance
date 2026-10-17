import { NavLink } from 'react-router-dom';
import { useState, useRef, useEffect } from 'react';
import { Crown, LogOut, ShieldCheck, Globe } from 'lucide-react';

import { PremiumBadge } from '@/components/plan/PremiumBadge';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/cn';

import { getNavItems } from './nav-items';

export function Header(): JSX.Element {
  const { user, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // TAREFA 28 — A aba "Aksurim" (Painel Global) só aparece para o Admin
  // Global (RN-15). A filtragem é centralizada em getNavItems().
  const items = getNavItems(user?.isGlobalAdmin === true);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [menuRef]);

  /**
   * TAREFA 9 — Logout centralizado via AuthContext.
   *
   * Antes: manipulava `localStorage` diretamente e fazia hard redirect,
   * ignorando o estado do contexto e o storage de sessão (sessionStorage).
   * Agora: delega ao `logout()` do AuthContext, que limpa token + usuário
   * do sessionStorage e zera o estado React, garantindo consistência.
   *
   * TAREFA 10 — O `logout()` agora é assíncrono: além de invalidar a sessão,
   * ele limpa o estado local de Web Push (subscription do navegador + registro
   * no backend). Aguardamos a conclusão antes do redirect para garantir que a
   * limpeza seja efetivada com o token ainda válido.
   */
  const handleLogout = async (): Promise<void> => {
    setMenuOpen(false);
    await logout();
    window.location.href = '/login';
  };

  return (
    <header className="bg-slate-950 sticky top-0 z-40 border-b border-slate-800">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between gap-4 px-4">
        {/* Marca */}
        <div className="flex items-center gap-2">
          <img
            src="/logo-full.png"
            alt="Aksurim Controle"
            className="h-6"
          />
        </div>

        {/* Navegação horizontal — visível apenas em desktop/tablet */}
        <nav
          aria-label="Navegação principal"
          className="hidden md:flex md:items-center md:gap-1"
        >
          {items.map((item) => {
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

        {/* Selo Premium + Avatar do usuário autenticado e Menu */}
        {user ? (
          <div className="flex items-center gap-2.5">
            <PremiumBadge />
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
                  <NavLink
                    to="/plans"
                    onClick={() => setMenuOpen(false)}
                    className={cn(
                      'flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm font-medium',
                      'text-foreground transition-colors mb-1',
                      'hover:bg-slate-800 hover:text-slate-50',
                      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
                    )}
                  >
                    <Crown aria-hidden="true" className="h-4 w-4 text-amber-500" />
                    Meu Plano
                  </NavLink>
                  {user.isGlobalAdmin && (
                    <NavLink
                      to="/admin"
                      onClick={() => setMenuOpen(false)}
                      className={cn(
                        'flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm font-medium',
                        'text-foreground transition-colors mb-1',
                        'hover:bg-slate-800 hover:text-slate-50',
                        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
                      )}
                    >
                      <ShieldCheck aria-hidden="true" className="h-4 w-4 text-primary" />
                      Painel Aksurim
                    </NavLink>
                  )}
                  
                  <a
                    href="/"
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => setMenuOpen(false)}
                    className={cn(
                      'flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm font-medium',
                      'text-foreground transition-colors mb-1',
                      'hover:bg-slate-800 hover:text-slate-50',
                      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
                    )}
                  >
                    <Globe aria-hidden="true" className="h-4 w-4 text-slate-400" />
                    Site Oficial
                  </a>
                  <button
                    onClick={handleLogout}
                    className={cn(
                      'flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm font-medium',
                      'text-foreground transition-colors',
                      'hover:bg-aksurim-warning/15 hover:text-aksurim-warning',
                      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-aksurim-warning focus-visible:ring-offset-2 focus-visible:ring-offset-card',
                    )}
                  >
                    <LogOut
                      aria-hidden="true"
                      className="h-4 w-4 text-aksurim-warning"
                    />
                    Sair do Sistema
                  </button>
                </div>
              )}
            </div>
          </div>
        ) : null}
      </div>
    </header>
  );
}
