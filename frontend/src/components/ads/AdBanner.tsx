import { cn } from '@/lib/cn';

interface AdBannerProps {
  /**
   * Tipo do anúncio:
   * 'leaderboard' (320x50) -> Padrão Mobile
   * 'rectangle' (300x250) -> In-feed / Dashboard
   */
  type?: 'leaderboard' | 'rectangle';
  className?: string;
}

export function AdBanner({ type = 'leaderboard', className }: AdBannerProps): JSX.Element {
  return (
    <div
      className={cn(
        'mx-auto flex flex-col items-center justify-center overflow-hidden rounded-md border border-border bg-slate-900/50 shadow-inner',
        type === 'leaderboard' ? 'h-[50px] w-[320px]' : 'h-[250px] w-[300px]',
        className
      )}
    >
      <span className="text-[10px] uppercase tracking-wider text-muted-foreground/50 mb-1">
        Patrocinado
      </span>
      <div className="flex items-center gap-2 opacity-40">
        <img src="/logo-full.png" alt="Aksurim" className="h-4 brightness-0 invert" />
      </div>
      {/* 
        No deploy, o script do Google AdSense/AdMob será injetado aqui.
        As dimensões fixas no container acima previnem CLS (Cumulative Layout Shift).
      */}
    </div>
  );
}
