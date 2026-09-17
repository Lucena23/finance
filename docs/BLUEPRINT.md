🧠 BLUEPRINT.md
Documento Oficial de Produto — Aksurim Software


1. IDENTIFICAÇÃO DO PROJETO

Nome do Projeto: Finanças Aksurim — Gestão de Compromissos Financeiros Compartilhados (PWA/Web)
Empresa: Aksurim Software
Status: Planejamento
Product Owner / Engenheiro Responsável: Joannderson Lucena


2. VISÃO DO PRODUTO

O Finanças Aksurim é um aplicativo web progressivo (PWA) mobile-first projetado para gestão completa de compromissos financeiros e quitação de despesas compartilhadas dentro de um núcleo familiar.

O produto resolve três problemas centrais:
1. Falta de visibilidade sobre vencimentos e atrasos de contas familiares, causando pagamento de juros e multas evitáveis.
2. Ausência de rastreabilidade individual sobre quem quitou cada compromisso dentro de uma família, gerando conflitos e desorganização.
3. Inexistência de uma fila operacional priorizada que ordene as obrigações por urgência real (atrasadas → vencendo hoje → próximos dias → futuras).

O sistema opera como MVTP (Minimum Viable Technical Product) de uso próprio e simultaneamente como vitrine técnica de portfólio corporativo da Aksurim Software, demonstrando domínio de stack TypeScript full-stack, arquitetura modular NestJS, PWA com Web Push e deploy em hospedagem compartilhada.


3. PÚBLICO-ALVO

- Usuário primário: Núcleos familiares de 2 a 6 membros que compartilham responsabilidade financeira sobre despesas domésticas (aluguel, energia, internet, cartão de crédito, parcelas de bens, etc.).
- Perfil técnico: Usuários não-técnicos que utilizam predominantemente smartphones Android para acessar o sistema via navegador ou atalho PWA instalado na tela inicial.
- Cenário de uso: Acesso rápido diário para consultar a fila de pagamentos pendentes, registrar quitações e verificar notificações push de vencimentos.


4. ESCOPO DO MVP

Must Have (obrigatório):
- Cadastro e autenticação de usuários com vinculação a um workspace familiar (FamilyAccount) isolado logicamente.
- CRUD completo de categorias de gastos com cor e ícone personalizáveis.
- Cadastro de despesas nos três tipos fundamentais: Avulsa (SINGLE), Parcelada (INSTALLMENT) e Recorrente/Contínua (RECURRENT).
- Geração automática de PaymentItems (parcelas/obrigações) conforme tipo da despesa:
  - Avulsa: 1 PaymentItem com vencimento informado.
  - Parcelada: N PaymentItems com possibilidade de ajuste fino individual de valores por parcela.
  - Recorrente: Projeção mensal contínua sem quantidade final definida, com edição do valor base refletindo apenas em cobranças futuras e ação de "Encerrar Recorrência".
- Fila de Pagamentos (tela operacional principal) com ordenação visual por urgência:
  - 🔴 Em atraso (dueDate < hoje e status PENDING).
  - 🟠 Mês atual / Imediato (vencimento dentro do mês corrente).
  - 🔵 A vencer futuro (meses seguintes).
- Gaveta modal de quitação com: valor previsto pré-preenchido, campo editável para valor final (juros/desconto), data de pagamento, campo de observação livre. Ao confirmar, grava paidById e transiciona status para PAID.
- Badges coloridos com iniciais do pagador no histórico, com filtro rápido por membro responsável.
- Painel gerencial de despesas/saídas com:
  - Cards: Total Pago no Mês, Total a Pagar no Mês, Divisão Proporcional por Membro.
  - Gráfico de Rosca (Recharts): Distribuição percentual por Categoria.
  - Gráfico de Barras (Recharts): Evolução mensal de despesas ao longo de 12 meses.
