import { InstallPrompt } from '@/components/pwa/InstallPrompt';
import { PushNotificationToggle } from '@/components/pwa/PushNotificationToggle';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { usePlan } from '@/contexts/PlanContext';
import { useAuth } from '@/hooks/useAuth';
import { ApiError, usersApi, type SafeUser } from '@/lib/api';
import { cn } from '@/lib/cn';
import { Role } from '@/lib/constants';
import { AlertTriangle, Crown, Lock, Users, UserPlus } from 'lucide-react';
import { useState, useEffect } from 'react';

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
    setShowInviteForm(!showInviteForm);
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
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
      const msg = err instanceof Error ? err.message : 'Erro ao adicionar membro';
      alert(msg);
    } finally {
      setInviting(false);
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
        <CardHeader className="flex flex-row items-start justify-between pb-2">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Users className="h-5 w-5 text-primary" /> Membros
            </CardTitle>
            <CardDescription>
              Gerencie quem tem acesso compartilhado às despesas e pode realizar pagamentos.
            </CardDescription>
          </div>
          {isAdmin && (
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
          )}
        </CardHeader>
        <CardContent>
          {/* Aviso de membros em modo somente leitura quando plano Free */}
          {!hasPremiumAccess && secondaryMembersCount > 0 && (
            <div className="mb-4 flex items-start justify-between gap-3 rounded-lg border border-amber-400/50 bg-amber-500/15 p-3 text-xs text-amber-100">
              <div className="flex items-start gap-2">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
                <div>
                  <p className="font-bold text-amber-300">
                    { isAdmin
                      ? 'Seus membros estão em modo somente leitura'
                      : 'Sua conta está em modo somente leitura' }
                  </p>
                  <p className="mt-0.5 text-amber-100/90">
                    { isAdmin
                      ? 'No plano Free, os membros convidados continuam visualizando os dados, mas não podem dar baixa em contas. Assine o 👑 Premium para liberar o acesso completo.'
                      : 'O plano Premium desta conta expirou. Peça ao titular para assinar o 👑 Premium e liberar suas ações.' }
                  </p>
                </div>
              </div>
              <Button
                type="button"
                size="sm"
                onClick={() => openPremiumModal('MEMBERS')}
                className="shrink-0 bg-gradient-to-r from-amber-400 to-yellow-500 text-xs font-bold text-slate-950 hover:brightness-110"
              >
                <Crown className="mr-1 h-3.5 w-3.5" />
                Assinar
              </Button>
            </div>
          )}

          {showInviteForm && (
            <form onSubmit={handleInvite} className="mb-6 p-4 bg-muted/50 rounded-lg border border-border flex flex-col gap-3">
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
                  className="group flex items-center justify-between p-3 rounded-lg border bg-card text-card-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-slate-950 font-bold text-sm shadow-sm"
                      style={{ backgroundColor: user.avatarColor || '#3b82f6' }}
                    >
                      {user.initials}
                    </div>
                    <div className="flex flex-col min-w-0 flex-1">
                      <span className="text-sm font-semibold text-foreground group-hover:text-accent-foreground transition-colors truncate">
                        {user.name}
                      </span>
                      <span className="text-xs text-muted-foreground group-hover:text-accent-foreground/80 transition-colors truncate">
                        {user.email}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 whitespace-nowrap">
                    {!hasPremiumAccess && user.role === Role.MEMBER && (
                      <span className="rounded-full border border-amber-400/50 bg-amber-500/15 px-2 py-0.5 text-[10px] font-bold text-amber-300">
                        Somente leitura
                      </span>
                    )}
                    <span
                      className={`text-[10px] uppercase shrink-0 font-bold px-2 py-1 rounded-full transition-colors ${
                        user.role === 'ADMIN'
                          ? 'bg-primary/10 text-primary group-hover:bg-primary/20 group-hover:text-primary'
                          : 'bg-muted text-muted-foreground group-hover:bg-black/10 group-hover:text-accent-foreground/80'
                      }`}
                    >
                      {user.role}
                    </span>
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
    </section>
  );
}
