/**
 * App.tsx — Roteamento principal do Finanças Aksurim.
 *
 * Estrutura de rotas:
 *  - Rotas públicas (/login, /register) protegidas por <PublicRoute>.
 *  - Rotas autenticadas protegidas por <ProtectedRoute> e envolvidas pelo
 *    <AppShell> (Header + BottomNav + área de conteúdo — TAREFA 37).
 *
 * As telas internas (fila, dashboard, despesas, categorias, configurações)
 * são implementadas nas tarefas subsequentes (38+). Placeholders mínimos são
 * renderizados para validar a navegação e o pipeline de build.
 */

import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';

import { AppShell } from '@/components/layout/AppShell';
import { ProtectedRoute } from '@/components/layout/ProtectedRoute';
import { PublicRoute } from '@/components/layout/PublicRoute';
import { CategoriesPage } from '@/pages/CategoriesPage';
import { DashboardPage } from '@/pages/DashboardPage';
import { ExpensesPage } from '@/pages/ExpensesPage';
import { ForgotPasswordPage } from '@/pages/ForgotPasswordPage';
import { LoginPage } from '@/pages/LoginPage';
import { QueuePage } from '@/pages/QueuePage';
import { RegisterPage } from '@/pages/RegisterPage';
import { ResetPasswordPage } from '@/pages/ResetPasswordPage';
import { SettingsPage } from '@/pages/SettingsPage';

/**
 * Componente raiz de roteamento da aplicação.
 */
export function App(): JSX.Element {
  return (
    <BrowserRouter>
      <Routes>
        {/* Rotas públicas — redirecionam se já autenticado */}
        <Route element={<PublicRoute />}>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
        </Route>

        {/* Rotas autenticadas — envolvidas pelo AppShell (TAREFA 37) */}
        <Route element={<ProtectedRoute />}>
          <Route element={<AppShell />}>
            <Route path="/" element={<QueuePage />} />
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/expenses" element={<ExpensesPage />} />
            <Route path="/categories" element={<CategoriesPage />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
