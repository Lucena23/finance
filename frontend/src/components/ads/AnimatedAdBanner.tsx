import { useEffect, useState } from 'react';
import { cn } from '@/lib/cn';
import { Megaphone, ExternalLink, Sparkles, TrendingUp, Gem, MonitorPlay } from 'lucide-react';

export type AdBannerType = 'leaderboard' | 'rectangle';

interface AnimatedAdBannerProps {
  type?: AdBannerType;
  className?: string;
  label?: string;
}

/** Dimensões IAB exatas por formato (px). */
const IAB_DIMENSIONS: Record<AdBannerType, { width: number; height: number }> = {
  leaderboard: { width: 320, height: 100 },
  rectangle: { width: 300, height: 250 },
};

/* ============================================================================
 * LEADERBOARD CREATIVES (320x100) - Large Mobile Banner
 * Usado na Fila de Pagamentos (Mobile)
 * ============================================================================ */

function LeaderboardAd1() {
  return (
    <div className="relative flex h-full w-full flex-col justify-center overflow-hidden bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 px-4 pt-4">
      <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-20 mix-blend-overlay"></div>
      
      <div className="flex items-center gap-3 z-10 w-full mt-1">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded bg-primary/20 text-primary ring-1 ring-primary/50 shadow-[0_0_10px_rgba(6,119,127,0.5)]">
          <Megaphone className="h-5 w-5" />
        </div>
        <div className="flex flex-col flex-1">
          <span className="text-[9px] font-bold uppercase tracking-widest text-primary">Espaço Publicitário</span>
          <span className="text-[14px] font-bold text-white leading-tight mt-0.5">Anuncie sua marca</span>
        </div>
        <div className="z-10 rounded-full bg-white text-black px-3 py-1.5 shadow-md hover:bg-slate-200 transition-colors cursor-pointer shrink-0">
          <span className="text-[9px] font-bold uppercase tracking-widest">Mídia Kit</span>
        </div>
      </div>
    </div>
  );
}

function LeaderboardAd2() {
  return (
    <div className="relative flex h-full w-full flex-col justify-center overflow-hidden bg-gradient-to-r from-emerald-950 via-emerald-900 to-emerald-950 px-4 pt-4">
      <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-30 mix-blend-overlay"></div>
      
      <div className="flex items-center gap-3 z-10 w-full mt-1">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-400/20 text-emerald-400 ring-1 ring-emerald-400/50 shadow-[0_0_10px_rgba(52,211,153,0.5)]">
          <TrendingUp className="h-5 w-5" />
        </div>
        <div className="flex flex-col flex-1">
          <span className="text-[9px] font-bold uppercase tracking-widest text-emerald-400">Público Qualificado</span>
          <span className="text-[14px] font-bold text-white leading-tight mt-0.5">Cresça conosco</span>
        </div>
        <div className="z-10 rounded-full bg-emerald-500 text-emerald-950 px-3 py-1.5 shadow-lg shadow-emerald-500/20 cursor-pointer hover:bg-emerald-400 transition-colors shrink-0">
          <span className="text-[9px] font-bold uppercase tracking-widest">Contato</span>
        </div>
      </div>
    </div>
  );
}

/* ============================================================================
 * RECTANGLE CREATIVES (300x250)
 * Usado no Dashboard
 * ============================================================================ */

