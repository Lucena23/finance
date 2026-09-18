/**
 * InstallPrompt.tsx — Banner de instalação da PWA (TAREFA 49).
 *
 * Exibe um convite discreto para instalar a aplicação na tela inicial quando
 * o navegador disponibiliza o evento `beforeinstallprompt`. O usuário pode
 * aceitar (dispara o prompt nativo) ou dispensar (oculta o banner).
 *
 * Acessibilidade:
 *  - role="region" com aria-label descritivo.
 *  - Botões com rótulos claros e foco visível.
 *
 * REGRA (§8.1): proibido o uso de `any`. Tipos explícitos em todo o módulo.
 */

import { Download, X } from 'lucide-react';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { usePwaInstall } from '@/hooks/usePwaInstall';

/**
 * Banner de instalação da PWA. Não renderiza nada quando a instalação não
 * está disponível ou já foi dispensada pelo usuário.
 */
export function InstallPrompt(): JSX.Element | null {
  const { canInstall, promptInstall } = usePwaInstall();
  const [isDismissed, setIsDismissed] = useState<boolean>(false);

  if (!canInstall || isDismissed) {
    return null;
  }

  const handleInstall = async (): Promise<void> => {
    const outcome = await promptInstall();

    if (outcome === 'dismissed') {
      setIsDismissed(true);
    }
  };

  return (
    <section
      role="region"
      aria-label="Instalar aplicativo na tela inicial"
      className="bg-secondary text-secondary-foreground flex items-center gap-3 rounded-lg border p-4"
    >
      <Download aria-hidden="true" className="h-5 w-5 shrink-0" />

      <div className="flex-1">
        <p className="text-sm font-medium">Instale o Finanças Aksurim</p>
        <p className="text-muted-foreground text-xs">
          Acesse rapidamente pela tela inicial, como um aplicativo.
        </p>
      </div>

      <Button size="sm" onClick={() => void handleInstall()}>
        Instalar
      </Button>

      <Button
        size="icon"
        variant="ghost"
        aria-label="Dispensar convite de instalação"
        onClick={() => setIsDismissed(true)}
      >
        <X aria-hidden="true" className="h-4 w-4" />
      </Button>
    </section>
  );
}
