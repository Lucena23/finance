/**
 * ProtectedRoute.tsx - Guarda de rota autenticada (TAREFA 35).
 *
 * Redireciona para /login quando não há sessão ativa. Enquanto a sessão
 * inicial ainda está sendo hidratada do storage (isLoading), renderiza um
 * estado de carregamento para evitar redirecionamentos prematuros.
 */

import { useEffect, useState } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { CheckCircle2, Mail, LogOut, RefreshCw } from 'lucide-react';

import { useAuth } from '@/hooks/useAuth';
import { authApi } from '@/lib/api';

/**
 * Envolve rotas que exigem autenticação. Utiliza <Outlet /> para renderizar
 * as rotas filhas quando o usuário está autenticado.
 */
export function ProtectedRoute(): JSX.Element {
  const { user, isAuthenticated, isLoading, logout } = useAuth();
  const location = useLocation();
  const [cooldown, setCooldown] = useState(0);
  const [resending, setResending] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = window.setInterval(() => {
      setCooldown((prev) => (prev > 1 ? prev - 1 : 0));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [cooldown]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <span className="text-muted-foreground text-sm">Carregando...</span>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    // Preserva a rota de origem para redirecionar após o login.
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  const handleResend = async (): Promise<void> => {
    if (cooldown > 0 || resending) return;
    try {
      setResending(true);
      setFeedback(null);
      const res = await authApi.resendVerification();
      setCooldown(res.cooldownSeconds > 0 ? res.cooldownSeconds : 60);
      setFeedback({ type: 'success', text: res.message });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Não foi possível reenviar o e-mail agora.';
      setFeedback({ type: 'error', text: msg });
    } finally {
      setResending(false);
    }
  };

  if (!user.isEmailVerified) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <div className="w-full max-w-md space-y-6 rounded-2xl border border-border bg-card p-8 text-center shadow-lg">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-aksurim-primary/10 text-aksurim-primary">
            <Mail size={32} />
          </div>

          <div className="space-y-2">
            <h1 className="text-2xl font-bold tracking-tight">Verifique seu e-mail</h1>
            <p className="text-sm text-muted-foreground">
              Enviamos um link de confirmação para <br />
              <strong className="text-foreground">{user.email}</strong>
            </p>
          </div>

          <p className="text-sm text-muted-foreground">
            Para acessar o sistema, clique no link que enviamos para sua caixa de entrada (verifique também a pasta de <strong>Spam / Lixo Eletrônico</strong>).
          </p>

          {feedback && (
            <div
              className={`flex items-center justify-center gap-2 rounded-lg border px-3 py-2.5 text-xs font-medium ${
                feedback.type === 'success'
                  ? 'border-emerald-500/40 bg-emerald-500/15 text-emerald-300'
                  : 'border-rose-500/40 bg-rose-500/15 text-rose-300'
              }`}
            >
              {feedback.type === 'success' && <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />}
              <span>{feedback.text}</span>
            </div>
          )}

          <div className="space-y-3 pt-2">
            <button
              onClick={async () => {
                await logout();
                window.location.href = '/login';
              }}
              className="flex w-full items-center justify-center rounded-lg bg-aksurim-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-aksurim-primary/90"
            >
              Já ativei (Fazer login novamente)
            </button>

            <button
              type="button"
              onClick={() => void handleResend()}
              disabled={cooldown > 0 || resending}
              className="flex w-full items-center justify-center gap-2 rounded-lg border border-primary/40 bg-primary/10 px-4 py-2.5 text-sm font-semibold text-primary transition-colors hover:bg-primary/20 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <RefreshCw size={15} className={resending ? 'animate-spin' : ''} />
              {resending
                ? 'Enviando novo link...'
                : cooldown > 0
                  ? `Reenviar e-mail em ${cooldown}s`
                  : 'Reenviar e-mail de ativação'}
            </button>

            <button
              onClick={() => logout()}
              className="flex w-full items-center justify-center gap-2 rounded-lg border border-border bg-transparent px-4 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            >
              <LogOut size={16} />
              Sair da conta
            </button>
          </div>
        </div>
      </div>
    );
  }

  return <Outlet />;
}
