🛡️ REGRAS.md
Framework Oficial de Desenvolvimento — Aksurim Software
Versão: 3.0 (Workstation Autônoma)

1. OBJETIVO
Este documento define as regras obrigatórias de trabalho para o Pipeline de Integração Contínua e para a equipe de Engenharia do projeto Finanças Aksurim. Garante padronização, rastreabilidade e autonomia de execução.

2. ISOLAMENTO E BLINDAGEM (REGRA GERAL)
- Todos os documentos de engenharia e produção (REGRAS, BLUEPRINT, ARCHITECTURE, CHECKLIST) devem residir exclusivamente no diretório `/docs/`.
- O diretório `/docs/` deve constar obrigatoriamente no `.gitignore` e JAMAIS ser enviado ao repositório público (GitHub).
- O projeto visível externamente deve conter apenas código, testes, `README.md` e `CHANGELOG.md`. O portfólio público não deve possuir menções aos processos internos automatizados.
- Arquivos `.env` com credenciais sensíveis (DATABASE_URL, JWT_SECRET, VAPID_KEYS) NUNCA devem ser versionados.

3. HIERARQUIA DOS DOCUMENTOS
/docs/REGRAS.md
/docs/BLUEPRINT.md
/docs/ARCHITECTURE.md
/docs/CHECKLIST.md

RAIZ DO PROJETO:
/CHANGELOG.md (Público)
/README.md (Público)

4. PAPÉIS E RESPONSABILIDADES
Engenheiro Responsável (Joannderson Lucena)
- Product Owner e Auditor de Qualidade.
- Aprova liberações críticas (Diffs) e intervém em caso de alertas via Telegram.
- Define a visão do produto.

Validador Contínuo (Módulo Supervisor)
- Analisa o Checklist.
- Delega tarefas ao Executor de Build.
- Valida integridade, qualidade de código e diffs.

Executor de Build (Módulo Worker)
- Altera código-fonte físico.
- Roda testes locais e builds.
- Submete alterações estruturadas de volta ao Validador.

5. ORQUESTRAÇÃO E MÁQUINA DE ESTADOS (CI/CD)
O fluxo ocorre de forma cíclica, fechada e autônoma (Machine-to-Machine):
- Leitura do Checklist pelo Validador.
- Delegação estruturada para o Executor.
- Implementação física.
- Resposta de payload (M2M) do Executor para o Validador.
- Atualização autônoma do Checklist e Changelog.

6. GUARDRAILS E CIRCUIT BREAKER
- Circuit Breaker: Limite estrito de 3 falhas ou erros de compilação consecutivos na mesma tarefa. Ao atingir o limite, o processo entra em estado `SUSPENDED`.
- Notificação Assíncrona: Em caso de `SUSPENDED`, o motor de orquestração disparará um alerta com o payload de erro e Git Diff para o Telegram do Engenheiro Responsável.
- Proteção de Escopo: O Executor é bloqueado sistemicamente de rodar comandos de deleção em diretórios raiz (ex: `rm -rf /`) e não possui permissão para aprovar Pull Requests ou mergear na `main` sem auditoria.

7. COMUNICAÇÃO INTERNA
A comunicação entre os módulos do pipeline não utiliza explicações textuais prolixas. Tudo ocorre por meio de payloads (JSON/Markdown estruturado) informando estritamente: IDs, status de compilação e caminhos de arquivos.

8. REGRAS ESPECÍFICAS DO PROJETO — FINANÇAS AKSURIM

8.1 LINGUAGEM E TIPAGEM
- TypeScript strict mode OBRIGATÓRIO em 100% do código (backend e frontend). Flag `strict: true` deve estar habilitada em todos os `tsconfig.json`.
- É PROIBIDO o uso de `any` em qualquer lugar do código. Exceções devem ser justificadas com comentário `// eslint-disable-next-line @typescript-eslint/no-explicit-any -- [motivo]` e aprovadas pelo Supervisor.
- Todas as interfaces e tipos compartilhados entre backend e frontend devem ser extraídos de um único ponto de verdade (tipos gerados pelo Prisma Client ou barrel exports de tipos compartilhados).

