# Governança de Branch — Finanças Aksurim v1.1

> Documento de rastreabilidade da RN-17 (Proteção de Código e Controle de Versão).

## Branch de Trabalho Obrigatória

- **Branch paralela:** `feature/v1.1-update`
- **Branch protegida:** `master` (merge apenas manual pelo Engenheiro Responsável — Joannderson Lucena)

## Regras

1. É **ESTRITAMENTE PROIBIDO** realizar alterações de código ou instalar dependências diretamente em `main`/`master`.
2. Todo o desenvolvimento da v1.1 ocorre exclusivamente em `feature/v1.1-update`.
3. O merge final para a branch principal é manual, após validação e testes completos.

## Comandos de Verificação

```bash
# Confirmar branch atual
git rev-parse --abbrev-ref HEAD   # deve retornar: feature/v1.1-update

# Criar a branch caso não exista
git checkout feature/v1.1-update || git checkout -b feature/v1.1-update
```

## Estado Verificado

- Branch ativa: `feature/v1.1-update`
- Working tree: limpo
- Última tarefa: TAREFA 1 (governança `.gitignore` + `git status`)
