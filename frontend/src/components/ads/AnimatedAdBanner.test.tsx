import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';

import { AnimatedAdBanner } from '@/components/ads/AnimatedAdBanner';

function renderWithRouter(ui: React.ReactElement) {
  return render(<MemoryRouter>{ui}</MemoryRouter>);
}

describe('AnimatedAdBanner (TAREFA 19)', () => {
  it('renderiza o leaderboard com dimensões IAB exatas 320x100', () => {
    renderWithRouter(<AnimatedAdBanner type="leaderboard" />);

    const banner = screen.getByRole('complementary');
    expect(banner).toHaveStyle({ width: '320px', height: '100px' });
  });

  it('renderiza o rectangle com dimensões IAB exatas 300x250', () => {
    renderWithRouter(<AnimatedAdBanner type="rectangle" />);

    const banner = screen.getByRole('complementary');
    expect(banner).toHaveStyle({ width: '300px', height: '250px' });
  });

  it('usa o leaderboard como formato padrão', () => {
    renderWithRouter(<AnimatedAdBanner />);

    const banner = screen.getByRole('complementary');
    expect(banner).toHaveStyle({ width: '320px', height: '100px' });
  });

  it('exibe o rótulo de patrocínio (compliance IAB)', () => {
    renderWithRouter(<AnimatedAdBanner type="leaderboard" />);

    expect(screen.getByText('Publicidade')).toBeInTheDocument();
  });

  it('expõe aria-label descritivo com as dimensões do formato', () => {
    renderWithRouter(<AnimatedAdBanner type="rectangle" />);

    expect(screen.getByRole('complementary')).toHaveAttribute(
      'aria-label',
      'Anúncio patrocinado (300x250)',
    );
  });
});
