/**
 * SettingsPage.tsx — Configurações do workspace (TAREFA 37 / TAREFA 49).
 *
 * Reúne as preferências do núcleo familiar. Nesta etapa expõe:
 *  - Instalação da PWA na tela inicial (InstallPrompt — TAREFA 49).
 *  - Ativação/desativação das notificações push de vencimento
 *    (PushNotificationToggle — TAREFA 49).
 *
 * A gestão de membros e demais preferências são implementadas nas tarefas
 * subsequentes.
 *
 * REGRA (§8.1): proibido o uso de `any`. Tipos explícitos em todo o módulo.
 */

import { InstallPrompt } from '@/components/pwa/InstallPrompt';
import { PushNotificationToggle } from '@/components/pwa/PushNotificationToggle';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

/**
 * Página de Configurações (rota "/settings").
 */
export function SettingsPage(): JSX.Element {
  return (
    <section className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-xl font-bold tracking-tight">Configurações</h1>
        <p className="text-muted-foreground text-sm">
          Notificações push e preferências do workspace familiar.
        </p>
      </div>

      {/* Convite de instalação da PWA (só aparece quando disponível) */}
      <InstallPrompt />

      <Card>
        <CardHeader>
          <CardTitle>Notificações</CardTitle>
          <CardDescription>
            Configure os alertas de vencimento enviados diariamente.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <PushNotificationToggle />
        </CardContent>
      </Card>
    </section>
  );
}
