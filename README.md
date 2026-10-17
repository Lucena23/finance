<div align="center">
  <img src="./frontend/public/logo-dark.png" alt="Aksurim Software" width="350" />
  <h1>Aksurim Controle</h1>
  <p><b>Plataforma SaaS & PWA de Gestão e Inteligência Financeira Individual e Compartilhada</b></p>

  <img src="https://img.shields.io/badge/Version-1.2%20Freemium-F59E0B?style=for-the-badge" alt="Version 1.2" />
  <img src="https://img.shields.io/badge/Architecture-Mobile%20First%20PWA-06777F?style=for-the-badge" alt="Mobile First" />
  <img src="https://img.shields.io/badge/Security-OWASP%20Hardened-FB4629?style=for-the-badge" alt="Security" />
  <img src="https://img.shields.io/badge/LGPD-Compliant-10B981?style=for-the-badge" alt="LGPD Compliant" />
  <img src="https://img.shields.io/badge/Tech-React%2018%20%7C%20NestJS%2010%20%7C%20MySQL-282828?style=for-the-badge" alt="Tech Stack" />
</div>

<br/>

## 🚀 VISÃO EXECUTIVA E POSICIONAMENTO DE MERCADO

O **Aksurim Controle** é um aplicativo web progressivo (**PWA**) de alto padrão, desenvolvido sob arquitetura **Mobile-First** e **Dark-UI Nativa** para o ecossistema SaaS FinTech. Projetado, construído e mantido pela **Aksurim Software**, este sistema atua tanto como um produto comercial escalável quanto como o **Portfólio Oficial de Engenharia de Software** da empresa para clientes corporativos, parceiros estratégicos e investidores.

Diferente de planilhas estáticas ou aplicativos pessoais isolados, o **Aksurim Controle** resolve a desorganização financeira e a inadimplência em **qualquer núcleo de despesas compartilhadas ou individuais**:
- 🏠 **Famílias e Casais:** Visibilidade transparente das contas da casa sem atritos.
- 🎓 **Repúblicas Estudantis e Colegas de Apartamento:** Rateio claro e rastreabilidade exata de quem quitou cada despesa do mês.
- 🎉 **Comissões de Formatura, Viagens e Eventos entre Amigos:** Controle centralizado de caixa com múltiplos participantes auditáveis.
- 💼 **Profissionais Autônomos e Gestão Individual:** Previsibilidade de fluxo de caixa mensal e anual em tempo real.

### Pilares Operacionais
1. **Fila Operacional Inteligente:** Ordenação algorítmica de compromissos por criticidade (`Atrasadas` → `Vencendo Hoje` → `Próximas` → `Pagas`), com rolagem automática de pendências vencidas para o mês corrente.
2. **Rastreabilidade Compartilhada (Multi-Membros):** Identificação visual imediata por avatar e histórico detalhado de qual membro realizou cada baixa parcial ou integral.
3. **Prevenção de Juros e Multas:** Alertas inteligentes via **Web Push Notifications (VAPID)** e e-mails transacionais automatizados antes do vencimento.

---

## 👑 MODELO DE NEGÓCIO HÍBRIDO: SAAS FREEMIUM + ADTECH (v1.2)

Na versão **1.2**, o **Aksurim Controle** opera sob uma arquitetura de monetização dupla altamente escalável: **Assinaturas Recorrentes (👑 Premium)** combinadas com **Mídia Nativa de Patrocínio (AdTech)**.

### Ciclo de Vida da Assinatura (State Machine)
Cada conta possui uma máquina de estados gerenciada em tempo real pelo backend (`PlanService` + `PlanGuard`):
- **`TRIAL` (Degustação Automática):** Todo novo cadastro inicia automaticamente com **15 dias de 👑 Premium gratuito** (configurável via variável de ambiente), sem exigir cartão de crédito no onboarding.
- **Oferta de Conversão Antecipada:** Enquanto estiver no período de `TRIAL`, o usuário desbloqueia uma oferta exclusiva de **R$ 9,99 no 1º mês** do plano mensal.
- **`PREMIUM` (Assinante Ativo):** Acesso irrestrito aos planos **Mensal**, **Semestral** ou **Anual**, além de suporte a **Cortesias VIP** concedidas pela administração.
- **`GRACE_PERIOD` (Tolerância Inteligente):** Ao expirar uma assinatura paga, o sistema concede automaticamente **3 dias de carência** com acesso total mantido antes de aplicar restrições visuais, evitando bloqueios abruptos por atrasos bancários.
- **`FREE` (Retenção sem Perda de Dados):** Caso o usuário opte por não assinar após o Trial, **nenhum lançamento futuro, parcelado, recorrente ou histórico é apagado**. As restrições são estritamente visuais e operacionais, incentivando o upgrade contínuo com zero fricção.

### Comparativo de Recursos: Free vs. 👑 Premium

