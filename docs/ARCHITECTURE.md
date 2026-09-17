🏗️ ARCHITECTURE.md
Documento Oficial de Arquitetura Técnica — Aksurim Software


1. STACK TECNOLÓGICA

Linguagem: TypeScript 5.x (strict mode habilitado em 100% do ecossistema — backend e frontend)
Runtime Backend: Node.js 20 LTS
Framework Backend: NestJS 10+ (arquitetura modular com Controllers, Services, DTOs tipados, Injeção de Dependências)
Validação de DTOs: class-validator + class-transformer (decorators de validação em DTOs NestJS) com suporte complementar a Zod para schemas de validação em runtime
ORM: Prisma ORM 5+ (tipagem ponta-a-ponta, geração automática de migrations, cliente tipado)
Banco de Dados: MySQL 8.0 (gerenciado via cPanel / phpMyAdmin na Superdomínios)
Framework Frontend: React 18+ com Vite 5+ (build otimizado, HMR em desenvolvimento)
Estilização: Tailwind CSS 3+ (utility-first, mobile-first rigoroso)
Componentes UI: Radix UI Primitives + Shadcn/UI (componentes acessíveis, headless, customizáveis)
Gráficos/Visualização: Recharts (gráficos responsivos: Rosca e Barras)
Ícones: Lucide React
PWA: Service Worker customizado (cache de shell, instalação na tela inicial, Web Push via protocolo VAPID)
Infraestrutura de CI/CD: Pipeline Automatizado (Workstation Local) — Aksurim Engine


2. ESTRUTURA DO PROJETO