8.2 TRATAMENTO MONETÁRIO (REGRA INEGOCIÁVEL)
- Todos os valores monetários DEVEM ser armazenados e trafegados como inteiros (Int) representando centavos.
- R$ 150,75 → 15075 (Int). R$ 0,01 → 1 (Int). R$ 1.000,00 → 100000 (Int).
- É ESTRITAMENTE PROIBIDO o uso de Float, Decimal, number com casas decimais ou qualquer tipo de ponto flutuante para representar valores monetários em qualquer camada (banco, API, lógica de negócio).
- A conversão para formato de exibição (R$ X.XXX,XX) ocorre EXCLUSIVAMENTE na camada de apresentação (frontend), via função utilitária `formatCurrency(centavos: number): string`.
- A distribuição de valores em parcelas (INSTALLMENT) deve usar aritmética inteira: `floor(totalAmount / N)` para as N-1 primeiras parcelas, e `totalAmount - (valorParcela * (N - 1))` para a última parcela, garantindo que a soma seja exata.

8.3 ISOLAMENTO MULTI-TENANT (REGRA INEGOCIÁVEL)
- TODA query ao banco de dados que acesse dados de negócio (Expense, PaymentItem, Category, User) DEVE obrigatoriamente incluir o filtro `WHERE familyAccountId = <id-do-workspace>`.
- O familyAccountId DEVE ser extraído exclusivamente do JWT do usuário autenticado pelo `FamilyScopeInterceptor`. NUNCA deve ser aceito como parâmetro de query ou body de requisição.
- Qualquer query sem filtro de familyAccountId é considerada uma vulnerabilidade crítica de segurança (vazamento de dados entre workspaces).
- Testes unitários DEVEM incluir cenários de verificação de isolamento multi-tenant (tentativa de acessar dados de outro workspace retorna 404 ou array vazio, nunca dados alheios).

8.4 GERAÇÃO DE PAYMENT ITEMS
- SINGLE: Exatamente 1 PaymentItem. installmentNumber = 1, totalInstallments = 1.
- INSTALLMENT: Exatamente N PaymentItems (N >= 2). installmentNumber de 1 a N. totalInstallments = N. Vencimentos incrementam 1 mês a partir da dueDate informada.
- RECURRENT: PaymentItems gerados sob demanda (mês corrente + projeção). installmentNumber sequencial, totalInstallments = 0 (indeterminado). Ao editar totalAmount da Expense, os PaymentItems futuros (status PENDING e dueDate > hoje) recebem o novo expectedAmount. PaymentItems passados ou já pagos são IMUTÁVEIS.
- Ao cancelar recorrência (statusRecurrence = CANCELLED): PaymentItems com status PENDING e dueDate > data do cancelamento são deletados fisicamente. PaymentItems pagos são preservados.

8.5 FILA DE PAGAMENTOS — ORDENAÇÃO
- A ordenação da fila é determinística e segue esta hierarquia fixa:
  1. Em Atraso: dueDate < DATE(NOW()) AND status = PENDING → Agrupamento visual vermelho.
  2. Mês Atual: dueDate >= DATE(NOW()) AND MONTH(dueDate) = MONTH(NOW()) AND YEAR(dueDate) = YEAR(NOW()) AND status = PENDING → Agrupamento visual laranja.
  3. Futuros: dueDate > último dia do mês corrente AND status = PENDING → Agrupamento visual azul.
- Dentro de cada grupo: ORDER BY dueDate ASC (mais urgente primeiro).
- Itens com status PAID NÃO aparecem na fila. Aparecem exclusivamente no endpoint de histórico.