| Recurso / Módulo | Plano Free | 👑 Plano Premium |
| :--- | :--- | :--- |
| **Fila Operacional & Painel** | Mês atual + próximo mês liberados | **Todos os meses passados e futuros liberados** |
| **Meses Bloqueados (Paywall Visual)** | Efeito *Glassmorphism/Blur* com resumo de itens ocultos | **Desbloqueio total instantâneo** |
| **Rolagem de Contas Atrasadas** | Contas vencidas aparecem normalmente no mês atual para baixa | Histórico completo + visão mensal detalhada |
| **Gráfico de Evolução Anual (12 Meses)** | Meses fora da janela exibidos com cadeado dourado | **Comparativo analítico completo dos 12 meses** |
| **Categorias Personalizadas** | Até **5 categorias** ativas | **Categorias ilimitadas** |
| **Membros e Participantes** | Membros convidados em modo **Somente Leitura** | **Acesso completo** para criar e dar baixa em contas |
| **Relatórios Executivos em PDF** | Bloqueado (requer 👑 Premium) | **Relatórios Sintético e Analítico com gráficos vetoriais** |
| **Exportação de Dados (CSV — LGPD)** | **Liberado gratuitamente** (Portabilidade Art. 18 LGPD) | **Liberado gratuitamente** |
| **Suporte & Mídia de Parceiros** | Acesso total ao suporte e ofertas de parceiros | Acesso total ao suporte e ofertas de parceiros |

---

## 🛡️ CIBERSEGURANÇA, LGPD E ARQUITETURA (Enterprise-Grade)

O sistema foi construído para proteger dados financeiros sensíveis sob rigorosos padrões corporativos (**OWASP Top 10**) e conformidade legal:

- **Isolamento Estrito Multi-Tenant (Prevenção BOLA/IDOR):** Todas as queries são isoladas por `familyAccountId` extraído criptograficamente do payload JWT no backend. Nenhum identificador de conta é aceito via parâmetros manipuláveis pelo cliente.
- **Enforcement Duplo de Plano (`PlanGuard` + `@RequirePremium`):** As regras do modelo Freemium não dependem apenas do frontend. O backend valida permissões de janela de meses (`assertMonthAccess`), limite de categorias, permissão de escrita de membros secundários e geração de PDFs, retornando `HTTP 402 Payment Required` estruturado (`code: PREMIUM_REQUIRED`) quando aplicável.
- **Conformidade Nativa com a LGPD (Lei nº 13.709/2018):**
  - **Portabilidade de Dados (Art. 18, V):** Endpoint dedicado (`GET /api/v1/reports/csv`) com codificação UTF-8 BOM para exportação integral das despesas do titular em qualquer plano, inclusive gratuito.
  - **Minimização e Validação:** Validação matemática de CPF (dígitos verificadores) e unicidade no banco para prevenção de abuso de período de testes (*Trial Abuse Prevention*).
- **API Hardened (Helmet, CORS & ValidationPipe):** Proteção de cabeçalhos HTTP com `Helmet`, sanitização com `class-validator` (`whitelist: true`, `forbidNonWhitelisted: true`) e senhas criptografadas com `Bcrypt`.
- **Zero SQL Injection / XSS:** Uso exclusivo de queries parametrizadas pelo **Prisma ORM** e sanitização nativa da árvore DOM pelo **React 18**.

---

## 🎛️ PAINEL MASTER DE GOVERNANÇA (`/admin` — Painel Aksurim)

A plataforma conta com um módulo administrativo exclusivo para gestores globais (`isGlobalAdmin` + `GlobalAdminGuard`):
- **KPIs Executivos da Plataforma:** Total de contas/núcleos ativos, usuários cadastrados, volume de despesas gerenciadas e total de chamados de suporte.
- **Gestão Comercial de Planos em Tempo Real:**
  - Filtro rápido por status (`Todos`, `Em Teste`, `Premium`, `Free`) e busca instantânea por nome ou e-mail do titular.
  - Ações diretas em 1 clique: **Conceder Cortesia VIP (30d ou 365d)**, **Estender Período de Teste (+15 dias)** ou **Revogar para Free**.
  - Sincronia reativa imediata via eventos customizados (`plan-updated`) que atualizam instantaneamente o badge e os bloqueios da interface.
- **Central de Atendimento e Suporte:** Leitura e gerenciamento de mensagens enviadas pelos usuários diretamente pelo app.

---

## 🛠️ STACK TECNOLÓGICA E ARQUITETURA

### Backend (`/backend` — API RESTful Modular)
- **Framework:** NestJS 10+ (Node.js + TypeScript Strict Mode)
- **ORM & Banco de Dados:** Prisma ORM 5+ com MySQL 8.0 (Containerizado via Docker)
- **Autenticação & Segurança:** Passport JWT, Bcrypt, Helmet, Custom Guards (`JwtAuthGuard`, `RolesGuard`, `PlanGuard`, `GlobalAdminGuard`)
- **Agendamento & Mensageria:** `@nestjs/schedule` (Cron Jobs diários para alertas de vencimento e avisos de fim de Trial), Nodemailer (SMTP transacional) e `web-push` (Notificações PWA nativas)
- **Motor Gráfico de Documentos:** `PDFKit` com desenho vetorial matemático de gráficos (Donut Charts, Barras de Progresso e Tabelas Executivas) diretamente em buffer de memória
- **Qualidade de Código:** Jest (110+ testes unitários automatizados cobrindo regras de negócio, guards e serviços)