- Motor de Web Push Notifications com hierarquia de prioridade (Cron Job diário às 05:00 BRT):
  - P1: Contas em atraso → alerta crítico.
  - P2: Contas vencendo hoje → alerta do dia.
  - P3: Contas vencendo nos próximos 5 dias → alerta preventivo.
  - Silêncio: Nenhuma pendência qualificada → sem disparo.
- Suporte PWA completo: Service Worker para instalação na tela inicial e funcionamento offline básico (cache de shell).

Should Have (importante):
- Soft delete (campo deletedAt) em despesas para recuperação de registros excluídos acidentalmente.
- Campo de notas livre em cada PaymentItem para anotações de quitação (comprovante, observação de juros, etc.).
- Responsividade completa desktop e tablet além do mobile-first.
- Compressão de assets e headers de segurança HTTP via .htaccess no Apache.


5. REGRAS DE NEGÓCIO

RN-01 — Isolamento Multi-Tenant por Núcleo Familiar:
Cada FamilyAccount representa um workspace isolado. Nenhum dado (despesas, categorias, membros) deve ser acessível entre workspaces diferentes. O isolamento é lógico (filtro por familyAccountId em todas as queries).

RN-02 — Vínculo Inicial com CPF:
A criação de uma FamilyAccount exige o CPF do titular para identificação fiscal. O CPF é armazenado de forma segura e utilizado apenas como chave de identificação do workspace.

RN-03 — Papéis de Usuário (ADMIN | MEMBER):
- ADMIN: Possui permissões completas (CRUD de categorias, despesas, membros e configurações do workspace). Apenas o ADMIN pode convidar ou remover membros.
- MEMBER: Pode visualizar todas as despesas do workspace, registrar quitações (paidBy) e consultar relatórios. Não pode alterar configurações do workspace nem gerenciar membros.

RN-04 — Tratamento Monetário em Centavos Inteiros:
Todos os valores monetários (totalAmount, expectedAmount, paidAmount) DEVEM ser armazenados como inteiros (Int) representando centavos. Exemplo: R$ 150,75 → 15075. Esta regra elimina erros de ponto flutuante em operações financeiras. A conversão para formato de exibição (R$ X,XX) ocorre exclusivamente na camada de apresentação (frontend).

RN-05 — Geração de PaymentItems por Tipo de Despesa:
- SINGLE: Exatamente 1 PaymentItem gerado com o vencimento fornecido pelo usuário.
- INSTALLMENT: Exatamente N PaymentItems gerados automaticamente. O sistema distribui o totalAmount igualmente entre as parcelas, atribuindo o resíduo de arredondamento à última parcela. Após a geração, cada parcela pode ter seu expectedAmount ajustado individualmente.
- RECURRENT: PaymentItems são gerados em projeção mensal (mês atual + meses futuros visíveis). O valor base pode ser editado a qualquer momento, mas a alteração se aplica APENAS a lançamentos futuros (parcelas já geradas preservam seu valor histórico). A ação "Encerrar Recorrência" altera statusRecurrence para CANCELLED e cessa a geração de novos PaymentItems.

RN-06 — Fila de Pagamentos com Ordenação por Urgência:
A tela principal apresenta obrigatoriamente os PaymentItems com status PENDING ordenados na seguinte hierarquia fixa:
1. Em Atraso (dueDate < data atual) — indicador visual vermelho.
2. Mês Atual (dueDate dentro do mês corrente e dueDate >= data atual) — indicador visual laranja.
3. Futuros (dueDate em meses posteriores) — indicador visual azul.
Dentro de cada grupo, a ordenação secundária é por dueDate ascendente (mais próximo do vencimento primeiro).

RN-07 — Quitação com Rastreabilidade:
Ao quitar um PaymentItem, o sistema DEVE registrar obrigatoriamente: paidAmount (valor efetivamente pago), paidAt (timestamp da baixa), paidById (ID do usuário que realizou o pagamento). O status transiciona de PENDING para PAID de forma irreversível.

