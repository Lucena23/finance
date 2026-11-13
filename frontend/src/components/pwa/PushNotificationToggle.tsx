import { useEffect, useState } from 'react';
import { Bell, BellOff, Info, Sparkles } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { notificationsApi } from '@/lib/api';
import { isStandalone } from '@/lib/pwa';

/**
 * Bloco de controle das notificações push e preferências de comunicados (v1.3.1).
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

  const [systemUpdates, setSystemUpdates] = useState<boolean>(true);
  const [loadingPrefs, setLoadingPrefs] = useState<boolean>(false);

  useEffect(() => {
    let mounted = true;
    void (async (): Promise<void> => {
      try {
        const prefs = await notificationsApi.getPreferences();
        if (mounted) {
          setSystemUpdates(prefs.systemUpdates);
        }
      } catch {
        // ignora se offline
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const handleToggle = async (): Promise<void> => {
    if (isSubscribed) {
      await disable();
    } else {
      await enable();
    }
  };

  const handleToggleSystemUpdates = async (): Promise<void> => {
    setLoadingPrefs(true);
    const nextVal = !systemUpdates;
    setSystemUpdates(nextVal);
    try {
      await notificationsApi.updatePreferences({ systemUpdates: nextVal });
    } catch {
      setSystemUpdates(!nextVal); // reverte em caso de erro
    } finally {
      setLoadingPrefs(false);
    }
  };

  const isDenied = permission === 'denied';
  const isIos =
    typeof navigator !== 'undefined' &&
    /iPad|iPhone|iPod/.test(navigator.userAgent) &&
    !(window as unknown as { MSStream?: unknown }).MSStream;
  const showIosTip = isIos && !isStandalone() && !isSubscribed;

  return (
    <div className="flex flex-col gap-4">
      {/* Notificações Principais (Push) */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          {isSubscribed ? (
            <Bell aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0 text-emerald-400" />
          ) : (
            <BellOff aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" />
          )}

          <div>
            <p className="text-sm font-medium text-foreground">
              Notificações no Dispositivo (Push)
            </p>
            <p className="text-muted-foreground text-xs leading-relaxed">
              Alertas diários de contas vencendo, em atraso e avisos importantes de segurança.
            </p>
          </div>
        </div>

        <Button
          size="sm"
          variant={isSubscribed ? 'outline' : 'default'}
          aria-pressed={isSubscribed}
          disabled={!isSupported || isProcessing || isDenied}
          onClick={() => void handleToggle()}
          className="shrink-0 font-semibold"
        >
          {isSubscribed ? 'Desativar' : 'Ativar'}
        </Button>
      </div>

      {/* Sub-preferência: Novidades e Melhorias do Software (v1.3.1) */}
      <div className="flex items-start justify-between gap-4 border-t border-border/60 pt-3">
        <div className="flex items-start gap-3">
          <Sparkles aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
          <div>
            <p className="text-xs font-medium text-foreground">
              Novidades e Melhorias do Software
            </p>
            <p className="text-muted-foreground text-[11px] leading-relaxed">
              Acompanhe novos recursos, melhorias sugeridas por clientes e manutenções concluídas.
            </p>
          </div>
        </div>

        <Button
          size="sm"
          variant={systemUpdates ? 'outline' : 'ghost'}
          disabled={loadingPrefs}
          onClick={() => void handleToggleSystemUpdates()}
          className="h-8 shrink-0 text-xs"
        >
          {systemUpdates ? 'Ativo' : 'Pausado'}
        </Button>
      </div>

      {showIosTip ? (
        <div className="flex items-start gap-2 rounded-lg border border-amber-400/30 bg-amber-500/10 p-3 text-xs text-amber-200">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
          <p className="leading-relaxed">
            <strong>Dica para iPhone (iOS):</strong> para receber notificações push da Apple,
            toque no botão <strong>Compartilhar</strong> do Safari e escolha{' '}
            <strong>&ldquo;Adicionar à Tela de Início&rdquo;</strong>.
          </p>
        </div>
      ) : null}

      {!isSupported ? (
        <p role="alert" className="text-muted-foreground text-xs">
          Este navegador não suporta notificações push.
        </p>
      ) : null}

      {isDenied ? (
        <p role="alert" className="text-destructive text-xs">
          Permissão de notificação negada. Habilite nas configurações do navegador para receber alertas.
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
