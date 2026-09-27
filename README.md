<div align="center">
  <img src="./frontend/public/logo-dark.png" alt="Aksurim Software" width="350" />
  <h1>Finanças Aksurim</h1>
  <p><b>Plataforma PWA de Gestão e Inteligência Financeira Compartilhada</b></p>
</div>

---

## 🚀 SOBRE O PROJETO

O **Finanças Aksurim** é um aplicativo web progressivo (PWA) de alto padrão, desenvolvido sob arquitetura **mobile-first** para o ecossistema SaaS. 

O produto foi desenhado para resolver o problema de inadimplência e desorganização familiar, fornecendo inteligência operacional:
1. **Fila Operacional Inteligente:** Ordenação algorítmica de contas por urgência (atrasadas -> vencendo hoje -> próximas).
2. **Visibilidade Compartilhada:** Rastreabilidade exata de quem pagou cada compromisso dentro da família.
3. **Prevenção de Juros:** Visão clara de fluxo de caixa e obrigações pendentes.

## 💎 FUNCIONALIDADES PREMIUM (FinTech Ready)

- **Motor de Relatórios Financeiros (PDF):** Sistema nativo de geração de documentos em PDF de altíssima qualidade (padrão corporativo). Os clientes podem exportar Relatórios Sintéticos ou Analíticos, contendo gráficos de distribuição por categoria e **Barras de Proporção Empilhadas (Linear Pie Charts)** desenhadas matematicamente direto no arquivo.
- **Dashboard Gerencial Unificado:** Interface limpa com métricas de "Qualidade de Histórico", gráficos de rosca e barras de evolução, fornecendo análise de dados em tempo real sobre a saúde financeira do usuário.
- **Fluxo de Autenticação Robusto:** Sistema de registro protegido por validação de e-mail (Lock Screen de Segurança) e recuperação de senha.
- **Painel Administrativo Global (Admin):** Área de gestão exclusiva (Cross-Tenant) para extração de Leads B2C (PDF/CSV) com captação de WhatsApp e métricas de uso do produto.
- **UX/UI Profissional:** Design System baseado em modo escuro nativo (Slate 950) e componentes interativos (Shadcn UI, Modais fluídos, Feedbacks visuais).

## 🛡️ ARQUITETURA E SEGURANÇA (Multi-Tenant)

Construído para escalar, o sistema obedece a rígidos padrões de segurança cibernética corporativa:
- **Tenant Isolation:** Acesso 100% isolado por `familyAccountId`. Os dados de um núcleo familiar jamais cruzam com outros.
- **Autenticação:** JWT (JSON Web Tokens) através do NestJS Passport.
- **Criptografia:** Bcrypt (salt rounds configuráveis) para senhas, e Tokens efêmeros e descartáveis (Burnable Tokens) para validação de e-mail e redefinição de senhas.
- **Infraestrutura SMTP:** Disparo de e-mails transacionais (Boas-vindas e Confirmação) usando templates HTML customizados de alto padrão via Nodemailer.

## 🛠️ STACK TECNOLÓGICA

**Backend (API Restful):**
- **Framework:** NestJS 10+ (TypeScript Strict Mode)
- **Banco de Dados:** MySQL 8.0 rodando em Docker
- **ORM:** Prisma ORM 5+
- **Bibliotecas:** PDFKit (Motor de PDF), Nodemailer (E-mails transacionais), Bcrypt, Passport.

**Frontend (PWA):**
- **Framework:** React 18+ (Vite 5+)
- **Estilização:** Tailwind CSS 3+ e Shadcn UI (Radix Primitives)
- **Data Viz:** Recharts (SVG Charts)
- **PWA:** Service Worker customizado e suporte a Web Push Notifications (VAPID).

## 💰 ESTRATÉGIA DE NEGÓCIOS E MONETIZAÇÃO

A plataforma adota a arquitetura **"Lead Magnet + Ads"**. Distribuída gratuitamente para o consumidor final, atua como uma poderosa máquina de captura de Leads (Nome, CPF, E-mail, WhatsApp e Perfil de Pagador) para monetização B2B.

Inclui nativamente espaços (AdBanners) dimensionados nas proporções **Interactive Advertising Bureau (IAB)** prontos para integração com **Google AdMob/AdSense**, garantindo renderização assíncrona sem prejudicar a métrica de Cumulative Layout Shift (CLS).

---

## ⚙️ AMBIENTE DE DESENVOLVIMENTO

Pré-requisitos: Node.js 20 LTS, npm e Docker.

**1. Subindo o Banco de Dados Local:**
```bash
# Na raiz do projeto, suba o container do MySQL:
docker-compose up -d
```

**2. Instalando Dependências e Preparando o Banco:**
```bash
# Backend
cd backend
npm install
npm run prisma:generate
npx prisma db push

# Frontend
cd frontend
npm install
```

**3. Inicializando os Servidores:**
```bash
# Em um terminal (Backend API na porta 3000)
cd backend && npm run start:dev

# Em outro terminal (Frontend PWA na porta 5173)
cd frontend && npm run dev
```

---
<div align="center">
  <p>Desenvolvido com excelência por <b>Aksurim Software</b></p>
</div>
