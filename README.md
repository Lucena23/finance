<div align="center">
  <img src="./frontend/public/logo-dark.png" alt="Aksurim Software" width="350" />
  <h1>Aksurim Controle</h1>
  <p><b>Plataforma SaaS & PWA de Gestão e Inteligência Financeira Individual e Compartilhada</b></p>

  <img src="https://img.shields.io/badge/Release-v1.2.4%20Freemium-F59E0B?style=for-the-badge" alt="Version 1.2.4" />
  <img src="https://img.shields.io/badge/Architecture-Mobile%20First%20PWA-06777F?style=for-the-badge" alt="Mobile First" />
  <img src="https://img.shields.io/badge/Security-OWASP%20Hardened-FB4629?style=for-the-badge" alt="Security" />
  <img src="https://img.shields.io/badge/LGPD-Compliant-10B981?style=for-the-badge" alt="LGPD Compliant" />
  <img src="https://img.shields.io/badge/Tech-React%20%7C%20NestJS-282828?style=for-the-badge" alt="Tech Stack" />
</div>

<br/>

## 🚀 VISÃO EXECUTIVA E POSICIONAMENTO DE MERCADO

O **Aksurim Controle** é um aplicativo web progressivo (**PWA**) de alto padrão, desenvolvido sob arquitetura **Mobile-First** e **Dark-UI Nativa** para o ecossistema SaaS FinTech. Projetado, construído e mantido pela **Aksurim Software**, este produto atua tanto como uma solução comercial escalável quanto como o **Portfólio Oficial de Engenharia de Software** da empresa para clientes corporativos, parceiros estratégicos e investidores.

Diferente de planilhas estáticas ou aplicativos pessoais isolados, o **Aksurim Controle** resolve a desorganização financeira e a inadimplência em **qualquer núcleo de despesas compartilhadas ou individuais**:
- 🏠 **Famílias e Casais:** Visibilidade transparente das contas da residência sem atritos.
- 🎓 **Repúblicas Estudantis e Colegas de Apartamento:** Rateio claro e rastreabilidade exata de quem quitou cada despesa do mês.
- 🎉 **Comissões de Formatura, Viagens e Eventos entre Amigos:** Controle centralizado de caixa com múltiplos participantes auditáveis.
- 💼 **Profissionais Autônomos e Gestão Individual:** Previsibilidade de fluxo de caixa mensal e anual em tempo real.

### Pilares Operacionais
1. **Fila Operacional Inteligente:** Ordenação algorítmica de compromissos por criticidade (`Atrasadas` → `Vencendo Hoje` → `Próximas` → `Pagas`), com rolagem automática de pendências vencidas para o mês corrente.
2. **Rastreabilidade Compartilhada (Multi-Membros):** Identificação visual imediata por avatar e histórico detalhado de qual participante realizou cada baixa parcial ou integral.
3. **Prevenção de Juros e Multas:** Alertas inteligentes via **Web Push Notifications** e notificações transacionais automatizadas antes do vencimento.

---

## 👑 MODELO DE NEGÓCIO HÍBRIDO: SAAS FREEMIUM + ADTECH (v1.2)

Na versão **1.2**, o **Aksurim Controle** opera sob uma arquitetura de monetização dupla altamente escalável: **Assinaturas Recorrentes (👑 Premium)** combinadas com **Mídia Nativa de Patrocínio (AdTech)**.

### Experiência de Assinatura e Retenção Inteligente
- **Degustação Automática no Onboarding:** Todo novo cadastro inicia automaticamente com período de experiência **👑 Premium gratuito**, sem exigir cartão de crédito no cadastro.
- **Oferta de Conversão Antecipada:** Condição promocional exclusiva para novos usuários que ativam a assinatura durante o período de avaliação.
- **Ciclos Flexíveis:** Planos **Mensal**, **Semestral** e **Anual** com economia progressiva.
- **Período de Tolerância Automático:** Carência inteligente antes da aplicação de restrições visuais, evitando bloqueios abruptos por compensação bancária.
- **Retenção sem Perda de Dados:** No plano gratuito, **nenhum lançamento futuro, parcelado, recorrente ou histórico é excluído**. As restrições atuam exclusivamente na camada de visualização e produtividade avançada, preservando 100% do patrimônio de dados do cliente.

### Comparativo de Recursos: Plano Free vs. 👑 Premium

| Recurso / Módulo | Plano Free | 👑 Plano Premium |
| :--- | :--- | :--- |
| **Fila Operacional & Painel** | Mês atual + próximo mês liberados | **Todos os meses passados e futuros liberados** |
| **Histórico e Meses Futuros** | Visualização em *Glassmorphism/Blur* com resumo de itens | **Desbloqueio total instantâneo** |
| **Rolagem de Contas Atrasadas** | Contas vencidas aparecem normalmente no mês atual para baixa | Histórico completo + visão mensal detalhada |
| **Gráfico de Evolução Anual (12 Meses)** | Meses fora da janela exibidos com indicador Premium | **Comparativo analítico completo dos 12 meses** |
| **Categorias Personalizadas** | Até **5 categorias** ativas | **Categorias ilimitadas** |
| **Membros e Participantes** | Membros convidados em modo **Somente Leitura** | **Acesso colaborativo completo** (criar, editar, categorizar e quitar) |
| **Relatórios Executivos em PDF** | Exclusivo 👑 Premium | **Relatórios Sintético e Analítico com gráficos vetoriais** |
| **Portabilidade de Dados (CSV — LGPD)** | **Liberado gratuitamente para o Titular** | **Liberado para Titular e Membros** |
| **Suporte & Mídia de Parceiros** | Acesso total ao suporte e ofertas de parceiros | Acesso total ao suporte e ofertas de parceiros |