/
├── backend/
│   ├── src/
│   │   ├── app.module.ts                  # Módulo raiz NestJS
│   │   ├── main.ts                        # Bootstrap com porta dinâmica (process.env.PORT)
│   │   ├── prisma/
│   │   │   ├── schema.prisma              # Schema declarativo do banco de dados
│   │   │   └── prisma.service.ts          # Service de conexão Prisma (lifecycle hooks)
│   │   ├── auth/
│   │   │   ├── auth.module.ts
│   │   │   ├── auth.controller.ts         # POST /auth/login, POST /auth/register
│   │   │   ├── auth.service.ts            # Lógica de autenticação (bcrypt + JWT)
│   │   │   ├── jwt.strategy.ts            # Passport JWT Strategy
│   │   │   ├── jwt-auth.guard.ts          # Guard global de autenticação
│   │   │   └── dto/
│   │   │       ├── login.dto.ts
│   │   │       └── register.dto.ts
│   │   ├── family-account/
│   │   │   ├── family-account.module.ts
│   │   │   ├── family-account.controller.ts
│   │   │   ├── family-account.service.ts
│   │   │   └── dto/
│   │   │       └── create-family-account.dto.ts
│   │   ├── user/
│   │   │   ├── user.module.ts
│   │   │   ├── user.controller.ts
│   │   │   ├── user.service.ts
│   │   │   └── dto/
│   │   │       ├── create-user.dto.ts
│   │   │       └── update-user.dto.ts
│   │   ├── category/
│   │   │   ├── category.module.ts
│   │   │   ├── category.controller.ts
│   │   │   ├── category.service.ts
│   │   │   └── dto/
│   │   │       ├── create-category.dto.ts
│   │   │       └── update-category.dto.ts
│   │   ├── expense/
│   │   │   ├── expense.module.ts
│   │   │   ├── expense.controller.ts
│   │   │   ├── expense.service.ts         # Lógica de geração de PaymentItems por tipo
│   │   │   └── dto/
│   │   │       ├── create-expense.dto.ts
│   │   │       └── update-expense.dto.ts
│   │   ├── payment-item/
│   │   │   ├── payment-item.module.ts
│   │   │   ├── payment-item.controller.ts
│   │   │   ├── payment-item.service.ts    # Fila de pagamentos, quitação, ordenação por urgência
│   │   │   └── dto/
│   │   │       ├── pay-item.dto.ts
│   │   │       └── query-payment-items.dto.ts
│   │   ├── notification/
│   │   │   ├── notification.module.ts
│   │   │   ├── notification.service.ts    # Motor de Web Push com hierarquia de prioridade
│   │   │   ├── notification.cron.ts       # Cron Job — disparo às 05:00 BRT
│   │   │   └── dto/
│   │   │       └── subscribe-push.dto.ts
│   │   ├── dashboard/
│   │   │   ├── dashboard.module.ts
│   │   │   ├── dashboard.controller.ts
│   │   │   └── dashboard.service.ts       # Agregações: cards, distribuição por categoria, evolução mensal
│   │   └── common/
│   │       ├── decorators/
│   │       │   └── current-user.decorator.ts
│   │       ├── guards/
│   │       │   └── roles.guard.ts         # Guard de papéis (ADMIN | MEMBER)
│   │       ├── interceptors/
│   │       │   └── family-scope.interceptor.ts  # Injeta familyAccountId em todas as queries
│   │       └── filters/
│   │           └── http-exception.filter.ts
│   ├── test/
│   │   └── ...                            # Testes unitários e e2e
│   ├── .env                               # Variáveis de ambiente (DATABASE_URL, JWT_SECRET, VAPID_KEYS, PORT)
│   ├── tsconfig.json
│   ├── nest-cli.json
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── main.tsx                       # Entry point React
│   │   ├── App.tsx                        # Roteamento principal
│   │   ├── vite-env.d.ts
│   │   ├── service-worker.ts             # Service Worker PWA (cache, push listener)
│   │   ├── lib/
│   │   │   ├── api.ts                     # Cliente HTTP (Axios/Fetch) tipado
│   │   │   ├── utils.ts                   # Utilitários (formatCurrency, formatDate, getInitials)
│   │   │   └── constants.ts
│   │   ├── hooks/
│   │   │   ├── useAuth.ts
│   │   │   ├── usePaymentQueue.ts
│   │   │   └── useDashboard.ts
│   │   ├── components/
│   │   │   ├── ui/                        # Componentes Shadcn/UI (Button, Card, Dialog, Drawer, Badge, etc.)
│   │   │   ├── layout/
│   │   │   │   ├── AppShell.tsx
│   │   │   │   ├── BottomNav.tsx          # Navegação mobile-first
│   │   │   │   └── Header.tsx
│   │   │   ├── expense/
│   │   │   │   ├── ExpenseForm.tsx
│   │   │   │   └── ExpenseCard.tsx
│   │   │   ├── payment/
│   │   │   │   ├── PaymentQueue.tsx       # Fila principal com ordenação por urgência
│   │   │   │   ├── PaymentCard.tsx        # Card individual com indicador colorido
│   │   │   │   └── PayDrawer.tsx          # Gaveta modal de quitação
│   │   │   ├── dashboard/
│   │   │   │   ├── SummaryCards.tsx
│   │   │   │   ├── CategoryDonut.tsx      # Gráfico Rosca (Recharts)
│   │   │   │   └── MonthlyBars.tsx        # Gráfico Barras 12 meses (Recharts)
│   │   │   └── member/
│   │   │       ├── MemberBadge.tsx        # Badge colorido com iniciais
│   │   │       └── MemberFilter.tsx
│   │   ├── pages/
│   │   │   ├── LoginPage.tsx
│   │   │   ├── RegisterPage.tsx
│   │   │   ├── QueuePage.tsx              # Página principal — Fila de Pagamentos
│   │   │   ├── DashboardPage.tsx
│   │   │   ├── ExpensesPage.tsx
│   │   │   ├── CategoriesPage.tsx
│   │   │   └── SettingsPage.tsx
│   │   └── contexts/
│   │       └── AuthContext.tsx
│   ├── public/
│   │   ├── manifest.json                  # Manifesto PWA
│   │   ├── icons/                         # Ícones PWA (192x192, 512x512)
│   │   └── favicon.ico
│   ├── index.html
│   ├── tailwind.config.ts
│   ├── vite.config.ts
│   ├── tsconfig.json
│   └── package.json
├── docs/                                  # Uso interno Aksurim — Ignorado no Git (.gitignore)
│   ├── BLUEPRINT.md
│   ├── ARCHITECTURE.md
│   ├── REGRAS.md
│   └── CHECKLIST.md
├── CHANGELOG.md                           # Público — Enviado ao GitHub
├── README.md                              # Público — Enviado ao GitHub
├── .gitignore
└── deploy/
    ├── build.sh                           # Script de build unificado (backend + frontend)
    └── .htaccess                          # Configuração Apache para SPA + headers de segurança