### Frontend (`/frontend` — Progressive Web App)
- **Core:** React 18 + TypeScript + Vite 5
- **Design System Dark-First:** Tailwind CSS 3.4, Radix UI Primitives (Shadcn UI), Lucide Icons e estética *Dark Glassmorphism* (`#282828` / `#333333`) com detalhes em Esmeralda e Dourado Premium
- **Visualização de Dados:** Recharts (Gráficos responsivos de Rosca e Evolução Mensal)
- **Estado & Sincronia:** Context API (`AuthContext`, `PlanContext`) com interceptação automática de `HTTP 402` e atualização instantânea sem recarregamento de página
- **Capacidades PWA:** Service Worker customizado (`sw.js`), Web App Manifest instalável em Android/iOS/Desktop e suporte a Web Push

---

## 📂 ESTRUTURA DO REPOSITÓRIO

```text
financas_aksurim/
├── backend/                        # API NestJS 10 + Prisma ORM
│   ├── prisma/
│   │   ├── migrations/             # Histórico versionado de migrações SQL
│   │   └── schema.prisma           # Modelagem relacional (FamilyAccount, User, Expense, etc.)
│   └── src/
│       ├── admin/                  # Painel Aksurim (KPIs, gestão de contas e planos VIP)
│       ├── auth/                   # Registro, Login JWT, Verificação de E-mail e Validação CPF
│       ├── category/               # Gestão de categorias + limite inteligente do plano Free
│       ├── common/                 # Guards globais (JwtAuth, Roles, PlanGuard), Decorators e Utils
│       ├── dashboard/              # Agregações financeiras mensais e anuais
│       ├── expense/                # Motor de despesas avulsas, fixas, parceladas e rolagem de atrasos
│       ├── notification/           # Web Push (VAPID) e Cron de lembretes de vencimento
│       ├── payment-item/           # Baixas parciais/totais e histórico por membro pagador
│       ├── plan/                   # Máquina de estados Freemium, Trial, Preços e Cron de lembrete
│       ├── reports/                # Gerador de PDF vetorial (Premium) e Exportador CSV (LGPD)
│       ├── support/                # Canal de suporte e mídia kit de patrocinadores
│       └── user/                   # Gestão de membros participantes e convites por e-mail
├── frontend/                       # Aplicação React 18 + Vite + Tailwind CSS (PWA)
│   ├── public/                     # Assets estáticos, ícones PWA, Service Worker e Banners
│   └── src/
│       ├── components/
│       │   ├── dashboard/          # KPIs, CategoryDonut, MonthlyBars e PaymentHistory
│       │   ├── layout/             # AppShell, Topbar, BottomNav e BannerAd
│       │   ├── plan/               # PremiumBadge, PremiumModal e LockedMonthOverlay (Blur UI)
│       │   └── queue/              # MonthCarousel, ExpenseCard, ExpenseFormModal e PayConfirmDialog
│       ├── contexts/               # PlanContext (estado global reativo de assinatura)
│       ├── hooks/                  # Hooks customizados (useAuth, useExpenses, useDashboard, useAdmin)
│       ├── lib/                    # Cliente HTTP tipado (api.ts), constantes e formatadores
│       └── pages/                  # Landing, Auth, Queue, Dashboard, Categories, Plans, Settings, Admin
└── docker-compose.yml              # Orquestração local do banco de dados MySQL 8.0
```

---

## ⚙️ COMO EXECUTAR O PROJETO LOCALMENTE

### 1. Pré-requisitos
- **Node.js** `v20+` e **npm**
- **Docker** e **Docker Compose** (para o banco MySQL local)

### 2. Subir o Banco de Dados (Docker)
Na raiz do repositório, inicie o container MySQL (mapeado na porta `3307` para evitar conflitos com instalações locais):
```bash
docker compose up -d
```

### 3. Configurar e Iniciar o Backend
```bash
cd backend
npm install

# Configure o arquivo .env (baseado no .env.example)
# Aplique as migrações e gere o Prisma Client:
npx prisma migrate deploy
npx prisma generate

# Inicie o servidor em modo de desenvolvimento (porta 3000):
npm run start:dev
```

### 4. Configurar e Iniciar o Frontend
Em um novo terminal:
```bash
cd frontend
npm install

# Inicie o servidor Vite (porta 5173):
npm run dev
```

### 5. Executar os Testes Automatizados
```bash
cd backend
npm test
```

---

<div align="center">
  <p>Desenvolvido com excelência técnica, segurança e visão de produto por <b>Aksurim Software</b>.</p>
  <p>© 2026 Aksurim Software — Todos os direitos reservados.</p>
</div>
