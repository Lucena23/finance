📜 CHANGELOG.md
Histórico Oficial do Projeto — Aksurim Software


## REGISTROS RECENTES

Data: 2026-09-20
Versão: 1.0.0
Tipo: FEATURE / REFACTOR
Origem: Design System (Dark Theme) e Módulo de Usuários
Descrição: Refatoração completa do Design System da aplicação para um Dark Theme nativo e premium (fundo Slate 950 com acentos no verde Aksurim #D9F924). Inclusão do logo oficial da Aksurim Software na Navbar superior e nas configurações de PWA (ícones e favicon). Implementação back-to-front do módulo de membros (CRUD de usuários), permitindo a adição de novos familiares na mesma conta. A interface de configurações foi modernizada com um menu suspenso (dropdown) no avatar do usuário para Logout. As cores da Fila de Pagamentos foram reajustadas para vermelho (atraso) e azul (mês atual) para melhorar o contraste no tema escuro.
Arquivos alterados:
  - frontend/src/index.css
  - frontend/tailwind.config.ts
  - frontend/src/components/layout/Header.tsx
  - frontend/src/pages/SettingsPage.tsx
  - frontend/index.html
  - backend/src/user/user.module.ts
  - backend/src/user/user.controller.ts
  - backend/src/user/user.service.ts
Responsável: Joannderson Lucena (Aksurim Software)

Data: 2026-09-18
Versão: 0.8.0
Tipo: CHORE
Origem: Auditoria Final de Segurança e Publicação
Descrição: Auditoria final de segurança e conformidade do repositório para publicação pública. Foi verificado que o diretório `/docs/` e os arquivos `.env` não estão versionados (apenas `.env.example` é rastreado), que os headers de segurança HTTP estão ativos via `deploy/.htaccess`, que não há uso do tipo `any` no código (TypeScript `strict: true` e `noImplicitAny: true` em backend e frontend), e que as convenções de nomenclatura (kebab-case para arquivos, PascalCase para classes, snake_case para tabelas) estão conformes. A suíte de testes foi executada integralmente com sucesso (45 testes unitários + 4 e2e no backend, 11 no frontend) e ambos os builds de produção (backend e frontend) compilam sem erros. O relatório consolidado da auditoria foi registrado em `deploy/SECURITY-AUDIT.md`.
Arquivos alterados:
  - deploy/SECURITY-AUDIT.md
  - CHANGELOG.md
Responsável: Joannderson Lucena (Aksurim Software)

Data: 2026-09-18
Versão: 0.7.0
Tipo: CHORE
Origem: Deploy e Documentação Pública — Pipeline de Build, Apache e Cron Job
Descrição: Consolidação da camada de deploy e da documentação pública do projeto. O script `deploy/build.sh` executa o pipeline unificado (prisma generate/migrate, build do backend e do frontend e sincronização dos assets estáticos para o diretório público do Apache), falhando imediatamente em qualquer erro (`set -euo pipefail`). O arquivo `deploy/.htaccess` habilita compressão DEFLATE, cache de assets estáticos, headers de segurança HTTP (X-Content-Type-Options, X-Frame-Options, X-XSS-Protection, Referrer-Policy, Permissions-Policy) e o fallback SPA para `index.html`. A configuração do Cron Job do cPanel (schedule `0 5 * * *`, timezone America/Sao_Paulo) foi documentada em `deploy/cron/README.md`, incluindo validação manual e a hierarquia de prioridade do motor de notificações. O README público foi revisado para remover qualquer menção a processos internos.
Arquivos alterados:
  - deploy/build.sh
  - deploy/.htaccess
  - deploy/cron/notification-cron.sh
  - deploy/cron/README.md
  - README.md
Responsável: Joannderson Lucena (Aksurim Software)

Data: 2026-09-18
Versão: 0.6.0
Tipo: TEST
Origem: Suíte de Testes — Unitários, Isolamento Multi-Tenant e Fluxo Crítico e2e
Descrição: Configuração e ampliação da suíte de testes do projeto. No backend, o Jest foi configurado com cobertura habilitada e testes unitários cobrindo a geração de PaymentItems (SINGLE, INSTALLMENT com soma exata e resíduo na última parcela, e RECURRENT com edição restrita a lançamentos futuros), a ordenação da fila por urgência (atraso → mês atual → futuros) e o motor de prioridade de notificações (P1/P2/P3/Silêncio, com no máximo 1 push por workspace). Foram adicionados testes de isolamento multi-tenant garantindo que o acesso cross-workspace retorna 404/vazio e nunca dados alheios, além de um teste e2e do fluxo crítico (cadastro → login → criar despesa → quitar parcela → verificar histórico). No frontend, o Vitest foi configurado com cobertura e testes dos utilitários (`formatCurrency`, `getInitials`).
Arquivos alterados:
  - backend/src/expense/expense.service.spec.ts
  - backend/src/common/multi-tenant-isolation.spec.ts
  - backend/test/critical-flow.e2e-spec.ts
  - backend/test/jest-e2e.json
  - backend/package.json
  - frontend/src/lib/utils.spec.ts
  - frontend/src/test/setup.ts
  - frontend/package.json
Responsável: Joannderson Lucena (Aksurim Software)

Data: 2026-09-18
Versão: 0.5.0
Tipo: FEATURE
Origem: PWA — Manifesto, Service Worker, Instalação e Web Push
Descrição: Implementação completa do suporte a PWA. O `manifest.json` declara name, short_name, start_url, display standalone, theme_color, background_color e ícones em 192x192 e 512x512. O Service Worker realiza o cache de shell para funcionamento offline básico, invalida o cache a cada nova versão e escuta o evento `push` para exibir notificações. O fluxo de instalação na tela inicial é apresentado via prompt dedicado, e o registro de subscription de Web Push solicita permissão ao usuário e envia os dados para o endpoint `/notifications/subscribe`, com tratamento explícito do caso de permissão negada.
Arquivos alterados:
  - frontend/public/manifest.json
  - frontend/public/service-worker.js
  - frontend/public/icons/icon-192x192.png
  - frontend/public/icons/icon-512x512.png
  - frontend/src/service-worker.ts
  - frontend/src/lib/pwa.ts
  - frontend/src/components/pwa/InstallPrompt.tsx
  - frontend/src/components/pwa/PushNotificationToggle.tsx
Responsável: Joannderson Lucena (Aksurim Software)

Data: 2026-09-18
Versão: 0.4.0
Tipo: FEATURE
Origem: Frontend — Fundação, Autenticação, Fila, Despesas, Categorias e Dashboard
Descrição: Implementação da aplicação frontend em React 18 + Vite 5 + Tailwind CSS 3, mobile-first. Inclui o cliente HTTP tipado com injeção de Bearer token e os utilitários `formatCurrency` (conversão de centavos inteiros para R$ X.XXX,XX) e `getInitials` (geração de iniciais conforme a regra de nomes). Foram entregues o AuthContext com persistência de token e proteção de rotas, as páginas de Login e Registro (com coleta de familyName e ownerCpf), o AppShell com Header e BottomNav responsivos, a Fila de Pagamentos com agrupamento visual por urgência (atraso em vermelho, mês atual em laranja, futuros em azul) e a gaveta modal de quitação com valor editável, data e observação. Também foram implementados o formulário e a listagem de despesas nos três tipos (SINGLE, INSTALLMENT, RECURRENT), o CRUD de categorias com seletor de cor e ícone Lucide, os badges coloridos de auditoria por membro com filtro rápido, e o painel gerencial com cards de resumo, gráfico de rosca por categoria e gráfico de barras de evolução mensal (Recharts).
Arquivos alterados:
  - frontend/src/main.tsx
  - frontend/src/App.tsx
  - frontend/src/lib/api.ts
  - frontend/src/lib/utils.ts
  - frontend/src/lib/constants.ts
  - frontend/src/lib/validators.ts
  - frontend/src/contexts/AuthContext.tsx
  - frontend/src/hooks/useAuth.ts
  - frontend/src/hooks/usePaymentQueue.ts
  - frontend/src/hooks/useDashboard.ts
  - frontend/src/components/layout/AppShell.tsx
  - frontend/src/components/layout/Header.tsx
  - frontend/src/components/layout/BottomNav.tsx
  - frontend/src/components/payment/PaymentQueue.tsx
  - frontend/src/components/payment/PaymentCard.tsx
  - frontend/src/components/payment/PayDrawer.tsx
  - frontend/src/components/expense/ExpenseForm.tsx
  - frontend/src/components/expense/ExpenseCard.tsx
  - frontend/src/components/category/CategoryForm.tsx
  - frontend/src/components/member/MemberBadge.tsx
  - frontend/src/components/member/MemberFilter.tsx
  - frontend/src/components/dashboard/SummaryCards.tsx
  - frontend/src/components/dashboard/CategoryDonut.tsx
  - frontend/src/components/dashboard/MonthlyBars.tsx
  - frontend/src/pages/LoginPage.tsx
  - frontend/src/pages/RegisterPage.tsx
  - frontend/src/pages/QueuePage.tsx
  - frontend/src/pages/DashboardPage.tsx
  - frontend/src/pages/ExpensesPage.tsx
  - frontend/src/pages/CategoriesPage.tsx
  - frontend/src/pages/SettingsPage.tsx
Responsável: Joannderson Lucena (Aksurim Software)


## HISTÓRICO COMPLETO

Data: 2026-09-18
Versão: 0.3.0
Tipo: FEATURE
Origem: Motor de Web Push Notifications — Prioridade P1/P2/P3/Silêncio e Cron Job (RN-10 / §8.6)
Descrição: Implementação do motor de notificações push com hierarquia de prioridade e do Cron Job diário de disparo. Para cada workspace familiar o motor avalia as pendências na ordem P1 (contas em atraso) > P2 (vencendo hoje) > P3 (próximos 5 dias) > Silêncio, disparando no máximo 1 notificação por workspace por execução, com as mensagens oficiais definidas em REGRAS §8.6. O push é enviado a todas as subscriptions de todos os membros do workspace, com remoção automática de subscriptions expiradas (HTTP 404/410). O Cron Job executa diariamente às 05:00 BRT (timezone America/Sao_Paulo) via `node dist/notification-cron.js`, iterando todas as FamilyAccounts e registrando o resultado de disparo por workspace. Chaves VAPID lidas exclusivamente do .env.
Arquivos alterados:
  - backend/src/notification/notification-priority.service.ts
  - backend/src/notification/notification.cron.ts
  - backend/src/notification/notification-cron.module.ts
  - backend/src/notification-cron.ts
  - backend/src/notification/notification.module.ts
  - backend/src/app.module.ts
  - backend/package.json
Responsável: Joannderson Lucena (Aksurim Software)

Data: 2026-09-17
Versão: 0.2.0
Tipo: FEATURE
Origem: Módulo Expense — CRUD, Soft Delete e Geração de PaymentItems (RN-05 / RN-11)
Descrição: Implementação do módulo de despesas com CRUD completo, soft delete (deletedAt) e restauração, e o motor de geração automática de PaymentItems por tipo de despesa. Para despesas SINGLE é gerado exatamente 1 PaymentItem (installmentNumber=1, totalInstallments=1, expectedAmount=totalAmount, status PENDING). O motor também contempla INSTALLMENT (aritmética inteira com resíduo na última parcela) e RECURRENT (projeção mensal), além da edição de valor base recorrente restrita a lançamentos futuros e da ação de encerrar recorrência. Todos os valores monetários são inteiros em centavos (Int). O escopo familiar é derivado exclusivamente do token JWT.
Arquivos alterados:
  - backend/src/expense/expense.module.ts
  - backend/src/expense/expense.controller.ts
  - backend/src/expense/expense.service.ts
  - backend/src/expense/dto/create-expense.dto.ts
  - backend/src/expense/dto/update-expense.dto.ts
  - backend/src/expense/dto/query-expenses.dto.ts
  - backend/src/app.module.ts
Responsável: Joannderson Lucena (Aksurim Software)

Data: 2026-09-17
Versão: 0.1.0
Tipo: FEATURE
Origem: Módulo FamilyAccount — Vínculo por CPF (RN-02)
Descrição: Implementação do módulo de gestão do workspace familiar com vínculo obrigatório por CPF do titular. Inclui validação de CPF (algoritmo oficial dos dígitos verificadores), armazenamento mascarado (XXX.XXX.XXX-XX), exibição parcial no frontend (***.***.XXX-XX) e rejeição de CPF duplicado com HTTP 409. O escopo familiar é derivado exclusivamente do token JWT, nunca de parâmetros de requisição.
Arquivos alterados:
  - backend/src/family-account/family-account.module.ts
  - backend/src/family-account/family-account.controller.ts
  - backend/src/family-account/family-account.service.ts
  - backend/src/family-account/dto/create-family-account.dto.ts
  - backend/src/family-account/dto/update-family-account.dto.ts
  - backend/src/common/utils/cpf.util.ts
  - backend/src/common/validators/is-cpf.validator.ts
  - backend/src/app.module.ts
Responsável: Joannderson Lucena (Aksurim Software)