3. BANCO DE DADOS & APIS

3.1 MODELO DECLARATIVO PRISMA (schema.prisma)

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "mysql"
  url      = env("DATABASE_URL")
}

// ═══════════════════════════════════════════
// ENUMS
// ═══════════════════════════════════════════

enum Role {
  ADMIN
  MEMBER
}

enum ExpenseType {
  SINGLE
  INSTALLMENT
  RECURRENT
}

enum ExpenseRecurrenceStatus {
  ACTIVE
  CANCELLED
}

enum PaymentStatus {
  PENDING
  PAID
}

// ═══════════════════════════════════════════
// ENTIDADES
// ═══════════════════════════════════════════

model FamilyAccount {
  id            String    @id @default(uuid())
  name          String    @db.VarChar(100)
  ownerCpf      String    @unique @db.VarChar(14)
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt

  users         User[]
  categories    Category[]
  expenses      Expense[]

  @@map("family_accounts")
}

model User {
  id              String    @id @default(uuid())
  name            String    @db.VarChar(100)
  email           String    @unique @db.VarChar(255)
  passwordHash    String    @db.VarChar(255)
  role            Role      @default(MEMBER)
  avatarColor     String    @db.VarChar(7)    // Código hex: #FF5733
  initials        String    @db.VarChar(3)    // Gerado automaticamente a partir do name
  familyAccountId String
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt

  familyAccount   FamilyAccount @relation(fields: [familyAccountId], references: [id])
  createdExpenses Expense[]     @relation("CreatedBy")
  paidItems       PaymentItem[] @relation("PaidBy")
  pushSubscriptions PushSubscription[]

  @@index([familyAccountId])
  @@index([email])
  @@map("users")
}

model Category {
  id              String    @id @default(uuid())
  name            String    @db.VarChar(60)
  color           String    @db.VarChar(7)    // Código hex: #3B82F6
  icon            String    @db.VarChar(50)   // Nome do ícone Lucide (ex: "home", "zap")
  familyAccountId String
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt

  familyAccount   FamilyAccount @relation(fields: [familyAccountId], references: [id])
  expenses        Expense[]

  @@index([familyAccountId])
  @@map("categories")
}

model Expense {
  id                String                  @id @default(uuid())
  title             String                  @db.VarChar(150)
  description       String?                 @db.Text
  type              ExpenseType
  totalAmount       Int                     // Valor total em centavos (ex: 15075 = R$ 150,75)
  statusRecurrence  ExpenseRecurrenceStatus @default(ACTIVE)
  categoryId        String
  familyAccountId   String
  createdById       String
  createdAt         DateTime                @default(now())
  updatedAt         DateTime                @updatedAt
  deletedAt         DateTime?               // Soft delete — NULL = ativo

  category          Category        @relation(fields: [categoryId], references: [id])
  familyAccount     FamilyAccount   @relation(fields: [familyAccountId], references: [id])
  createdBy         User            @relation("CreatedBy", fields: [createdById], references: [id])
  paymentItems      PaymentItem[]

  @@index([familyAccountId])
  @@index([categoryId])
  @@index([createdById])
  @@index([deletedAt])
  @@map("expenses")
}

