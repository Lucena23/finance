import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/cn';
import { ExternalLink, MessageSquare } from 'lucide-react';

export type AdBannerType = 'leaderboard' | 'rectangle';

interface AnimatedAdBannerProps {
  type?: AdBannerType;
  className?: string;
  label?: string;
}

const IAB_DIMENSIONS: Record<AdBannerType, { width: number; height: number }> = {
  leaderboard: { width: 320, height: 100 },
  rectangle: { width: 300, height: 250 },
};

/* ============================================================================
 * LEADERBOARD CREATIVES (320x100) - Large Mobile Banner
 * Usado na Fila de Pagamentos (Mobile)
 * ============================================================================ */

function LeaderboardAd1({ onAction }: { onAction: () => void }) {
  return (
    <div className="relative flex h-full w-full overflow-hidden bg-[url('/images/banner-fila-1.png')] bg-cover bg-center cursor-pointer group" onClick={onAction}>
      <div className="absolute bottom-2 left-4 z-10">
        <div className="flex items-center justify-center text-center rounded-full bg-primary text-white px-5 py-1.5 shadow-[0_4px_10px_rgba(0,0,0,0.5)] group-hover:bg-primary/90 transition-colors cursor-pointer">
          <span className="text-[10px] font-bold uppercase tracking-widest drop-shadow-md">Fale Conosco</span>
        </div>
      </div>
    </div>
  );
}

function LeaderboardAd2({ onAction }: { onAction: () => void }) {
  return (
    <div className="relative flex h-full w-full overflow-hidden bg-[url('/images/banner-fila-2.png')] bg-cover bg-[center_top_30%] cursor-pointer group" onClick={onAction}>
      {/* Botão posicionado mais acima (onde ficava o título) */}
      <div className="absolute top-[35%] left-4 z-10">
        <div className="flex items-center justify-center text-center rounded-full bg-emerald-500 text-emerald-950 px-5 py-1.5 shadow-[0_4px_10px_rgba(0,0,0,0.5)] group-hover:bg-emerald-400 transition-colors cursor-pointer">
          <span className="text-[10px] font-bold uppercase tracking-widest drop-shadow-sm">Contato</span>
        </div>
      </div>
    </div>
  );
}

/* ============================================================================
 * RECTANGLE CREATIVES (300x250)
 * Usado no Dashboard
 * ============================================================================ */

function RectangleAd1({ onAction }: { onAction: () => void }) {
  return (
    <div className="relative flex h-full w-full flex-col justify-end overflow-hidden bg-[url('/images/banner-painel-1.png')] bg-cover bg-center cursor-pointer group" onClick={onAction}>
      <div className="z-10 px-6 pb-6 w-full">
        <button className="flex items-center justify-center text-center gap-2 rounded-lg bg-primary px-6 py-2.5 text-sm font-bold text-white shadow-[0_4px_15px_rgba(0,0,0,0.5)] group-hover:bg-primary/90 transition-colors w-full">
          Anuncie Conosco <ExternalLink className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

function RectangleAd2({ onAction }: { onAction: () => void }) {
  return (
    <div className="relative flex h-full w-full overflow-hidden bg-[url('/images/banner-painel-2.png')] bg-cover bg-center cursor-pointer group" onClick={onAction}>
      {/* Botão subido para a altura da antiga frase de alta conversão */}
      <div className="absolute top-[58%] left-1/2 -translate-x-1/2 z-10 w-full px-6 flex justify-center">
        <button className="flex items-center justify-center text-center gap-2 rounded-full bg-white text-black px-6 py-2.5 text-sm font-bold shadow-[0_4px_15px_rgba(0,0,0,0.5)] group-hover:bg-slate-200 transition-colors">
          Solicitar Mídia Kit <MessageSquare className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

export function AnimatedAdBanner({
  type = 'leaderboard',
  className,
  label,
}: AnimatedAdBannerProps): JSX.Element {
  const { width, height } = IAB_DIMENSIONS[type];
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(true);
  const navigate = useNavigate();

  const handleAction = () => {
    navigate('/support');
  };

  useEffect(() => {
    const interval = setInterval(() => {
      setIsTransitioning(true);
      setCurrentIndex((prev) => prev + 1);
    }, 6000); 
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (currentIndex === 2) {
      const timeout = setTimeout(() => {
        setIsTransitioning(false);
        setCurrentIndex(0);
      }, 700);
      return () => clearTimeout(timeout);
    }
  }, [currentIndex]);

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
          <div 
            className={cn("flex h-full w-full", isTransitioning ? "transition-transform duration-700 ease-in-out" : "")}
            style={{ transform: `translateX(-${currentIndex * 100}%)` }}
          >
            <div className="h-full w-full shrink-0"><LeaderboardAd1 onAction={handleAction} /></div>
            <div className="h-full w-full shrink-0"><LeaderboardAd2 onAction={handleAction} /></div>
            <div className="h-full w-full shrink-0"><LeaderboardAd1 onAction={handleAction} /></div>
          </div>
        ) : (
          <div 
            className={cn("flex h-full w-full", isTransitioning ? "transition-transform duration-700 ease-in-out" : "")}
            style={{ transform: `translateX(-${currentIndex * 100}%)` }}
          >
            <div className="h-full w-full shrink-0"><RectangleAd1 onAction={handleAction} /></div>
            <div className="h-full w-full shrink-0"><RectangleAd2 onAction={handleAction} /></div>
            <div className="h-full w-full shrink-0"><RectangleAd1 onAction={handleAction} /></div>
          </div>
        )}

        {/* Rótulo de patrocínio */}
        <div className="pointer-events-none absolute left-2 top-1.5 z-20 flex items-center gap-1 rounded bg-black/60 px-1.5 py-0.5 backdrop-blur-md">
           <span className="text-[7px] font-bold uppercase tracking-widest text-white/80">Publicidade</span>
        </div>
      </div>
    </div>
  );
}
