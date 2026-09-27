/**
 * AnimatedAdBanner.test.tsx — Testes dos banners animados (TAREFA 19).
 *
 * Cobre:
 *  - Dimensões IAB exatas por formato (320x50 leaderboard / 300x250 rectangle).
 *  - Presença das classes de animação CSS (ad-marquee, ad-shine, etc.).
 *  - Rótulo de patrocínio (compliance IAB).
 *  - Acessibilidade (role complementary + aria-label).
 *
 * REGRA (§8.1): proibido o uso de `any`. Tipos explícitos em todo o módulo.
 */

import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { AnimatedAdBanner } from '@/components/ads/AnimatedAdBanner';

describe('AnimatedAdBanner (TAREFA 19)', () => {
  it('renderiza o leaderboard com dimensões IAB exatas 320x50', () => {
    render(<AnimatedAdBanner type="leaderboard" />);

    const banner = screen.getByRole('complementary');
    expect(banner).toHaveStyle({ width: '320px', height: '50px' });
  });

  it('renderiza o rectangle com dimensões IAB exatas 300x250', () => {
    render(<AnimatedAdBanner type="rectangle" />);

    const banner = screen.getByRole('complementary');
    expect(banner).toHaveStyle({ width: '300px', height: '250px' });
  });

  it('usa o leaderboard como formato padrão', () => {
    render(<AnimatedAdBanner />);

    const banner = screen.getByRole('complementary');
    expect(banner).toHaveStyle({ width: '320px', height: '50px' });
  });

  it('aplica a animação de marquee no criativo leaderboard', () => {
    const { container } = render(<AnimatedAdBanner type="leaderboard" />);

    expect(container.querySelector('.animate-ad-marquee')).not.toBeNull();
    expect(container.querySelector('.animate-ad-pulse')).not.toBeNull();
  });

  it('aplica as animações de gradiente, flutuação e brilho no rectangle', () => {
    const { container } = render(<AnimatedAdBanner type="rectangle" />);

    expect(container.querySelector('.animate-ad-gradient')).not.toBeNull();
    expect(container.querySelector('.animate-ad-float')).not.toBeNull();
    expect(container.querySelector('.animate-ad-shine')).not.toBeNull();
  });

  it('exibe o rótulo de patrocínio (compliance IAB)', () => {
    render(<AnimatedAdBanner type="leaderboard" />);

    expect(screen.getByText('Patrocinado')).toBeInTheDocument();
  });

  it('expõe aria-label descritivo com as dimensões do formato', () => {
    render(<AnimatedAdBanner type="rectangle" />);

    expect(screen.getByRole('complementary')).toHaveAttribute(
      'aria-label',
      'Anúncio patrocinado (300x250)',
    );
  });
});
