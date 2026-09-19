# Cron Job — Motor de Web Push (05:00 BRT)

Configuração do Cron Job do cPanel responsável pelo disparo diário das
notificações Web Push do Finanças Aksurim.

- **Schedule:** `0 5 * * *` (diariamente às 05:00 BRT)
- **Comando:** `node dist/notification-cron.js`
- **Diretório de execução:** `/home/usuario/.apps/gestao-gastos-api`
- **Timezone:** `America/Sao_Paulo` (garantido por `TZ=America/Sao_Paulo` no `.env`)

---

## 1. Pré-requisitos

1. Backend compilado (`npm run build` no diretório `backend/`), gerando
   `backend/dist/notification-cron.js`.
2. Arquivo `.env` presente no diretório privado do backend, contendo no mínimo:

   ```
   DATABASE_URL="mysql://usuario:senha@localhost:3306/financas_aksurim"
   VAPID_PUBLIC_KEY="<chave-publica-vapid>"
   VAPID_PRIVATE_KEY="<chave-privada-vapid>"
   VAPID_SUBJECT="mailto:lucena@aksurim.com"
   TZ=America/Sao_Paulo
   ```

   As chaves VAPID são geradas uma única vez com:

   ```bash
   npx web-push generate-vapid-keys
   ```

---

## 2. Registro no cPanel

1. Acesse **cPanel → Avançado → Cron Jobs**.
2. Em **Adicionar Novo Cron Job**, selecione **Comum Settings → Once Per Day (0 5 * * *)**.
3. No campo **Comando**, informe:

   ```bash
   cd /home/usuario/.apps/gestao-gastos-api && node dist/notification-cron.js >> /home/usuario/.apps/gestao-gastos-api/logs/notification-cron.log 2>&1
   ```

   > Substitua `/home/usuario/.apps/gestao-gastos-api` pelo caminho real do
   > diretório privado do backend no servidor.

4. Clique em **Adicionar Novo Cron Job**.

### Expressão cron equivalente

```
0 5 * * *
```

| Campo | Valor | Significado          |
|-------|-------|----------------------|
| min   | 0     | minuto 0             |
| hora  | 5     | 05:00                |
| dia   | *     | todos os dias        |
| mês   | *     | todos os meses       |
| dow   | *     | todos os dias da semana |

---

## 3. Validação manual

Antes de confiar no agendamento, valide a execução manualmente no terminal
(SSH ou Terminal do cPanel):

```bash
cd /home/usuario/.apps/gestao-gastos-api
TZ=America/Sao_Paulo node dist/notification-cron.js
```

Saída esperada (uma linha por workspace avaliado):

```
[notification-cron] workspace=<uuid> prioridade=P1 pendências=2 notificadas=3
[notification-cron] workspace=<uuid> prioridade=SILENT pendências=0 notificadas=0
[notification-cron] Concluído: N workspace(s) avaliado(s).
```

- Código de saída `0` → execução bem-sucedida.
- Código de saída `1` → falha (verifique `.env`, conexão com o banco e chaves VAPID).

---

## 4. Hierarquia de prioridade (REGRAS §8.6 / RN-10)

Para **cada** `FamilyAccount`, o motor avalia as pendências na ordem abaixo e
dispara **no máximo 1 notificação por workspace por execução**:

| Prioridade | Condição                                                        | Mensagem                                                                                          |
|------------|-----------------------------------------------------------------|---------------------------------------------------------------------------------------------------|
| **P1**     | `dueDate < hoje` (atrasadas)                                    | "Você possui conta(s) pendente(s) já vencida(s). Acesse para regularizar e evitar juros."          |
| **P2**     | `dueDate = hoje` (vencendo hoje)                                | "Você tem conta(s) com vencimento marcado para hoje. Acesse para conferir e quitar."               |
| **P3**     | `hoje+1 <= dueDate <= hoje+5` (próximos 5 dias)                 | "Você tem conta(s) com vencimento nos próximos dias. Acesse para planejar seus pagamentos."        |
| Silêncio   | Nenhuma condição atendida                                       | — (sem disparo)                                                                                    |

O push é enviado para **todas** as `PushSubscription` de **todos** os membros
vinculados à `FamilyAccount`.

---

## 5. Observações operacionais

- O timezone do servidor **deve** ser `America/Sao_Paulo` para que a expressão
  cron e as comparações de data operem no fuso BRT/BRST (§8.11).
- Subscriptions expiradas/inválidas (HTTP 404/410) são removidas
  automaticamente pelo motor durante o disparo.
- O log de disparo por workspace é a evidência de eficácia do motor
  (métrica "Zero pagamentos em atraso não notificados").