---

## 🛡️ CIBERSEGURANÇA, PRIVACIDADE (LGPD) E GOVERNANÇA

O sistema foi arquitetado sob princípios de **Security by Design** e **Defense in Depth**, alinhado às diretrizes corporativas **OWASP Top 10** e à **Lei Geral de Proteção de Dados (Lei nº 13.709/2018)**:

- **Isolamento Criptográfico Multi-Tenant:** Acesso 100% segregado por conta/núcleo diretamente na camada de sessão autenticada, impedindo qualquer vazamento horizontal de dados entre diferentes grupos (*Zero-Trust Tenant Isolation*).
- **Higiene de Sessão Padrão FinTech:** Controle ativo de ciclo de vida de sessão com expiração automática por inatividade (*Idle Timeout*) em navegadores e PWAs instalados, revogação imediata em caso de invalidação de credenciais e limpeza segura de estado local.
- **Validação em Dupla Camada:** Todas as regras de negócio, limites operacionais e controles de assinatura são auditados e validados no servidor, independentemente da interface cliente.
- **Hardening de API & Criptografia:** Proteção de cabeçalhos HTTP de segurança, políticas estritas de origem cruzada (CORS), sanitização rigorosa de payloads contra injeção de código (SQLi / XSS), hashing criptográfico de credenciais e controle de frequência (*Cooldown / Rate-Limiting*) em fluxos sensíveis de mensageria.
- **Conformidade LGPD Nativa:** Garantia do direito de **Portabilidade de Dados (Art. 18, V)** com exportação estruturada em CSV para o titular da conta, mascaramento de dados sensíveis e preservação íntegra do histórico financeiro em desligamentos de membros.

---

## 💎 DIFERENCIAIS TÉCNICOS (FinTech-Grade)

- **Design System Dark-First Nativo:** Interface imersiva de alto contraste construída com foco em ergonomia mobile, microinterações fluidas e carregamento instantâneo.
- **Motor Nativo de Relatórios Vetoriais (PDF):** Geração server-side de relatórios executivos sintéticos e analíticos em alta resolução, com gráficos desenhados matematicamente em memória.
- **Dashboard Gerencial Analítico:** Cruzamento em tempo real de indicadores financeiros (KPIs), distribuição percentual por categoria e evolução anual de adimplência.
- **Ecossistema de Mídia Patrocinada (AdTech):** Módulo nativo de banners promocionais não-intrusivos integrado à experiência do usuário, conectando marcas parceiras ao público da plataforma.
- **Arquitetura PWA Instalável:** Experiência de aplicativo nativo em **Android, iOS e Desktop**, com suporte a instalação direta e notificações push.

---

## 🛠️ STACK TECNOLÓGICA PRINCIPAL

- **Frontend (PWA):** React 18, TypeScript, Vite, Tailwind CSS, Shadcn UI, Recharts, Service Workers & Web Push API.
- **Backend (API):** NestJS, TypeScript (Strict Mode), ORM Relacional Tipado, Autenticação JWT, Motor Gráfico PDF e Mensageria Transacional.
- **Qualidade & Confiabilidade:** Suíte automatizada de testes unitários e de regressão cobrindo regras financeiras, segurança de rotas e ciclo de vida de planos.

---

## 🔖 GOVERNANÇA DE RELEASES E VERSIONAMENTO (SemVer)

O **Aksurim Controle** adota o padrão internacional de **Versionamento Semântico (`MAJOR.MINOR.PATCH` — SemVer 2.0.0)**, com identificação da versão ativa diretamente na interface do aplicativo (`Configurações` → rodapé `v1.2.4`):
- **MAJOR (`1.x.x`):** Arquitetura base de produção e contratos principais da plataforma.
- **MINOR (`x.2.x`):** Ciclos de evolução funcional e de modelo de negócio (ex.: `v1.1` Atualizações Operacionais, `v1.2` Ecossistema Freemium & AdTech).
- **PATCH (`x.x.4`):** Correções cirúrgicas (*hotfixes*), refinamentos de compatibilidade multi-plataforma (iOS/WebKit, Android PWA) e melhorias de estabilidade sem quebra de compatibilidade.

---

## 🔒 PROPRIEDADE INTELECTUAL E SEGURANÇA OPERACIONAL

Este software é de propriedade exclusiva da **Aksurim Software**. Por políticas de **Segurança Operacional (OpSec)** e proteção dos dados de nossos clientes comerciais, detalhes de infraestrutura, topologia de banco de dados, variáveis de ambiente e procedimentos internos de deploy são mantidos em documentação privada restrita à equipe de engenharia autorizada.

<div align="center">
  <br/>
  <p>Desenvolvido com excelência técnica, segurança e visão de produto por <b>Aksurim Software</b>.</p>
  <p>© 2026 Aksurim Software — Todos os direitos reservados.</p>
</div>
