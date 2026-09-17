import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';

/**
 * App — Roteamento principal do Finanças Aksurim.
 *
 * Nesta fase (TAREFA 3) apenas a fundação do frontend é estabelecida.
 * As páginas reais (Login, Fila, Dashboard, etc.) são implementadas nas
 * fases subsequentes do checklist. Um placeholder mínimo é renderizado
 * para validar o pipeline de build (tsc + vite build).
 */
export function App(): JSX.Element {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Placeholder />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

function Placeholder(): JSX.Element {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-2 p-6 text-center">
      <h1 className="text-2xl font-bold">Finanças Aksurim</h1>
      <p className="text-muted-foreground text-sm">
        Fundação do frontend configurada. Aguardando implementação das páginas.
      </p>
    </main>
  );
}