model PaymentItem {
  id                String        @id @default(uuid())
  expenseId         String
  dueDate           DateTime      @db.Date
  installmentNumber Int           // Número da parcela (1-indexed). Para SINGLE: sempre 1. Para RECURRENT: sequencial mensal.
  totalInstallments Int           // Total de parcelas. Para SINGLE: 1. Para RECURRENT: 0 (indeterminado).
  expectedAmount    Int           // Valor previsto em centavos
  paidAmount        Int?          // Valor efetivamente pago em centavos (NULL = não pago)
  paidAt            DateTime?     // Timestamp da baixa
  paidById          String?       // ID do usuário que quitou
  status            PaymentStatus @default(PENDING)
  notes             String?       @db.Text   // Anotações livres de quitação
  createdAt         DateTime      @default(now())
  updatedAt         DateTime      @updatedAt

  expense           Expense       @relation(fields: [expenseId], references: [id])
  paidBy            User?         @relation("PaidBy", fields: [paidById], references: [id])

  @@index([expenseId])
  @@index([dueDate])
  @@index([status])
  @@index([paidById])
  @@map("payment_items")
}

model PushSubscription {
  id        String   @id @default(uuid())
  userId    String
  endpoint  String   @db.Text
  p256dh    String   @db.VarChar(255)   // Chave pública VAPID
  auth      String   @db.VarChar(255)   // Token de autenticação VAPID
  createdAt DateTime @default(now())

  user      User     @relation(fields: [userId], references: [id])

  @@index([userId])
  @@map("push_subscriptions")
}
```

3.2 ESPECIFICAÇÃO DE ENDPOINTS REST (NestJS)

Prefixo global da API: `/api/v1`
Autenticação: Bearer Token JWT em todas as rotas (exceto login e register).
Escopo familiar: Todas as rotas autenticadas recebem o familyAccountId injetado automaticamente via FamilyScopeInterceptor (extraído do JWT do usuário logado). Nenhuma rota aceita familyAccountId via parâmetro — o escopo é sempre derivado do token.

─────────────────────────────────────────────
MÓDULO: AUTH
─────────────────────────────────────────────

POST /api/v1/auth/register
  Descrição: Cria uma nova FamilyAccount + primeiro usuário (ADMIN).
  Body: { name: string, email: string, password: string, familyName: string, ownerCpf: string }
  Validações: email (IsEmail), password (MinLength 8), ownerCpf (formato CPF válido, único)
  Response 201: { accessToken: string, user: { id, name, email, role, initials, avatarColor } }
  Errors: 409 (email ou CPF já cadastrado), 400 (validação falhou)

POST /api/v1/auth/login
  Descrição: Autentica um usuário existente.
  Body: { email: string, password: string }
  Response 200: { accessToken: string, user: { id, name, email, role, initials, avatarColor, familyAccountId } }
  Errors: 401 (credenciais inválidas)

─────────────────────────────────────────────
MÓDULO: USERS (Requer ADMIN)
─────────────────────────────────────────────

GET /api/v1/users
  Descrição: Lista todos os membros do workspace familiar.
  Response 200: User[]

POST /api/v1/users
  Descrição: Convida um novo membro para o workspace.
  Body: { name: string, email: string, password: string, role: Role, avatarColor: string }
  Response 201: User
  Errors: 409 (email já cadastrado), 403 (não é ADMIN)

PATCH /api/v1/users/:id
  Descrição: Atualiza dados de um membro.
  Body: { name?: string, avatarColor?: string, role?: Role }
  Response 200: User
  Errors: 404 (usuário não encontrado no workspace)

DELETE /api/v1/users/:id
  Descrição: Remove um membro do workspace.
  Response 204
  Errors: 403 (não é ADMIN), 400 (não pode remover a si mesmo se for único ADMIN)

─────────────────────────────────────────────
MÓDULO: CATEGORIES
─────────────────────────────────────────────

GET /api/v1/categories
  Response 200: Category[]

POST /api/v1/categories (Requer ADMIN)
  Body: { name: string, color: string, icon: string }
  Response 201: Category

PATCH /api/v1/categories/:id (Requer ADMIN)
  Body: { name?: string, color?: string, icon?: string }
  Response 200: Category

DELETE /api/v1/categories/:id (Requer ADMIN)
  Response 204
  Errors: 409 (categoria possui despesas vinculadas)

─────────────────────────────────────────────
MÓDULO: EXPENSES
─────────────────────────────────────────────

GET /api/v1/expenses
  Descrição: Lista despesas ativas do workspace (filtra deletedAt = NULL).
  Query: { type?: ExpenseType, categoryId?: string, page?: number, limit?: number }
  Response 200: { data: Expense[], total: number, page: number }

GET /api/v1/expenses/:id
  Descrição: Detalhe de uma despesa com seus PaymentItems.
  Response 200: Expense & { paymentItems: PaymentItem[] }

POST /api/v1/expenses
  Descrição: Cria uma despesa e gera automaticamente os PaymentItems conforme o tipo.
  Body: {
    title: string,
    description?: string,
    type: ExpenseType,
    totalAmount: number (centavos),
    categoryId: string,
    dueDate: string (ISO 8601) — obrigatório para SINGLE e primeiro vencimento de INSTALLMENT/RECURRENT,
    totalInstallments?: number — obrigatório para INSTALLMENT (min: 2)
  }
  Response 201: Expense & { paymentItems: PaymentItem[] }
  Lógica interna:
    - SINGLE: Gera 1 PaymentItem (expectedAmount = totalAmount, dueDate = informado).
    - INSTALLMENT: Gera N PaymentItems. expectedAmount = floor(totalAmount / N) para parcelas 1..N-1. Última parcela = totalAmount - (expectedAmount * (N-1)). dueDate incrementa 1 mês para cada parcela.
    - RECURRENT: Gera PaymentItem para o mês corrente. totalInstallments = 0 (indeterminado).

PATCH /api/v1/expenses/:id
  Descrição: Atualiza dados de uma despesa. Para RECURRENT, alteração de totalAmount gera novos PaymentItems futuros com o novo valor.
  Body: { title?: string, description?: string, categoryId?: string, totalAmount?: number }
  Response 200: Expense

DELETE /api/v1/expenses/:id
  Descrição: Soft delete — preenche deletedAt com timestamp atual.
  Response 204

POST /api/v1/expenses/:id/restore
  Descrição: Restaura despesa excluída — limpa deletedAt.
  Response 200: Expense

POST /api/v1/expenses/:id/cancel-recurrence
  Descrição: Encerra recorrência — define statusRecurrence = CANCELLED. PaymentItems futuros com status PENDING são removidos.
  Response 200: Expense
  Errors: 400 (despesa não é RECURRENT ou já cancelada)

─────────────────────────────────────────────
MÓDULO: PAYMENT ITEMS (Fila de Pagamentos)
─────────────────────────────────────────────

GET /api/v1/payment-items/queue
  Descrição: Retorna a fila de pagamentos pendentes do workspace, ordenada por urgência (atraso → mês atual → futuros → dueDate ASC).
  Query: { month?: number, year?: number, paidById?: string }
  Response 200: {
    overdue: PaymentItem[],
    currentMonth: PaymentItem[],
    upcoming: PaymentItem[]
  }

GET /api/v1/payment-items/history
  Descrição: Histórico de pagamentos já quitados com badge do pagador.
  Query: { month?: number, year?: number, paidById?: string, categoryId?: string, page?: number, limit?: number }
  Response 200: { data: (PaymentItem & { paidBy: { initials, avatarColor } })[], total: number }

PATCH /api/v1/payment-items/:id/pay
  Descrição: Quita um PaymentItem.
  Body: { paidAmount: number (centavos), paidAt: string (ISO 8601), notes?: string }
  Validações: paidAmount > 0, status atual deve ser PENDING.
  Response 200: PaymentItem (com status = PAID, paidById = usuário logado)
  Errors: 400 (já pago ou valor inválido), 404 (item não encontrado no workspace)

PATCH /api/v1/payment-items/:id
  Descrição: Ajuste fino do valor previsto de uma parcela específica.
  Body: { expectedAmount: number (centavos) }
  Validações: expectedAmount > 0, status deve ser PENDING.
  Response 200: PaymentItem

─────────────────────────────────────────────
MÓDULO: DASHBOARD
─────────────────────────────────────────────

GET /api/v1/dashboard/summary
  Descrição: Cards resumo do mês.
  Query: { month: number, year: number }
  Response 200: {
    totalPaidMonth: number (centavos),
    totalPendingMonth: number (centavos),
    memberBreakdown: { userId: string, name: string, initials: string, avatarColor: string, totalPaid: number }[]
  }

GET /api/v1/dashboard/category-distribution
  Descrição: Distribuição percentual de gastos por categoria (para gráfico de Rosca).
  Query: { month: number, year: number }
  Response 200: { categoryId: string, name: string, color: string, totalAmount: number, percentage: number }[]

GET /api/v1/dashboard/monthly-evolution
  Descrição: Evolução mensal de despesas nos 12 meses do ano (para gráfico de Barras).
  Query: { year: number }
  Response 200: { month: number, totalPaid: number, totalPending: number }[]

─────────────────────────────────────────────
MÓDULO: NOTIFICATIONS (Web Push)
─────────────────────────────────────────────

POST /api/v1/notifications/subscribe
  Descrição: Registra subscription de Web Push do navegador do usuário.
  Body: { endpoint: string, keys: { p256dh: string, auth: string } }
  Response 201: PushSubscription

DELETE /api/v1/notifications/subscribe
  Descrição: Remove subscription de Web Push.
  Body: { endpoint: string }
  Response 204

A rotina de disparo (notification.cron.ts) NÃO é acessível via API. É executada exclusivamente pelo Cron Job do cPanel às 05:00 BRT.


4. TOPOLOGIA DE ORQUESTRAÇÃO E BUILD

Este projeto utiliza um Pipeline de Build e Validação Contínua (CV) rodando localmente na IDE.
- Módulo Supervisor: Gerencia o fluxo, planeja tarefas e audita diffs.
- Módulo Executor: Realiza alterações físicas e roda testes.
- Notificações: Em caso de falha de pipeline superior a 3 retentativas (Circuit Breaker ativado), o motor suspende as atividades e notifica o Engenheiro Responsável via Webhook (Telegram).

4.1 TOPOLOGIA DE DEPLOY (Superdomínios / cPanel)

Diretório Privado (Backend — NestJS):
  Localização: /home/usuario/.apps/gestao-gastos-api/ (diretório restrito acima de public_html)
  Execução: Node.js App Manager do cPanel com porta dinâmica injetada via process.env.PORT
  Conexão com banco: Prisma aponta para MySQL local via socket/localhost
  Variáveis de ambiente (.env):
    - DATABASE_URL=mysql://usuario:senha@localhost:3306/financas_aksurim
    - JWT_SECRET=<chave-secreta-256-bits>
    - JWT_EXPIRES_IN=7d
    - VAPID_PUBLIC_KEY=<chave-publica-vapid>
    - VAPID_PRIVATE_KEY=<chave-privada-vapid>
    - VAPID_SUBJECT=mailto:lucena@aksurim.com
    - PORT=<injetado-pelo-cpanel>
    - NODE_ENV=production
    - TZ=America/Sao_Paulo

Diretório Público (Frontend — React/Vite):
  Localização: public_html/ ou subdomínio dedicado (ex: financas.aksurim.com)
  Assets: Build estático otimizado gerado pelo Vite (pasta dist/)
  Servidor web: Apache com .htaccess configurado

Configuração .htaccess (Frontend):
```apache
# Compressão
<IfModule mod_deflate.c>
  AddOutputFilterByType DEFLATE text/html text/css text/javascript application/javascript application/json image/svg+xml
