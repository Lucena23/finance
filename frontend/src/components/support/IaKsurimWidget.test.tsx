import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { IaKsurimWidget } from './IaKsurimWidget';

vi.mock('@/lib/api', async () => {
  const actual = await vi.importActual('@/lib/api');
  return {
    ...actual,
    supportApi: {
      chatPublic: vi.fn().mockResolvedValue({
        reply: 'Olá! Como posso ajudar você no teste?',
        quickReplies: ['💎 Conhecer Planos'],
      }),
      chatAuthenticated: vi.fn().mockResolvedValue({
        reply: 'Olá assinante! Como posso te ajudar?',
        quickReplies: ['📊 Dúvidas no Painel'],
      }),
      sendPublicForm: vi.fn().mockResolvedValue({
        delivered: true,
        message: 'Enviado com sucesso',
      }),
    },
  };
});

describe('IaKsurimWidget', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renderiza o botão flutuante da IA-ksurim', () => {
    render(
      <MemoryRouter>
        <IaKsurimWidget isPublic />
      </MemoryRouter>,
    );

    expect(screen.getByLabelText('Atendimento IA-ksurim')).toBeInTheDocument();
  });

  it('abre a janela de chat ao clicar no botão', async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <IaKsurimWidget isPublic />
      </MemoryRouter>,
    );

    const button = screen.getByLabelText('Atendimento IA-ksurim');
    await user.click(button);

    expect(screen.getByText('IA-ksurim')).toBeInTheDocument();
    expect(screen.getByText(/assistente de suporte e navegação/i)).toBeInTheDocument();
  });

  it('permite alternar para a visão de formulário formal', async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <IaKsurimWidget isPublic />
      </MemoryRouter>,
    );

    await user.click(screen.getByLabelText('Atendimento IA-ksurim'));
    await user.click(screen.getByTitle('Formulário Formal'));

    expect(screen.getByText('Abertura de Chamado Formal')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Ex: Carlos Eduardo')).toBeInTheDocument();
  });
});