function RectangleAd1() {
  return (
    <div className="relative flex h-full w-full flex-col items-center justify-center gap-4 overflow-hidden bg-gradient-to-b from-slate-900 to-black px-6 text-center border border-white/5 cursor-pointer group">
      <div className="absolute inset-0 opacity-30 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-primary/40 via-transparent to-transparent group-hover:opacity-50 transition-opacity duration-700"></div>
      
      <div className="z-10 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/30 to-primary/5 ring-1 ring-primary/40 backdrop-blur-sm shadow-[0_0_30px_rgba(6,119,127,0.3)] group-hover:scale-110 transition-transform duration-500">
        <Gem className="h-8 w-8 text-primary drop-shadow-[0_0_8px_rgba(6,119,127,0.8)]" />
      </div>

      <div className="z-10 flex flex-col gap-1.5">
        <span className="text-[10px] font-bold uppercase tracking-widest text-primary">Seja Visto</span>
        <h3 className="text-xl font-extrabold text-white leading-tight">
          Sua Marca em <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-emerald-400">Alto Destaque</span>
        </h3>
        <p className="text-xs text-slate-400 mt-2 font-medium leading-relaxed">
          Conecte-se com famílias qualificadas que gerenciam finanças diariamente.
        </p>
      </div>

      <button className="z-10 mt-2 flex items-center gap-2 rounded-full bg-white px-6 py-2 text-sm font-bold text-black shadow-[0_0_20px_rgba(255,255,255,0.1)] group-hover:bg-slate-200 transition-colors">
        Anuncie Conosco <ExternalLink className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

function RectangleAd2() {
  return (
    <div className="relative flex h-full w-full flex-col items-center justify-center gap-4 overflow-hidden bg-gradient-to-br from-indigo-950 via-slate-900 to-black px-6 text-center border border-white/5 cursor-pointer group">
      <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10 mix-blend-overlay"></div>
      
      <div className="z-10 flex h-14 w-14 items-center justify-center rounded-full bg-indigo-500/20 ring-2 ring-indigo-500/50 shadow-[0_0_20px_rgba(99,102,241,0.4)] group-hover:rotate-12 transition-transform duration-500">
        <MonitorPlay className="h-6 w-6 text-indigo-400" />
      </div>

      <div className="z-10 flex flex-col gap-2 mt-1">
        <div className="inline-flex items-center justify-center gap-1.5">
          <Sparkles className="h-3 w-3 text-indigo-400" />
          <span className="text-[10px] font-bold uppercase tracking-widest text-indigo-400">Mídia Premium</span>
          <Sparkles className="h-3 w-3 text-indigo-400" />
        </div>
        <h3 className="text-[17px] font-bold text-white leading-snug px-2">
          O formato perfeito para sua campanha de conversão
        </h3>
      </div>

      <button className="z-10 mt-4 flex items-center gap-2 rounded-lg bg-indigo-500 px-6 py-2.5 text-sm font-bold text-white shadow-lg shadow-indigo-500/25 group-hover:bg-indigo-400 transition-colors">
        Solicitar Mídia Kit
      </button>
    </div>
  );
}

export function AnimatedAdBanner({
  type = 'leaderboard',
  className,
  label,
}: AnimatedAdBannerProps): JSX.Element {
  const { width, height } = IAB_DIMENSIONS[type];
  const [activeAd, setActiveAd] = useState<0 | 1>(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveAd((prev) => (prev === 0 ? 1 : 0));
    }, 6000); 
    return () => clearInterval(interval);
  }, []);

  return (
    <div
      role="complementary"
      aria-label={label ?? `Anúncio patrocinado (${width}x${height})`}
      className={cn(
        'relative mx-auto overflow-hidden rounded-xl border border-border/40 shadow-2xl bg-black/5',
        className
      )}
      style={{ width: `${width}px`, height: `${height}px` }}
    >
      <div className="relative h-full w-full">
        {type === 'leaderboard' ? (
          <>
            <div className={cn(
              "absolute inset-0 transition-transform duration-700 ease-in-out", 
              activeAd === 0 ? "translate-x-0 z-10" : "-translate-x-full z-0 pointer-events-none"
            )}>
              <LeaderboardAd1 />
            </div>
            <div className={cn(
              "absolute inset-0 transition-transform duration-700 ease-in-out", 
              activeAd === 1 ? "translate-x-0 z-10" : "translate-x-full z-0 pointer-events-none"
            )}>
              <LeaderboardAd2 />
            </div>
          </>
        ) : (
          <>
            <div className={cn(
              "absolute inset-0 transition-transform duration-700 ease-in-out", 
              activeAd === 0 ? "translate-x-0 z-10" : "-translate-x-full z-0 pointer-events-none"
            )}>
              <RectangleAd1 />
            </div>
            <div className={cn(
              "absolute inset-0 transition-transform duration-700 ease-in-out", 
              activeAd === 1 ? "translate-x-0 z-10" : "translate-x-full z-0 pointer-events-none"
            )}>
              <RectangleAd2 />
            </div>
          </>
        )}
      </div>

      {/* Rótulo de patrocínio */}
      <div className="pointer-events-none absolute left-2 top-1.5 z-20 flex items-center gap-1 rounded bg-black/50 px-1.5 py-0.5 backdrop-blur-md">
         <span className="text-[7px] font-bold uppercase tracking-widest text-white/80">Publicidade</span>
      </div>
    </div>
  );
}