RN-08 — Auditoria Visual por Membro:
O histórico de pagamentos exibe badges coloridos contendo as iniciais do pagador (derivadas automaticamente do campo name do User) e a avatarColor cadastrada. O filtro por membro permite visualizar rapidamente todos os pagamentos realizados por um integrante específico.

RN-09 — Relatórios Exclusivamente de Saídas:
O painel gerencial NÃO contempla receitas/entradas. Todos os cálculos, cards e gráficos se baseiam exclusivamente em despesas pagas e a pagar.

RN-10 — Motor de Notificações Push com Hierarquia de Prioridade:
A rotina de Cron (05:00 BRT diário) avalia as pendências de CADA FamilyAccount independentemente e dispara no máximo 1 notificação por workspace por execução, seguindo a prioridade: Atrasadas (P1) > Vencendo Hoje (P2) > Próximos 5 dias (P3). Se nenhuma condição for atendida, o sistema permanece silencioso para aquele workspace.

RN-11 — Soft Delete em Despesas:
A exclusão de uma Expense NÃO apaga fisicamente o registro. O campo deletedAt é preenchido com o timestamp da exclusão. Consultas padrão filtram registros com deletedAt = NULL. A restauração é possível limpando o campo.


6. MÉTRICAS E SUCESSO

- Adoção interna: 100% das despesas familiares do núcleo do Engenheiro Responsável registradas e quitadas pelo sistema por no mínimo 3 meses consecutivos.
- Operacional: Zero pagamentos em atraso não notificados (eficácia do motor de Web Push verificável por logs de disparo).
- Performance: Tempo de carregamento inicial da PWA abaixo de 3 segundos em conexão 4G.
- Rastreabilidade: 100% das quitações com paidById preenchido, permitindo auditoria completa por membro.
- Portfólio: Projeto publicado no GitHub (código público, sem docs internos) e referenciado no site corporativo aksurim.com.


7. DECISÕES DO PRODUTO E HISTÓRICO

2026-09-17 | Definição da stack TypeScript full-stack (NestJS + React/Vite) | Padronização total do ecossistema em uma única linguagem para reduzir context-switching e maximizar reuso de tipos/interfaces entre backend e frontend. | Impacto: Tipagem ponta-a-ponta do Prisma ao componente React.

2026-09-17 | Escolha do MySQL via cPanel/Superdomínios como banco de dados | Infraestrutura já contratada e operacional, eliminando custos adicionais de cloud. Deploy simplificado via Node.js App Manager do cPanel. | Impacto: Restrição a funcionalidades suportadas pelo MySQL e pelo ambiente de hospedagem compartilhada.

2026-09-17 | Adoção de valores monetários em centavos inteiros (Int) | Eliminação definitiva de erros de ponto flutuante em cálculos financeiros. Padrão consagrado em sistemas bancários e fintechs. | Impacto: Toda a stack (banco, API, frontend) deve operar com inteiros e converter para exibição apenas na camada de apresentação.

2026-09-17 | PWA com Web Push ao invés de aplicativo nativo | Redução drástica de complexidade de distribuição (sem App Store), instalação direta via navegador e notificações push nativas no Android. | Impacto: Limitação de funcionalidades em iOS (suporte parcial a Web Push no Safari).

2026-09-17 | Modelo multi-tenant lógico (FamilyAccount) ao invés de bancos separados | Simplificação da infraestrutura com isolamento garantido por filtro de familyAccountId em todas as queries. | Impacto: Exige disciplina rigorosa em todas as queries para nunca vazar dados entre workspaces.

2026-09-17 | Relatórios exclusivamente de saídas (sem receitas) | Foco do MVP na dor principal: visibilidade e controle de compromissos a pagar. Receitas serão avaliadas em versões futuras. | Impacto: Escopo reduzido do painel gerencial, mas alinhado ao problema central.
