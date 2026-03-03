#!/bin/bash
# Script de instalação do Gestor de Tarefas no Debian 13
# Uso: execute no servidor, a partir da pasta do projeto (ex: /var/www/gestor-de-tarefas)
#   chmod +x deploy/install-debian.sh
#   ./deploy/install-debian.sh

set -e
cd "$(dirname "$0")/.."
ROOT="$(pwd)"
BACKEND="$ROOT/backend"
FRONTEND="$ROOT/frontend"

echo "=== Gestor de Tarefas - Instalação Debian ==="
echo "Diretório: $ROOT"
echo ""

# 1. Backend
echo "[1/4] Backend: dependências e build..."
cd "$BACKEND"
if [ ! -f .env ]; then
  if [ -f .env.production.example ]; then
    cp .env.production.example .env
    echo "    Criado .env a partir de .env.production.example - EDITE o .env com as suas configurações."
  else
    echo "    AVISO: .env não existe. Crie a partir de .env.example ou .env.production.example."
  fi
fi
npm ci --omit=dev
npx prisma generate
npm run build
echo "    Backend build concluído."

# 2. Migrações e seed (opcional)
echo "[2/4] Banco de dados..."
if npx prisma migrate deploy 2>/dev/null; then
  echo "    Migrações aplicadas."
else
  echo "    Migrações não aplicadas (pode ser normal na primeira vez). Execute manualmente: npx prisma migrate deploy ou db push"
fi
if [ -f prisma/seed.ts ]; then
  echo "    Para criar usuário admin, execute: npm run db:seed"
fi

# 3. Frontend
echo "[3/4] Frontend: dependências e build..."
cd "$FRONTEND"
npm ci
npm run build
echo "    Frontend build concluído (frontend/dist)."

# 4. Avisos finais
echo ""
echo "[4/4] Próximos passos manuais:"
echo "  1. Configurar Nginx:"
echo "     sudo cp $ROOT/deploy/nginx/gestor-de-tarefas.conf /etc/nginx/sites-available/"
echo "     sudo ln -sf /etc/nginx/sites-available/gestor-de-tarefas.conf /etc/nginx/sites-enabled/"
echo "     (Edite server_name e confirme root aponta para $FRONTEND/dist)"
echo "     sudo nginx -t && sudo systemctl reload nginx"
echo ""
echo "  2. Configurar systemd:"
echo "     sudo cp $ROOT/deploy/systemd/gestor-backend.service /etc/systemd/system/"
echo "     (Edite WorkingDirectory e EnvironmentFile se não for $BACKEND)"
echo "     sudo systemctl daemon-reload && sudo systemctl enable gestor-backend && sudo systemctl start gestor-backend"
echo ""
echo "  3. Ajustar dono dos ficheiros (ex.: sudo chown -R www-data:www-data $ROOT)"
echo ""
echo "Documentação completa: $ROOT/deploy/README-DEPLOY-DEBIAN.md"
echo "=== Fim da instalação ==="
