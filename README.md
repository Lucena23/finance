<div align="center">
  <img src="./frontend/public/logo-dark.png" alt="Aksurim Software" width="350" />
  <h1>Aksurim Controle</h1>
  <p><b>Plataforma PWA de Gestão e Inteligência Financeira Compartilhada</b></p>

  <img src="https://img.shields.io/badge/Architecture-Mobile%20First-06777F?style=for-the-badge" alt="Mobile First" />
  <img src="https://img.shields.io/badge/Security-OWASP%20Hardened-FB4629?style=for-the-badge" alt="Security" />
  <img src="https://img.shields.io/badge/Tech-React%20%7C%20NestJS-282828?style=for-the-badge" alt="Tech Stack" />
</div>

<br/>

## 🚀 VISÃO EXECUTIVA E PORTFÓLIO

O **Aksurim Controle** é um aplicativo web progressivo (PWA) de alto padrão, desenvolvido sob arquitetura **mobile-first** para o ecossistema SaaS. Criado e mantido pela **Aksurim Software**, este projeto atua não apenas como uma ferramenta de gestão, mas como o **Portfólio Oficial de Apresentação** da nossa capacidade técnica e engenharia de software para grandes empresas e investidores.

O produto foi rigorosamente projetado para resolver o problema de inadimplência e desorganização familiar, fornecendo inteligência operacional:
1. **Fila Operacional Inteligente:** Ordenação algorítmica de contas por urgência (atrasadas -> vencendo hoje -> próximas).
2. **Visibilidade Compartilhada:** Rastreabilidade exata de quem pagou cada compromisso dentro do núcleo familiar.
3. **Prevenção de Juros:** Visão clara do fluxo de caixa, despesas categóricas e obrigações pendentes em tempo real.

## 🛡️ CIBERSEGURANÇA E ARQUITETURA (Enterprise-Grade)

O sistema foi estruturado para lidar com dados financeiros sensíveis, seguindo rígidos padrões de segurança cibernética corporativa (OWASP Top 10):

- **Isolamento de Tenant (BOLA/IDOR Prevention):** Acesso 100% isolado por `familyAccountId`. Os dados de um núcleo jamais cruzam com outros. O ID é inferido criptograficamente no backend a partir do JWT, impossibilitando acessos indevidos via manipulação de rotas.
- **API Hardened (Helmet & CORS):** Servidor NestJS protegido pela biblioteca `Helmet` para ofuscação de tecnologias e mitigação de vulnerabilidades HTTP. Políticas rigorosas de Cross-Origin Resource Sharing (CORS).
- **Zero Injeção de Código (SQLi / XSS):** Uso estrito do Prisma ORM sem queries manuais (impedindo SQL Injection) e motor React com DOM higienizado contra Cross-Site Scripting (XSS).
- **Criptografia Avançada:** Hashing de senhas com `Bcrypt` (Salt Rounds de grau comercial) e emissão de tokens de sessão curtos e seguros.

## 💎 FUNCIONALIDADES PREMIUM (FinTech Ready)

- **Landing Page Profissional:** Uma vitrine (Front Page) imersiva com forte apelo visual, apresentando os pilares de produto (Controle, Redução de Juros e Conexão Familiar) desenhada para converter leads e novos parceiros com alta performance.
- **Motor de Relatórios Financeiros (PDF):** Geração nativa de documentos corporativos em alta resolução com gráficos vetorizados desenhados matematicamente no backend.
- **Dashboard Gerencial Analítico:** Interface imersiva que cruza dados analíticos com suporte à filtragem em tempo real de Meses e Anos, apresentando a "Qualidade de Histórico" e comparativos gráficos precisos.
- **Monetização e Mídia Interativa:** Módulo customizado de Anúncios nativos integrado fluidamente ao PWA. Renderização "Pixel-Perfect" de banners promocionais híbridos direcionando tráfego qualificado para parcerias e patrocínios (Mídia Kit) via modal de Suporte.
- **Fluxo UX Inteligente:** Autenticação responsiva com rotas restritas e proteção JWT, setup de categorias automáticas padronizadas injetadas no banco de dados no momento do cadastro (Seamless Onboarding) e gerenciamento otimizado de cache.

## 🛠️ STACK TECNOLÓGICA

**Backend (API Restful):**
- **Framework:** NestJS 10+ (TypeScript Strict Mode)
- **Banco de Dados:** Prisma ORM, MySQL/PostgreSQL via Docker
- **Segurança:** Helmet, Bcrypt, Passport JWT
- **Serviços:** PDFKit (PDFs), Nodemailer (E-mails transacionais)

**Frontend (PWA):**
- **Framework:** React 18+ (Vite 5+)
- **Estilização:** Tailwind CSS 3+, Shadcn UI, Lucide Icons
- **Roteamento:** React Router DOM (Rotas Autenticadas e Públicas)
- **Data Viz:** Recharts (SVG Charts customizados)
- **PWA:** Service Worker para caching offline e WebManifest.

---
<p align="center">
Desenvolvido com excelência técnica por <b>Aksurim Software</b>.
</p>
