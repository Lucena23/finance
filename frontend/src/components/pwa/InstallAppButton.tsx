/**
 * InstallAppButton.tsx — Botão "Instalar App" (TAREFA 8).
 *
 * Captura o evento `beforeinstallprompt` (via hook usePwaInstall) e expõe um
 * botão claro e intuitivo para instalar a PWA na tela inicial, evitando que o
 * usuário precise procurar a opção no menu do navegador.
 *
 * Comportamento:
 *  - Não renderiza nada quando o prompt nativo não está disponível ou quando
 *    a aplicação já está instalada (modo standalone).
 *  - Ao clicar, dispara o prompt nativo de instalação.
 *  - Exibe feedback de sucesso/erro acessível (aria-live).
 *
 * Identidade Visual Aksurim (RN-13): usa o destaque amarelo-verde (#DAF043)
 * como cor de ênfase sobre o Dark Theme nativo.
 *
 * REGRA (§8.1): proibido o uso de `any`. Tipos explícitos em todo o módulo.
 */

import { Download, Loader2 } from 'lucide-react';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { usePwaInstall } from '@/hooks/usePwaInstall';
import { cn } from '@/lib/cn';

/** Props do botão de instalação. */
export interface InstallAppButtonProps {
  /** Rótulo exibido no botão. Padrão: "Instalar App". */
  label?: string;
  /** Classes adicionais aplicadas ao botão. */
  className?: string;
}

/**
 * Botão de instalação da PWA para as telas de Login e Registro.
 *
 * @example
 * <InstallAppButton />
 */
export function InstallAppButton({
  label = 'Instalar App',
  className,
}: InstallAppButtonProps): JSX.Element | null {
  const { canInstall, isInstalled, promptInstall } = usePwaInstall();
  const [isPrompting, setIsPrompting] = useState<boolean>(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  // Já instalado ou prompt indisponível: não exibe o botão.
  if (isInstalled || !canInstall) {
    return null;
  }

  const handleInstall = async (): Promise<void> => {
    setIsPrompting(true);
    setFeedback(null);

    try {
      const outcome = await promptInstall();

      if (outcome === 'accepted') {
        setFeedback('Instalação iniciada. Confira a tela inicial do seu celular.');
      } else if (outcome === 'dismissed') {
        setFeedback('Instalação cancelada. Você pode tentar novamente.');
      } else {
        setFeedback('Instalação indisponível neste navegador.');
      }
    } catch {
      setFeedback('Não foi possível iniciar a instalação. Tente novamente.');
    } finally {
      setIsPrompting(false);
    }
  };

  return (
    <div className={cn('w-full space-y-2', className)}>
      <Button
        type="button"
        variant="outline"
        className="border-accent/60 text-accent hover:bg-accent hover:text-accent-foreground w-full"
        disabled={isPrompting}
        onClick={() => void handleInstall()}
      >
        {isPrompting ? (
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
        ) : (
          <Download className="h-4 w-4" aria-hidden="true" />
        )}
        {isPrompting ? 'Preparando instalação…' : label}
      </Button>

      <p
        role="status"
        aria-live="polite"
        className="text-muted-foreground min-h-[1rem] text-center text-xs"
      >
        {feedback}
      </p>
    </div>
  );
}