</IfModule>

# Cache de assets estáticos
<IfModule mod_expires.c>
  ExpiresActive On
  ExpiresByType text/css "access plus 1 year"
  ExpiresByType application/javascript "access plus 1 year"
  ExpiresByType image/png "access plus 1 year"
  ExpiresByType image/svg+xml "access plus 1 year"
  ExpiresByType application/font-woff2 "access plus 1 year"
</IfModule>

# Headers de Segurança HTTP
<IfModule mod_headers.c>
  Header set X-Content-Type-Options "nosniff"
  Header set X-Frame-Options "DENY"
  Header set X-XSS-Protection "1; mode=block"
  Header set Referrer-Policy "strict-origin-when-cross-origin"
  Header set Permissions-Policy "camera=(), microphone=(), geolocation=()"
</IfModule>

# Fallback SPA — redireciona todas as rotas para index.html
<IfModule mod_rewrite.c>
  RewriteEngine On
  RewriteBase /
  RewriteRule ^index\.html$ - [L]
  RewriteCond %{REQUEST_FILENAME} !-f
  RewriteCond %{REQUEST_FILENAME} !-d
  RewriteRule . /index.html [L]
</IfModule>
```

Cron Job (cPanel):
  Schedule: 0 5 * * * (diariamente às 05:00 BRT)
  Comando: cd /home/usuario/.apps/gestao-gastos-api && node dist/notification-cron.js
  Função: Executa a rotina de varredura de pendências e disparo de Web Push Notifications com hierarquia de prioridade (P1 → P2 → P3 → Silêncio) para cada FamilyAccount.

4.2 SCRIPTS DE BUILD

build.sh (deploy/build.sh):
```bash
#!/bin/bash
set -e

