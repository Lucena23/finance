/**
 * App.tsx — Roteamento principal do Finanças Aksurim.
 *
 * Estrutura de rotas:
 *  - Rotas públicas (/login, /register) protegidas por <PublicRoute>.
 *  - Rotas autenticadas protegidas por <ProtectedRoute> e envolvidas pelo
 *    <AppShell> (Header + BottomNav + área de conteúdo — TAREFA 37).
 *  - Rota /admin protegida adicionalmente por <GlobalAdminRoute>, acessível
 *    apenas ao Admin Global (isGlobalAdmin === true — TAREFA 28 / RN-15).
 *
 * As telas internas (fila, dashboard, despesas, categorias, configurações,
 * relatórios, suporte, painel admin) são implementadas nas tarefas
 * subsequentes (38+).
 */

import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';

import { AppShell } from '@/components/layout/AppShell';
import { GlobalAdminRoute } from '@/components/layout/GlobalAdminRoute';
import { ProtectedRoute } from '@/components/layout/ProtectedRoute';
import { PublicRoute } from '@/components/layout/PublicRoute';
import { AdminPage } from '@/pages/AdminPage';
import { CategoriesPage } from '@/pages/CategoriesPage';
import { DashboardPage } from '@/pages/DashboardPage';
import { ExpensesPage } from '@/pages/ExpensesPage';
import { ForgotPasswordPage } from '@/pages/ForgotPasswordPage';
import { LandingPage } from '@/pages/LandingPage';
import { LoginPage } from '@/pages/LoginPage';
import { QueuePage } from '@/pages/QueuePage';
import { RegisterPage } from '@/pages/RegisterPage';
import { ResetPasswordPage } from '@/pages/ResetPasswordPage';
import { SettingsPage } from '@/pages/SettingsPage';
import { SupportPage } from '@/pages/SupportPage';

/**
 * Componente raiz de roteamento da aplicação.
 */
export function App(): JSX.Element {
  return (
    <BrowserRouter>
      <Routes>
        {/* Rotas públicas — redirecionam se já autenticado */}
        <Route path="/" element={<LandingPage />} />

        {/* Rotas públicas */}
        <Route element={<PublicRoute />}>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
        </Route>

        {/* Rotas autenticadas — envolvidas pelo AppShell (TAREFA 37) */}
        <Route element={<ProtectedRoute />}>
          <Route element={<AppShell />}>
            <Route path="/queue" element={<QueuePage />} />
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/expenses" element={<ExpensesPage />} />
            <Route path="/categories" element={<CategoriesPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            {/* Suporte ao cliente via Telegram (TAREFA 20 / RN-14) */}
            <Route path="/support" element={<SupportPage />} />

            {/* Painel Aksurim — Admin Global (TAREFA 28 / RN-15).
                Protegido por GlobalAdminRoute: apenas isGlobalAdmin === true. */}
            <Route element={<GlobalAdminRoute />}>
              <Route path="/admin" element={<AdminPage />} />
            </Route>
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
