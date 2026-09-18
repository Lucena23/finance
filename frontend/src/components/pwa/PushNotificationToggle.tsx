/**
 * PushNotificationToggle.tsx — Controle de notificações push (TAREFA 49).
 *
 * Permite ao usuário ativar/desativar as notificações de vencimento (RN-10).
 * Exibe o estado atual (suportado, permissão, subscription ativa) e trata
 * explicitamente o cenário de permissão negada, orientando o usuário a
 * reabilitar nas configurações do navegador.
 *
 * Acessibilidade:
 *  - Botão com aria-pressed refletindo o estado de ativação.
 *  - Mensagens de erro com role="alert".
 *
 * REGRA (§8.1): proibido o uso de `any`. Tipos explícitos em todo o módulo.
 */

import { Bell, BellOff } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { usePushNotifications } from '@/hooks/usePushNotifications';

/**
 * Bloco de controle das notificações push de vencimento.
 */
export function PushNotificationToggle(): JSX.Element {
  const {
    isSupported,
    permission,
    isSubscribed,
    isProcessing,
    error,
    enable,
    disable,
  } = usePushNotifications();

  const handleToggle = async (): Promise<void> => {
    if (isSubscribed) {
      await disable();
    } else {
      await enable();
    }
  };

  const isDenied = permission === 'denied';

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          {isSubscribed ? (
            <Bell aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0" />
          ) : (
            <BellOff aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0" />
          )}

          <div>
            <p className="text-sm font-medium">Notificações de vencimento</p>
            <p className="text-muted-foreground text-xs">
              Receba alertas diários de contas atrasadas, vencendo hoje e a
              vencer nos próximos dias.
            </p>
          </div>
        </div>

        <Button
          size="sm"
          variant={isSubscribed ? 'outline' : 'default'}
          aria-pressed={isSubscribed}
          disabled={!isSupported || isProcessing || isDenied}
          onClick={() => void handleToggle()}
        >
          {isSubscribed ? 'Desativar' : 'Ativar'}
        </Button>
      </div>

      {!isSupported ? (
        <p role="alert" className="text-muted-foreground text-xs">
          Este navegador não suporta notificações push.
        </p>
      ) : null}

      {isDenied ? (
        <p role="alert" className="text-destructive text-xs">
          Permissão de notificação negada. Habilite nas configurações do
          navegador para receber alertas.
        </p>
      ) : null}

      {error ? (
        <p role="alert" className="text-destructive text-xs">
          {error}
        </p>
      ) : null}
    </div>
  );
}
