import { cn } from '@/lib/cn';

/**
 * AnimatedAdBanner.tsx — Banners de anúncios animados (TAREFA 19).
 *
 * Implementa 2 criativos leves em CSS/HTML5 puro (SEM vídeo), seguindo os
 * padrões IAB de dimensões fixas para evitar CLS (Cumulative Layout Shift):
 *
 *  - `leaderboard` (320x50)  → Mobile Leaderboard, usado na QueuePage.
 *  - `rectangle`   (300x250) → Medium Rectangle, usado na DashboardPage.
 *
 * As animações são declaradas em `tailwind.config.ts` (keyframes `ad-*`) e
 * usam apenas `transform`/`opacity`/`background-position` — propriedades
 * compostas pela GPU, garantindo baixo custo de renderização no mobile.
 *
 * A paleta respeita estritamente a identidade visual Aksurim (RN-13):
 * #06777F (primária), #FB4629 (aviso), #DAF043 (destaque), #282828 (fundo).
 */

export type AdBannerType = 'leaderboard' | 'rectangle';

interface AnimatedAdBannerProps {
  /** Formato IAB do banner. Default: 'leaderboard'. */
  type?: AdBannerType;
  /** Classes adicionais de posicionamento/margem. */
  className?: string;
  /** Rótulo de acessibilidade (aria-label) do container. */
  label?: string;
}

/** Dimensões IAB exatas por formato (px). */
const IAB_DIMENSIONS: Record<AdBannerType, { width: number; height: number }> = {
  leaderboard: { width: 320, height: 50 },
  rectangle: { width: 300, height: 250 },
};

/**
 * Banner Mobile Leaderboard (320x50).
 *
 * Criativo: faixa horizontal com gradiente Aksurim, texto em marquee
 * contínuo e um selo "Aksurim" pulsante à direita.
 */
function LeaderboardCreative(): JSX.Element {
  return (
    <div className="relative flex h-full w-full items-center overflow-hidden bg-gradient-to-r from-aksurim-primary via-aksurim-dark to-aksurim-primary">
      {/* Faixa de destaque animada (marquee) */}
      <div className="flex w-[200%] animate-ad-marquee whitespace-nowrap">
        {[0, 1].map((copy) => (
          <div key={copy} className="flex w-1/2 items-center gap-3 px-3">
            <span className="text-[11px] font-semibold uppercase tracking-wide text-white">
              Organize as contas da família
            </span>
            <span className="text-[11px] font-bold text-aksurim-highlight">
              Finanças Aksurim
            </span>
            <span className="text-[11px] font-semibold uppercase tracking-wide text-white">
              Simples e compartilhado
            </span>
            <span className="text-[11px] font-bold text-aksurim-highlight">
              Finanças Aksurim
            </span>
          </div>
        ))}
      </div>

      {/* Selo pulsante à direita */}
      <div className="absolute right-0 flex h-full items-center bg-aksurim-dark/80 px-2">
        <span className="animate-ad-pulse rounded-sm bg-aksurim-highlight px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-aksurim-dark">
          Aksurim
        </span>
      </div>
    </div>
  );
}

/**
 * Banner Medium Rectangle (300x250).
 *
 * Criativo: card vertical com gradiente animado de fundo, ícone flutuante,
 * headline, subtítulo, CTA e um efeito de brilho (shine) periódico.
 */
function RectangleCreative(): JSX.Element {
  return (
    <div
      className="relative flex h-full w-full flex-col items-center justify-center gap-3 overflow-hidden px-5 text-center"
      style={{
        backgroundImage:
          'linear-gradient(135deg, #06777F 0%, #282828 50%, #06777F 100%)',
        backgroundSize: '200% 200%',
      }}
    >
      {/* Camada de gradiente animado */}
      <div className="pointer-events-none absolute inset-0 animate-ad-gradient bg-gradient-to-br from-aksurim-primary/40 via-transparent to-aksurim-highlight/20" />

      {/* Efeito de brilho (shine) que atravessa o banner */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute top-0 h-full w-1/3 animate-ad-shine bg-white/10 blur-md" />
      </div>

      {/* Ícone flutuante */}
      <div className="relative flex h-14 w-14 animate-ad-float items-center justify-center rounded-full bg-aksurim-highlight/15 ring-2 ring-aksurim-highlight/40">
        <span className="text-2xl" role="img" aria-label="Gráfico">
          📊
        </span>
      </div>

      {/* Headline */}
      <h3 className="relative text-base font-bold leading-tight text-white">
        Controle total das
        <br />
        <span className="text-aksurim-highlight">finanças da família</span>
      </h3>

      {/* Subtítulo */}
      <p className="relative text-[11px] leading-snug text-white/70">
        Compartilhe despesas, acompanhe pagamentos e receba alertas de
        vencimento em tempo real.
      </p>

      {/* CTA */}
      <span className="relative mt-1 animate-ad-pulse rounded-full bg-aksurim-highlight px-4 py-1.5 text-[11px] font-bold uppercase tracking-wide text-aksurim-dark shadow-lg">
        Conheça o Aksurim
      </span>
    </div>
  );
}

/**
 * Container de anúncio animado com dimensões IAB fixas.
 *
 * Renderiza o criativo correspondente ao formato solicitado, mantendo
 * largura/altura exatas para evitar layout shift. O rótulo "Patrocinado"
 * é exibido discretamente no canto superior.
 */
export function AnimatedAdBanner({
  type = 'leaderboard',
  className,
  label,
}: AnimatedAdBannerProps): JSX.Element {
  const { width, height } = IAB_DIMENSIONS[type];

  return (
    <div
      role="complementary"
      aria-label={label ?? `Anúncio patrocinado (${width}x${height})`}
      className={cn(
        'relative mx-auto overflow-hidden rounded-md border border-border shadow-inner',
        className
      )}
      style={{ width: `${width}px`, height: `${height}px` }}
    >
      {type === 'leaderboard' ? <LeaderboardCreative /> : <RectangleCreative />}

      {/* Rótulo de patrocínio (compliance IAB) */}
      <span className="pointer-events-none absolute left-1 top-0.5 text-[8px] uppercase tracking-wider text-white/40">
        Patrocinado
      </span>
    </div>
  );
}