echo "═══ Aksurim Build Pipeline ═══"

# Backend
echo "[1/4] Building backend..."
cd backend
npm ci --production=false
npx prisma generate
npx prisma migrate deploy
npm run build
cd ..

# Frontend
echo "[2/4] Building frontend..."
cd frontend
npm ci --production=false
npm run build
cd ..

# Deploy Frontend
echo "[3/4] Deploying frontend assets..."
rsync -av --delete frontend/dist/ /home/usuario/public_html/

# Restart Backend
echo "[4/4] Restarting backend..."
# O restart é feito via Node.js App Manager do cPanel (interface web)

echo "═══ Build Complete ═══"
```


5. SEGURANÇA

5.1 Autenticação:
- Hash de senhas: bcrypt com salt rounds = 12.
- Tokens: JWT (JSON Web Token) assinado com chave secreta de 256 bits. Payload contém: userId, email, role, familyAccountId. Expiração: 7 dias.
- Transmissão: Token enviado via header Authorization: Bearer <token> em todas as requisições autenticadas.

5.2 Autorização:
- Guard de papéis (RolesGuard): Validação de permissão ADMIN/MEMBER em rotas protegidas via decorator @Roles(Role.ADMIN).
- FamilyScopeInterceptor: Interceptor global que extrai familyAccountId do JWT e injeta como filtro obrigatório em todas as queries do Prisma. Garante isolamento multi-tenant sem depender do frontend.

5.3 Variáveis de Ambiente:
- Todas as credenciais sensíveis (DATABASE_URL, JWT_SECRET, VAPID_KEYS) residem exclusivamente no arquivo .env do diretório privado do backend.
- O arquivo .env DEVE constar no .gitignore e NUNCA ser enviado ao repositório.
- Chaves VAPID são geradas uma única vez via web-push generate-vapid-keys e armazenadas no .env.

5.4 Proteções Adicionais:
- Headers de segurança HTTP configurados no .htaccess (X-Content-Type-Options, X-Frame-Options, X-XSS-Protection, Referrer-Policy, Permissions-Policy).
- Compressão DEFLATE ativa para reduzir tamanho de payloads.
- CORS configurado no NestJS para aceitar requests apenas do domínio do frontend.
- Rate limiting recomendado via @nestjs/throttler para proteção contra brute force no endpoint de login.

5.5 Proteção de Dados Sensíveis:
- CPF do titular: Armazenado com máscara no banco (XXX.XXX.XXX-XX). Exibido no frontend apenas de forma parcial (***.***.XXX-XX).
- Senhas: Nunca retornadas em nenhuma response da API. O campo passwordHash é explicitamente excluído de todos os selects do Prisma.


6. HISTÓRICO TÉCNICO

2026-09-17 | Definição completa da arquitetura técnica | Tradução do briefing de produto para documentação de engenharia. Stack, schema Prisma, contratos REST e topologia de deploy definidos. | Motivo: Preparação para execução autônoma via esteira de orquestração multiagente (Aksurim Engine).