8.6 MOTOR DE NOTIFICAÇÕES PUSH
- A rotina Cron (05:00 BRT) itera sobre TODAS as FamilyAccounts ativas.
- Para CADA FamilyAccount, avalia pendências na seguinte ordem de prioridade (dispara apenas a primeira condição atendida):
  - P1 (Atrasadas): EXISTS PaymentItem WHERE familyAccountId = X AND status = PENDING AND dueDate < DATE(NOW()) → Mensagem: "Você possui conta(s) pendente(s) já vencida(s). Acesse para regularizar e evitar juros."
  - P2 (Vencendo Hoje): EXISTS PaymentItem WHERE familyAccountId = X AND status = PENDING AND dueDate = DATE(NOW()) → Mensagem: "Você tem conta(s) com vencimento marcado para hoje. Acesse para conferir e quitar."
  - P3 (Próximos 5 dias): EXISTS PaymentItem WHERE familyAccountId = X AND status = PENDING AND dueDate BETWEEN DATE(NOW()+1) AND DATE(NOW()+5) → Mensagem: "Você tem conta(s) com vencimento nos próximos dias. Acesse para planejar seus pagamentos."
  - Silêncio: Nenhuma condição atendida → NÃO dispara push.
- O push é enviado para TODAS as PushSubscriptions de TODOS os Users vinculados à FamilyAccount (todos os membros recebem).
- Biblioteca de envio: web-push (npm) com chaves VAPID configuradas no .env.

8.7 SOFT DELETE
- A exclusão lógica de Expenses utiliza o campo `deletedAt` (DateTime nullable).
- Consultas padrão DEVEM filtrar `WHERE deletedAt IS NULL` para ignorar registros excluídos.
- A restauração é feita via `UPDATE expenses SET deletedAt = NULL WHERE id = X`.
- PaymentItems vinculados a Expenses com soft delete NÃO devem aparecer na fila de pagamentos nem em relatórios.

8.8 INICIAIS E COR DO AVATAR
- O campo `initials` do User é gerado automaticamente a partir do campo `name` no momento do cadastro:
  - Se o nome tem 1 palavra: primeiras 2 letras em maiúsculo (ex: "João" → "JO").
  - Se o nome tem 2+ palavras: primeira letra de cada uma das 2 primeiras palavras em maiúsculo (ex: "Maria Silva" → "MS").
- O campo `avatarColor` armazena um código hexadecimal de 7 caracteres (#RRGGBB). Deve ser único dentro do workspace (sem dois membros com a mesma cor).

8.9 PADRÕES DE CÓDIGO E CONVENÇÕES
- Nomenclatura de arquivos: kebab-case (ex: `family-account.service.ts`, `create-expense.dto.ts`).
- Nomenclatura de classes: PascalCase (ex: `FamilyAccountService`, `CreateExpenseDto`).
- Nomenclatura de variáveis e funções: camelCase (ex: `familyAccountId`, `calculateTotalPaid`).
- Nomenclatura de tabelas no banco (@@map): snake_case (ex: `family_accounts`, `payment_items`).
- Nomenclatura de colunas no banco: camelCase no Prisma (mapeamento automático para snake_case via @@map quando necessário).
- Commits: Convenção Conventional Commits (ex: `feat(expense): add installment generation`, `fix(payment): correct overdue sorting`).
- Indentação: 2 espaços. Sem tabs.

8.10 TESTES
- Testes unitários obrigatórios para: Services de lógica de negócio (geração de PaymentItems, cálculo de distribuição de parcelas, ordenação da fila, motor de notificações).
- Testes e2e recomendados para: Fluxos críticos (cadastro → login → criar despesa → quitar parcela).
- Framework: Jest (backend), Vitest (frontend).
- Cobertura mínima alvo: 80% nos Services de domínio.

8.11 DEPLOY E AMBIENTE
- O backend DEVE rodar na porta fornecida por `process.env.PORT` (injetada pelo cPanel Node.js App Manager). NUNCA utilizar porta fixa em código.
- O timezone do servidor DEVE ser configurado como `America/Sao_Paulo` (TZ=America/Sao_Paulo no .env) para garantir que o Cron Job e as comparações de data operem no fuso correto (BRT/BRST).
- O frontend DEVE ser compilado com `npm run build` (Vite) e o conteúdo de `dist/` copiado para o diretório público do Apache.
- O manifesto PWA (`manifest.json`) DEVE conter: name, short_name, start_url, display: standalone, theme_color, background_color e ícones em 192x192 e 512x512.
