import { useEffect, useState } from 'react';
import { Check, Sparkles } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { notificationsApi, type SystemAnnouncement } from '@/lib/api';

const LAST_SEEN_STORAGE_KEY = 'aksurim_last_seen_announcement_id';

/**
 * Modal executivo de "Novidades e Melhorias do Sistema" (v1.3.1).
 *
 * Exibido automaticamente UMA ÚNICA VEZ para cada comunicado publicado pelo Admin Global.
 * Garante que 100% dos usuários (desktop, Android e iOS com ou sem push ativo)
 * fiquem cientes das melhorias assim que entrarem no sistema.
 */
export function AnnouncementModal(): JSX.Element | null {
  const [announcement, setAnnouncement] = useState<SystemAnnouncement | null>(null);
  const [isOpen, setIsOpen] = useState<boolean>(false);

  useEffect(() => {
    let mounted = true;

    void (async (): Promise<void> => {
      try {
        const latest = await notificationsApi.getLatestAnnouncement();
        if (!latest || !mounted) return;

        const lastSeenId = window.localStorage.getItem(LAST_SEEN_STORAGE_KEY);
        if (lastSeenId !== latest.id) {
          setAnnouncement(latest);
          setIsOpen(true);
        }
      } catch {
        // ignora se offline
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  const handleDismiss = (): void => {
    if (announcement) {
      try {
        window.localStorage.setItem(LAST_SEEN_STORAGE_KEY, announcement.id);
      } catch {
        // storage indisponível
      }
    }
    setIsOpen(false);
  };

  if (!announcement) {
    return null;
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) handleDismiss(); }}>
      <DialogContent className="max-w-md sm:max-w-lg border-border/80 bg-card p-6 shadow-2xl">
        <DialogHeader className="space-y-2 text-left">
          <div className="flex items-center justify-between gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-400/40 bg-amber-500/15 px-3 py-0.5 text-xs font-bold text-amber-300">
              <Sparkles className="h-3.5 w-3.5 text-amber-400" />
              Novidades do Sistema
            </span>
            {announcement.version && (
              <span className="rounded-md border border-border bg-muted/60 px-2 py-0.5 font-mono text-[11px] font-semibold text-muted-foreground">
                v{announcement.version}
              </span>
            )}
          </div>

          <DialogTitle className="text-lg font-bold tracking-tight text-foreground sm:text-xl">
            {announcement.title}
          </DialogTitle>
          <DialogDescription className="sr-only">
            Comunicado oficial de atualização do software Aksurim Controle.
          </DialogDescription>
        </DialogHeader>

        <div className="my-2 max-h-[60vh] overflow-y-auto rounded-lg border border-border/60 bg-muted/20 p-4 text-xs leading-relaxed text-foreground/90 sm:text-sm">
          <div className="whitespace-pre-line space-y-2">
            {announcement.body}
          </div>
        </div>

        <DialogFooter className="pt-2">
          <Button
            type="button"
            onClick={handleDismiss}
            className="w-full bg-gradient-to-r from-amber-400 to-yellow-500 font-bold text-slate-950 shadow-md hover:brightness-110 sm:w-auto"
          >
            <Check className="mr-1.5 h-4 w-4" />
            Entendi, obrigado!
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
