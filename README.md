<div align="center">
  <img src="./frontend/public/logo-full.png" alt="Aksurim Software" width="300" />
  <h1>Finanças Aksurim</h1>
  <p>Gestão de Compromissos Financeiros Compartilhados</p>
</div>

---

## SOBRE O PROJETO

O **Finanças Aksurim** é um aplicativo web progressivo (PWA) mobile-first para gestão de compromissos financeiros e quitação de despesas compartilhadas dentro de um núcleo familiar.

O produto resolve três problemas centrais:

1. Falta de visibilidade sobre vencimentos e atrasos de contas familiares, causando pagamento de juros e multas evitáveis.
2. Ausência de rastreabilidade individual sobre quem quitou cada compromisso dentro de uma família.
3. Inexistência de uma fila operacional priorizada que ordene as obrigações por urgência real (atrasadas -> vencendo hoje -> próximos dias -> futuras).

## STATUS DO PROJETO

- **Versão:** 1.0.0
- **Status:** MVP (Produção Pronta)

## TECNOLOGIAS

- **Linguagem:** TypeScript 5.x (strict mode)
- **Backend:** NestJS 10+ · Prisma ORM 5+ · MySQL 8.0
- **Frontend:** React 18+ · Vite 5+ · Tailwind CSS 3+ · Recharts
- **PWA:** Service Worker customizado · Web Push (VAPID)
- **Design System:** Dark Theme Nativo (Slate 950) focado em usabilidade noturna.

## SEGURANÇA CIBERNÉTICA E INTEGRIDADE

Este sistema foi construído sob rigorosos padrões de segurança:
- **Criptografia:** Senhas protegidas via bcrypt (salt rounds configuráveis).
- **Isolamento de Dados (Tenant Isolation):** Entidades protegidas por \`familyAccountId\`. Nenhum dado vaza para outros núcleos.
- **Autenticação Segura:** Proteção de rotas da API utilizando tokens JWT via NestJS Passport.
- **Leads Qualificados (Segurança na Identidade):** Validação de telefone (WhatsApp) embutida na modelagem para garantir a veracidade dos usuários no B2C.

## ESTRATÉGIA B2B E MONETIZAÇÃO (ADS)

O Finanças Aksurim implementa a arquitetura **"Lead Magnet + Ads"**. A plataforma é distribuída 100% gratuitamente para o usuário final, gerando Leads de altíssimo valor (com CPF, WhatsApp e perfil financeiro) para futuras parcerias de crédito B2B. 

O sistema de Design inclui nativamente o componente \`AdBanner\` configurado nas proporções exigidas pelo Interactive Advertising Bureau (IAB), pronto para receber injetáveis do **Google AdMob / AdSense** ou Parcerias Diretas sem causar quebra de layout (Cumulative Layout Shift).

## ESTRUTURA DO PROJETO

Este repositório é um **monorepo** com dois workspaces independentes:

\`\`\`text
/
|-- backend/            # API NestJS (TypeScript strict)
|   |-- src/            # Código-fonte da API
|   |-- prisma/         # Schema de Banco de Dados
|   |-- package.json
|-- frontend/           # PWA React + Vite (TypeScript strict)
|   |-- src/            # Código-fonte da aplicação
|   |-- public/         # Assets estáticos e manifesto PWA
|   |-- package.json
|-- deploy/             # Scripts de build e configuração Apache
|-- CHANGELOG.md
|-- README.md
\`\`\`

## COMO EXECUTAR O PROJETO

Pré-requisitos: Node.js 20 LTS e npm.

1. Instalar dependências de cada workspace:

\`\`\`bash
npm run install:all
\`\`\`

2. Inicializar os servidores:

\`\`\`bash
# Em um terminal (Backend)
cd backend && npm run start:dev

# Em outro terminal (Frontend)
cd frontend && npm run dev
\`\`\`
