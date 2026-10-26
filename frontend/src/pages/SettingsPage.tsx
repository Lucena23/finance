import { useState, useEffect } from 'react';
import {
  AlertTriangle,
  Crown,
  Loader2,
  Lock,
  ShieldAlert,
  Trash2,
  Users,
  UserPlus,
} from 'lucide-react';

import { InstallPrompt } from '@/components/pwa/InstallPrompt';
import { PushNotificationToggle } from '@/components/pwa/PushNotificationToggle';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { usePlan } from '@/contexts/PlanContext';
import { useAuth } from '@/hooks/useAuth';
import { ApiError, usersApi, type SafeUser } from '@/lib/api';
import { cn } from '@/lib/cn';
import { APP_VERSION, Role } from '@/lib/constants';

export function SettingsPage(): JSX.Element {
  const { user: currentUser } = useAuth();
  const { hasPremiumAccess, showGoldCue, openPremiumModal } = usePlan();
  const [users, setUsers] = useState<SafeUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [newUserName, setNewUserName] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [inviting, setInviting] = useState(false);
  const [memberToRemove, setMemberToRemove] = useState<SafeUser | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [feedbackError, setFeedbackError] = useState<string | null>(null);

  const isAdmin = currentUser?.role === Role.ADMIN;
  const secondaryMembersCount = users.filter((u) => u.role === Role.MEMBER).length;

  const fetchUsers = async () => {
    try {
      const data = await usersApi.list();
      setUsers(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchUsers();
  }, []);

  const handleToggleInvite = () => {
    if (!hasPremiumAccess) {
      openPremiumModal('MEMBERS');
      return;
    }
    setFeedbackError(null);
    setShowInviteForm(!showInviteForm);
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedbackError(null);
    try {
      setInviting(true);
      await usersApi.create({
        name: newUserName,
        email: newUserEmail,
        password: newUserPassword,
        role: Role.MEMBER,
        avatarColor:
          '#' +
          Math.floor(Math.random() * 16777215)
            .toString(16)
            .padStart(6, '0'),
      });
      setShowInviteForm(false);
      setNewUserName('');
      setNewUserEmail('');
      setNewUserPassword('');
      void fetchUsers();
    } catch (err) {
      if (err instanceof ApiError && err.status === 402) {
        setShowInviteForm(false);
        openPremiumModal('MEMBERS');
        return;
      }
      const msg = err instanceof Error ? err.message : 'Erro ao adicionar membro.';
      setFeedbackError(msg);
    } finally {
      setInviting(false);
    }
  };

  const handleConfirmRemoveMember = async (): Promise<void> => {
    if (!memberToRemove) return;
    setFeedbackError(null);
    try {
      setRemovingId(memberToRemove.id);
      await usersApi.remove(memberToRemove.id);
      setUsers((prev) => prev.filter((u) => u.id !== memberToRemove.id));
      setMemberToRemove(null);
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : 'Não foi possível remover o membro.';
      setFeedbackError(msg);
      setMemberToRemove(null);
    } finally {
      setRemovingId(null);
    }
  };

  return (
    <section className="flex flex-col gap-6 pb-8">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold tracking-tight bg-gradient-to-r from-primary to-emerald-600 bg-clip-text text-transparent">
          Configurações
        </h1>
        <p className="text-muted-foreground text-sm">
          Gerencie os membros participantes e as preferências da sua conta.
        </p>
      </div>

      <InstallPrompt />

      {/* Seção de Membros do Workspace */}
      <Card className="border-t-4 border-t-primary shadow-sm hover:shadow-md transition-all">
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between pb-2">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Users className="h-5 w-5 text-primary" /> Membros
            </CardTitle>
            <CardDescription>
              Gerencie quem tem acesso compartilhado às despesas e pode realizar pagamentos.
            </CardDescription>
          </div>
          {isAdmin ? (
            <Button
              size="sm"
              variant={showInviteForm ? 'secondary' : 'outline'}
              className={cn(
                'gap-2 font-semibold transition-colors',
                showGoldCue && !showInviteForm
                  ? 'border-amber-400 bg-gradient-to-r from-amber-500 to-yellow-500 text-slate-950 hover:brightness-105'
                  : 'hover:bg-primary hover:text-primary-foreground',
              )}
              onClick={handleToggleInvite}
            >
              {showGoldCue && !showInviteForm ? (
                <Lock className="h-3.5 w-3.5" />
              ) : (
                <UserPlus className="h-4 w-4" />
              )}
              <span>{showInviteForm ? 'Cancelar' : 'Adicionar'}</span>
              {showGoldCue && !showInviteForm && (
                <Crown className="h-3.5 w-3.5" />
              )}
            </Button>
          ) : (
            <div className="inline-flex items-center gap-1.5 rounded-full border border-border bg-muted/60 px-3 py-1 text-xs font-medium text-muted-foreground">
              <ShieldAlert className="h-3.5 w-3.5 text-primary shrink-0" />
              <span>Apenas o ADMIN pode adicionar ou remover membros</span>
            </div>
          )}
        </CardHeader>
        <CardContent>
          {feedbackError && (
            <div
              role="alert"
              className="mb-4 rounded-lg border border-rose-500/40 bg-rose-500/15 px-3 py-2.5 text-xs font-medium text-rose-300"
            >
              {feedbackError}
            </div>
          )}

          {/* Aviso de membros em modo somente leitura quando plano Free */}
          {!hasPremiumAccess && secondaryMembersCount > 0 && (
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between rounded-lg border border-amber-400/50 bg-amber-500/15 p-3 text-xs text-amber-100">
              <div className="flex items-start gap-2">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
                <div>
                  <p className="font-bold text-amber-300">
                    {isAdmin
                      ? 'Seus membros estão em modo somente leitura'
                      : 'Sua conta está em modo somente leitura'}
                  </p>
                  <p className="mt-0.5 text-amber-100/90">
                    {isAdmin
                      ? 'No plano Free, os membros convidados continuam visualizando os dados, mas não podem dar baixa em contas. Assine o 👑 Premium para liberar o acesso completo.'
                      : 'O plano Premium desta conta expirou. Peça ao titular para assinar o 👑 Premium e liberar suas ações.'}
                  </p>
                </div>
              </div>
              <Button
                type="button"
                size="sm"
                onClick={() => openPremiumModal('MEMBERS')}
                className="w-full sm:w-auto shrink-0 bg-gradient-to-r from-amber-400 to-yellow-500 text-xs font-bold text-slate-950 hover:brightness-110"
              >
                <Crown className="mr-1 h-3.5 w-3.5" />
                Assinar
              </Button>
            </div>
          )}

          {showInviteForm && (
            <form
              onSubmit={(e) => void handleInvite(e)}
              className="mb-6 p-4 bg-muted/50 rounded-lg border border-border flex flex-col gap-3"
            >
              <div className="text-sm font-semibold mb-1">Novo Membro</div>
              <input
                required
                placeholder="Nome completo"
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                value={newUserName}
                onChange={(e) => setNewUserName(e.target.value)}
              />
              <input
                required
                type="email"
                placeholder="E-mail de acesso"
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                value={newUserEmail}
                onChange={(e) => setNewUserEmail(e.target.value)}
              />
              <input
                required
                placeholder="Senha inicial"
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                value={newUserPassword}
                onChange={(e) => setNewUserPassword(e.target.value)}
                minLength={8}
              />
              <Button type="submit" size="sm" className="w-full mt-1" disabled={inviting}>
                {inviting ? 'Salvando...' : 'Salvar Membro'}
              </Button>
            </form>
          )}

          {loading ? (
            <div className="animate-pulse flex flex-col gap-2 mt-4">
              <div className="h-12 bg-muted rounded-md" />
              <div className="h-12 bg-muted rounded-md" />
            </div>
          ) : (
            <ul className="mt-4 flex flex-col gap-3">
              {users.map((user) => (
                <li
                  key={user.id}
                  className="group flex items-center justify-between gap-2 p-3 rounded-lg border border-border bg-card text-card-foreground hover:border-primary/40 hover:bg-muted/40 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-slate-950 font-bold text-sm shadow-sm"
                      style={{ backgroundColor: user.avatarColor || '#3b82f6' }}
                    >
                      {user.initials}
                    </div>
                    <div className="flex flex-col min-w-0 flex-1">
                      <span className="text-sm font-semibold text-foreground truncate">
                        {user.name}
                      </span>
                      <span className="text-xs text-muted-foreground truncate">
                        {user.email}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 whitespace-nowrap">
                    {!hasPremiumAccess && user.role === Role.MEMBER && (
                      <span className="hidden xs:inline-flex sm:inline-flex rounded-full border border-amber-400/50 bg-amber-500/15 px-2 py-0.5 text-[10px] font-bold text-amber-300">
                        Somente leitura
                      </span>
                    )}
                    <span
                      className={`text-[10px] uppercase shrink-0 font-bold px-2 py-1 rounded-full transition-colors ${
                        user.role === 'ADMIN'
                          ? 'bg-primary/15 text-primary border border-primary/30'
                          : 'bg-muted text-muted-foreground'
                      }`}
                    >
                      {user.role}
                    </span>
                    {isAdmin && user.role === Role.MEMBER && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        disabled={removingId === user.id}
                        onClick={() => {
                          setFeedbackError(null);
                          setMemberToRemove(user);
                        }}
                        aria-label={`Remover membro ${user.name}`}
                        title={`Remover ${user.name}`}
                        className="h-8 w-8 text-muted-foreground hover:bg-rose-500/15 hover:text-rose-400"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg">Notificações Inteligentes</CardTitle>
          <CardDescription>
            Configure os alertas diários para não perder nenhum vencimento.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <PushNotificationToggle />
        </CardContent>
      </Card>

      {/* Modal nativo Aksurim de confirmação de remoção de membro */}
      <div className="pt-1 text-center text-xs text-muted-foreground/70">
        Aksurim Controle <span className="font-mono font-semibold">v{APP_VERSION}</span>
      </div>
      <Dialog
        open={Boolean(memberToRemove)}
        onOpenChange={(open) => {
          if (!open && !removingId) setMemberToRemove(null);
        }}
      >
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full border border-rose-500/40 bg-rose-500/15 text-rose-400">
              <Trash2 className="h-6 w-6" />
            </div>
            <DialogTitle className="text-center text-lg font-bold">
              Remover Membro da Conta
            </DialogTitle>
            <DialogDescription className="text-center text-sm">
              Tem certeza que deseja remover o acesso de{' '}
              <strong className="text-foreground">{memberToRemove?.name}</strong>{' '}
              <span className="text-muted-foreground">({memberToRemove?.email})</span>?
            </DialogDescription>
          </DialogHeader>

          <div className="my-2 rounded-lg border border-border bg-muted/40 p-3 text-xs text-muted-foreground">
            O membro perderá o acesso imediatamente, mas todas as despesas e baixas
            registradas anteriormente permanecerão salvas no histórico da sua conta.
          </div>

          <DialogFooter className="flex-col gap-2 sm:flex-row">
            <Button
              type="button"
              variant="outline"
              disabled={Boolean(removingId)}
              onClick={() => setMemberToRemove(null)}
              className="w-full sm:w-auto"
            >
              Cancelar
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={Boolean(removingId)}
              onClick={() => void handleConfirmRemoveMember()}
              className="w-full sm:flex-1 font-semibold"
            >
              {removingId ? (
                <>
                  <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                  Removendo...
                </>
              ) : (
                <>
                  <Trash2 className="mr-1.5 h-4 w-4" />
                  Confirmar remoção
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
