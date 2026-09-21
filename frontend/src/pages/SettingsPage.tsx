import { InstallPrompt } from '@/components/pwa/InstallPrompt';
import { PushNotificationToggle } from '@/components/pwa/PushNotificationToggle';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Users, UserPlus } from 'lucide-react';
import { useState, useEffect } from 'react';
import { usersApi } from '@/lib/api';

export function SettingsPage(): JSX.Element {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [newUserName, setNewUserName] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [inviting, setInviting] = useState(false);

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
    fetchUsers();
  }, []);

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setInviting(true);
      await usersApi.create({
        name: newUserName,
        email: newUserEmail,
        password: newUserPassword,
        role: 'MEMBER',
        avatarColor: '#' + Math.floor(Math.random()*16777215).toString(16).padStart(6, '0'),
      });
      setShowInviteForm(false);
      setNewUserName('');
      setNewUserEmail('');
      setNewUserPassword('');
      fetchUsers();
    } catch (err: any) {
      alert(err.message || 'Erro ao adicionar membro');
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
          Gerencie o acesso e as preferências do seu workspace familiar.
        </p>
      </div>

      <InstallPrompt />

      {/* Seção de Membros do Workspace */}
      <Card className="border-t-4 border-t-primary shadow-sm hover:shadow-md transition-all">
        <CardHeader className="flex flex-row items-start justify-between pb-2">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Users className="h-5 w-5 text-primary" /> Membros da Família
            </CardTitle>
            <CardDescription>
              Gerencie quem tem acesso às despesas e pode realizar pagamentos.
            </CardDescription>
          </div>
          <Button 
            size="sm" 
            variant={showInviteForm ? "secondary" : "outline"}
            className="gap-2 font-semibold hover:bg-primary hover:text-primary-foreground transition-colors" 
            onClick={() => setShowInviteForm(!showInviteForm)}
          >
            <UserPlus className="h-4 w-4" /> {showInviteForm ? 'Cancelar' : 'Adicionar'}
          </Button>
        </CardHeader>
        <CardContent>
          {showInviteForm && (
            <form onSubmit={handleInvite} className="mb-6 p-4 bg-muted/50 rounded-lg border border-border flex flex-col gap-3">
              <div className="text-sm font-semibold mb-1">Novo Membro</div>
              <input 
                required 
                placeholder="Nome completo" 
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                value={newUserName}
                onChange={e => setNewUserName(e.target.value)}
              />
              <input 
                required 
                type="email"
                placeholder="E-mail de acesso" 
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                value={newUserEmail}
                onChange={e => setNewUserEmail(e.target.value)}
              />
              <input 
                required 
                type="password"
                placeholder="Senha inicial" 
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                value={newUserPassword}
                onChange={e => setNewUserPassword(e.target.value)}
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
              {users.map(user => (
                <li key={user.id} className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent transition-colors">
                  <div className="flex items-center gap-3">
                    <div 
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-white font-bold text-sm shadow-sm"
                      style={{ backgroundColor: user.avatarColor || '#3b82f6' }}
                    >
                      {user.initials}
                    </div>
                    <div className="flex flex-col">
                      <span className="text-sm font-semibold text-foreground">{user.name}</span>
                      <span className="text-xs text-muted-foreground">{user.email}</span>
                    </div>
                  </div>
                  <div>
                    <span className={`text-[10px] uppercase font-bold px-2 py-1 rounded-full ${user.role === 'ADMIN' ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>
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
