#!/bin/bash
# ═══════════════════════════════════════════════════════════════
# Finanças Aksurim — Pipeline de Build Unificado
# ARCHITECTURE §4.2 — deploy/build.sh
#
# Executa: prisma generate/migrate, build backend, build frontend
# e deploy dos assets estáticos para o diretório público do Apache.
#
# Uso:
#   ./deploy/build.sh
#
# Variáveis de ambiente opcionais:
#   PUBLIC_HTML_DIR  — destino dos assets do frontend
#                      (default: /home/usuario/public_html)
#   SKIP_MIGRATE     — se "1", pula `prisma migrate deploy`
#   SKIP_DEPLOY      — se "1", pula o rsync para o diretório público
# ═══════════════════════════════════════════════════════════════

set -euo pipefail

# ─── Resolução do diretório raiz do projeto ───
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"

PUBLIC_HTML_DIR="${PUBLIC_HTML_DIR:-/home/usuario/public_html}"
SKIP_MIGRATE="${SKIP_MIGRATE:-0}"
SKIP_DEPLOY="${SKIP_DEPLOY:-0}"

echo "═══ Aksurim Build Pipeline ═══"
echo "Raiz do projeto : ${ROOT_DIR}"
echo "Destino público : ${PUBLIC_HTML_DIR}"
echo ""

# ─── [1/4] Backend ───
echo "[1/4] Building backend..."
cd "${ROOT_DIR}/backend"
npm ci --production=false
npx prisma generate
if [ "${SKIP_MIGRATE}" != "1" ]; then
  npx prisma migrate deploy
else
  echo "      (migrate deploy ignorado — SKIP_MIGRATE=1)"
fi
npm run build
cd "${ROOT_DIR}"

# ─── [2/4] Frontend ───
echo "[2/4] Building frontend..."
cd "${ROOT_DIR}/frontend"
npm ci --production=false
npm run build
cd "${ROOT_DIR}"

# ─── [3/4] Deploy dos assets do frontend ───
if [ "${SKIP_DEPLOY}" != "1" ]; then
  echo "[3/4] Deploying frontend assets..."
  if [ ! -d "${ROOT_DIR}/frontend/dist" ]; then
    echo "ERRO: frontend/dist não encontrado após o build." >&2
    exit 1
  fi
  mkdir -p "${PUBLIC_HTML_DIR}"
  rsync -av --delete "${ROOT_DIR}/frontend/dist/" "${PUBLIC_HTML_DIR}/"
  # .htaccess (compressão, cache, headers de segurança, fallback SPA)
  if [ -f "${SCRIPT_DIR}/.htaccess" ]; then
    cp "${SCRIPT_DIR}/.htaccess" "${PUBLIC_HTML_DIR}/.htaccess"
    echo "      .htaccess copiado para ${PUBLIC_HTML_DIR}/"
  fi
else
  echo "[3/4] (deploy de assets ignorado — SKIP_DEPLOY=1)"
fi

# ─── [4/4] Restart do backend ───
echo "[4/4] Restarting backend..."
echo "      O restart é feito via Node.js App Manager do cPanel (interface web)."

echo "═══ Build Complete ═══"
