#!/bin/bash
# ═══════════════════════════════════════════════════════════════
# Finanças Aksurim — Wrapper do Cron Job de Web Push
# ARCHITECTURE §4.1 — TAREFA 57
#
# Executado pelo Cron Job do cPanel às 05:00 BRT:
#   0 5 * * * /home/usuario/.apps/gestao-gastos-api/deploy/cron/notification-cron.sh
#
# Responsabilidades:
#   1. Garantir o timezone America/Sao_Paulo (BRT/BRST).
#   2. Executar o entry point standalone do motor de notificações.
#   3. Registrar a saída em log append-only com timestamp.
#   4. Propagar o código de saída para o cPanel.
#
# Variáveis de ambiente opcionais:
#   APP_DIR   — diretório privado do backend
#               (default: /home/usuario/.apps/gestao-gastos-api)
#   LOG_DIR   — diretório de logs (default: ${APP_DIR}/logs)
# ═══════════════════════════════════════════════════════════════

set -euo pipefail

APP_DIR="${APP_DIR:-/home/usuario/.apps/gestao-gastos-api}"
LOG_DIR="${LOG_DIR:-${APP_DIR}/logs}"
LOG_FILE="${LOG_DIR}/notification-cron.log"

# Timezone BRT/BRST (§8.11) — garante que a rotina opere no fuso correto.
export TZ="America/Sao_Paulo"

mkdir -p "${LOG_DIR}"

cd "${APP_DIR}"

{
  echo "───────────────────────────────────────────────"
  echo "[$(date '+%Y-%m-%d %H:%M:%S %Z')] Iniciando disparo diário de Web Push."
} >> "${LOG_FILE}"

# Executa o entry point standalone e anexa a saída ao log.
if node dist/notification-cron.js >> "${LOG_FILE}" 2>&1; then
  echo "[$(date '+%Y-%m-%d %H:%M:%S %Z')] Execução concluída com sucesso." >> "${LOG_FILE}"
  exit 0
else
  status=$?
  echo "[$(date '+%Y-%m-%d %H:%M:%S %Z')] FALHA na execução (exit=${status})." >> "${LOG_FILE}"
  exit "${status}"
fi
