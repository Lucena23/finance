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

import { Download, Loader2, MoreVertical, Share, Smartphone } from 'lucide-react';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { usePwaInstall } from '@/hooks/usePwaInstall';
import { cn } from '@/lib/cn';

/** Props do botão de instalação. */
export interface InstallAppButtonProps {
  /** Rótulo exibido no botão. Padrão: "Instalar App no Celular". */
  label?: string;
  /** Classes adicionais aplicadas ao botão. */
  className?: string;
}

/**
 * Botão de instalação da PWA para as telas de Landing, Login e Registro.
 *
 * - Se o navegador disponibilizar `beforeinstallprompt` (Android Chrome / Edge),
 *   dispara a instalação direta em 1 clique.
 * - Caso contrário (ex.: iPhone/Safari ou quando o prompt automático ainda não
 *   foi emitido pelo navegador), abre um modal nativo Aksurim com o passo a
 *   passo ilustrado para Android e iPhone.
 */
export function InstallAppButton({
  label = 'Instalar App no Celular',
  className,
}: InstallAppButtonProps): JSX.Element | null {
  const { canInstall, isInstalled, promptInstall } = usePwaInstall();
  const [isPrompting, setIsPrompting] = useState<boolean>(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [guideOpen, setGuideOpen] = useState<boolean>(false);

  // Se já estiver rodando como App instalado (modo standalone), oculta o botão.
  if (isInstalled) {
    return null;
  }

  const handleInstall = async (): Promise<void> => {
    if (!canInstall) {
      setGuideOpen(true);
      return;
    }

    setIsPrompting(true);
    setFeedback(null);

    try {
      const outcome = await promptInstall();

      if (outcome === 'accepted') {
        setFeedback('Instalação iniciada! Confira a tela inicial do seu aparelho.');
      } else if (outcome === 'dismissed') {
        setFeedback('Instalação cancelada. Você pode instalar quando quiser.');
      } else {
        setGuideOpen(true);
      }
    } catch {
      setGuideOpen(true);
    } finally {
      setIsPrompting(false);
    }
  };

  return (
    <div className={cn('w-full space-y-2', className)}>
      <Button
        type="button"
        variant="outline"
        className="border-accent/60 text-accent hover:bg-accent hover:text-accent-foreground w-full font-semibold"
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

      {feedback ? (
        <p
          role="status"
          aria-live="polite"
          className="text-muted-foreground min-h-[1rem] text-center text-xs"
        >
          {feedback}
        </p>
      ) : null}

      <Dialog open={guideOpen} onOpenChange={setGuideOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <Smartphone aria-hidden="true" className="text-accent h-5 w-5" />
              Instalar o App Aksurim Controle
            </DialogTitle>
            <DialogDescription>
              Tenha acesso rápido direto na tela inicial do seu celular, em tela
              cheia e com alertas de vencimento:
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-1 text-sm">
            {/* Instruções Android */}
            <div className="border-border bg-muted/30 rounded-lg border p-3.5">
              <p className="text-foreground mb-1.5 flex items-center gap-1.5 font-semibold">
                <MoreVertical
                  aria-hidden="true"
                  className="text-accent h-4 w-4 shrink-0"
                />
                No Android (Chrome / Samsung / Edge):
              </p>
              <ol className="text-muted-foreground list-inside list-decimal space-y-1 text-xs leading-relaxed">
                <li>
                  Toque no menu de <strong>3 pontinhos (⋮)</strong> no canto
                  superior direito do navegador.
                </li>
                <li>
                  Selecione <strong>&ldquo;Instalar aplicativo&rdquo;</strong>{' '}
                  ou <strong>&ldquo;Adicionar à tela inicial&rdquo;</strong>.
                </li>
              </ol>
            </div>

            {/* Instruções iPhone / iOS */}
            <div className="border-border bg-muted/30 rounded-lg border p-3.5">
              <p className="text-foreground mb-1.5 flex items-center gap-1.5 font-semibold">
                <Share
                  aria-hidden="true"
                  className="text-primary h-4 w-4 shrink-0"
                />
                No iPhone / iPad (Safari):
              </p>
              <ol className="text-muted-foreground list-inside list-decimal space-y-1 text-xs leading-relaxed">
                <li>
                  Toque no ícone <strong>Compartilhar</strong> na barra inferior
                  do Safari.
                </li>
                <li>
                  Role a lista e toque em{' '}
                  <strong>&ldquo;Adicionar à Tela de Início&rdquo;</strong>.
                </li>
              </ol>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              className="w-full sm:w-auto"
              onClick={() => setGuideOpen(false)}
            >
              Entendi
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
