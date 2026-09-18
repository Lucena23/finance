/**
 * PagePlaceholder.tsx — Placeholder reutilizável para telas em construção.
 *
 * Renderiza um título e uma descrição curta, servindo de âncora para as
 * páginas internas cujo conteúdo completo é implementado nas tarefas
 * subsequentes (38+). Mantém a navegação do AppShell funcional (TAREFA 37).
 *
 * REGRA (§8.1): proibido o uso de `any`. Tipos explícitos em todo o módulo.
 */

interface PagePlaceholderProps {
  /** Título da tela. */
  title: string;
  /** Descrição curta do propósito da tela. */
  description: string;
}

/**
 * Bloco de conteúdo provisório exibido enquanto a tela não é implementada.
 */
export function PagePlaceholder({
  title,
  description,
}: PagePlaceholderProps): JSX.Element {
  return (
    <section className="flex flex-col gap-2">
      <h1 className="text-xl font-bold tracking-tight">{title}</h1>
      <p className="text-muted-foreground text-sm">{description}</p>
    </section>
  );
}
