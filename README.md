<div align="center">
  <img src="./frontend/public/logo-full.png" alt="Aksurim Software" width="300" />
  <h1>Finanças Aksurim</h1>
  <p>Gestão de Compromissos Financeiros Compartilhados</p>
</div>

---


SOBRE O PROJETO

O **Finanças Aksurim** é um aplicativo web progressivo (PWA) mobile-first para gestão de compromissos financeiros e quitação de despesas compartilhadas dentro de um núcleo familiar.

O produto resolve três problemas centrais:

1. Falta de visibilidade sobre vencimentos e atrasos de contas familiares, causando pagamento de juros e multas evitáveis.
2. Ausência de rastreabilidade individual sobre quem quitou cada compromisso dentro de uma família.
3. Inexistência de uma fila operacional priorizada que ordene as obrigações por urgência real (atrasadas → vencendo hoje → próximos dias → futuras).


STATUS DO PROJETO

Versão: 1.0.0
Status: MVP (em desenvolvimento)


TECNOLOGIAS

Linguagem: TypeScript 5.x (strict mode)
Backend: NestJS 10+ · Prisma ORM 5+ · MySQL 8.0
Frontend: React 18+ · Vite 5+ · Tailwind CSS 3+ · Recharts
PWA: Service Worker customizado · Web Push (VAPID)


ESTRUTURA DO PROJETO

Este repositório é um **monorepo** com dois workspaces independentes:

/
├── backend/            # API NestJS (TypeScript strict)
│   ├── src/            # Código-fonte da API
│   ├── test/           # Testes unitários e e2e
│   ├── tsconfig.json
│   └── package.json
├── frontend/           # PWA React + Vite (TypeScript strict)
│   ├── src/            # Código-fonte da aplicação
│   ├── public/         # Assets estáticos e manifesto PWA
│   ├── tsconfig.json
│   └── package.json
├── deploy/             # Scripts de build e configuração Apache
├── CHANGELOG.md
└── README.md


COMO EXECUTAR O PROJETO

Pré-requisitos: Node.js 20 LTS e npm.

1. Instalar dependências de cada workspace:

```bash
npm run install:all
```

Ou individualmente:

```bash
cd backend && npm install
cd frontend && npm install
```

2. Executar o backend em modo desenvolvimento:

```bash
cd backend && npm run start:dev
```

3. Executar o frontend em modo desenvolvimento:

```bash
cd frontend && npm run dev
```

4. Build de produção:

```bash
npm run build
```


CONTATO

Aksurim Software
Engenheiro Responsável: Joannderson Lucena
E-mail: lucena@aksurim.com
Site: aksurim.com
GitHub: https://github.com/aksurim
LinkedIn: https://www.linkedin.com/in/joanndersonlucena/
