# Governança de Branch — Finanças Aksurim v1.4.1

> Documento de rastreabilidade da RN-17 (Proteção de Código e Controle de Versão).

## Histórico de Branches de Release

- **v1.1:** `feature/v1.1-update` → `master`
- **v1.2:** `feature/v1.2-freemium-adtech` → `master`
- **v1.3:** `feature/v1.3-checkout-transparente` → `master`
- **v1.4.0 / v1.4.1:** `feature/v1.4.0-ia-ksurim-suporte` → `master`
- **Branch protegida:** `master` (merge apenas manual com autorização do Engenheiro Responsável — Joannderson Lucena)

## Regras

1. É **ESTRITAMENTE PROIBIDO** realizar alterações diretas de código ou instalar dependências diretamente em `master`.
2. Todo o desenvolvimento da versão ocorre exclusivamente na feature branch isolada.
3. O merge final para a branch principal (`master`) é executado após validação e bateria de testes 100% aprovada.

## Estado Verificado

- Branch de Origem: `feature/v1.4.0-ia-ksurim-suporte`
- Branch de Destino: `master`
- Versão: `1.4.1`
- Working tree: limpo
- Banco de Produção: Reconectado no `.env` do backend
- Bateria de Testes: 100% aprovada (11 suítes Jest backend, 7 suítes Vitest frontend)
