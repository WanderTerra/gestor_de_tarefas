#!/bin/bash
# Script de redeploy do Gestor de Tarefas
# Uso: execute no servidor, a partir da pasta do projeto
#   chmod +x deploy/redeploy.sh
#   ./deploy/redeploy.sh

set -e

cd "$(dirname "$0")/.."
ROOT="$(pwd)"
BACKEND="$ROOT/backend"
FRONTEND="$ROOT/frontend"

echo "=== Gestor de Tarefas - Redeploy ==="
echo "Diretório: $ROOT"
echo ""

# 1. Atualizar código do repositório
echo "[1/5] Atualizando código do repositório..."
git pull origin main || git pull origin master || {
  echo "    AVISO: Não foi possível fazer git pull. Continuando com código local..."
}

# 2. Backend: dependências e build
echo "[2/5] Backend: dependências e build..."
cd "$BACKEND"
npm ci
npx prisma generate
npm run build
echo "    Backend build concluído."

# 3. Migrações do banco (se houver)
echo "[3/5] Aplicando migrações do banco de dados..."
if npx prisma migrate deploy 2>/dev/null; then
  echo "    Migrações aplicadas."
else
  echo "    Nenhuma migração pendente."
fi

# 4. Frontend: dependências e build
echo "[4/5] Frontend: dependências e build..."
cd "$FRONTEND"
npm ci
npm run build
echo "    Frontend build concluído."

# 5. Reiniciar serviço systemd
echo "[5/5] Reiniciando serviço systemd..."
if sudo systemctl is-active --quiet gestor-backend; then
  sudo systemctl restart gestor-backend
  echo "    Serviço reiniciado com sucesso."
else
  echo "    AVISO: Serviço não está ativo. Iniciando..."
  sudo systemctl start gestor-backend || {
    echo "    ERRO: Não foi possível iniciar o serviço."
    echo "    Verifique com: sudo systemctl status gestor-backend"
    exit 1
  }
fi

# Verificar status
echo ""
echo "=== Status do serviço ==="
sudo systemctl status gestor-backend --no-pager -l || true

echo ""
echo "=== Redeploy concluído ==="
echo "Para ver logs em tempo real:"
echo "  sudo journalctl -u gestor-backend -f"
echo ""
