import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App';
import { ErrorBoundary } from './components/error/ErrorBoundary';
import { AuthProvider } from './contexts/AuthContext';
import { PlanProvider } from './contexts/PlanContext';
import { registerServiceWorker } from './lib/pwa';
import './index.css';

const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error('Elemento raiz #root não encontrado no index.html');
}

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    {/* Barreira de erro global (TAREFA 11) — evita crash silencioso da UI */}
    <ErrorBoundary>
      <AuthProvider>
        <PlanProvider>
          <App />
        </PlanProvider>
      </AuthProvider>
    </ErrorBoundary>
  </React.StrictMode>,
);

// Registro do Service Worker PWA (TAREFA 48).
// Executado após a montagem da aplicação para não bloquear o primeiro render.
void registerServiceWorker();
