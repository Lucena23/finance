📜 CHANGELOG.md
Histórico Oficial do Projeto — Aksurim Software


## REGISTROS RECENTES

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


## HISTÓRICO COMPLETO

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
