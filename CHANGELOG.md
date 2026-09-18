📜 CHANGELOG.md
Histórico Oficial do Projeto — Aksurim Software


## REGISTROS RECENTES

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


## HISTÓRICO COMPLETO

[Registros anteriores]
