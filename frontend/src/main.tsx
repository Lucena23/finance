import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App';
import { AuthProvider } from './contexts/AuthContext';
import { registerServiceWorker } from './lib/pwa';
import './index.css';

const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error('Elemento raiz #root não encontrado no index.html');
}

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <AuthProvider>
      <App />
    </AuthProvider>
  </React.StrictMode>,
);

// Registro do Service Worker PWA (TAREFA 48).
// Executado após a montagem da aplicação para não bloquear o primeiro render.
void registerServiceWorker();
