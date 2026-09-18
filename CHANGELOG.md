📜 CHANGELOG.md
Histórico Oficial do Projeto — Aksurim Software


## REGISTROS RECENTES

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


## HISTÓRICO COMPLETO

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
