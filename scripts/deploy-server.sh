#!/bin/bash
# Script de deploy en el servidor
# Uso: bash scripts/deploy-server.sh

set -e

echo "🚀 Iniciando deploy..."

# 1. Actualizar código
git pull origin main

# 2. Instalar dependencias
echo "📦 Instalando dependencias..."
pnpm install --frozen-lockfile

# 3. Build
echo "🔨 Compilando..."
node scripts/build-prod.js

# 4. Reiniciar PM2
echo "♻️  Reiniciando servicios..."
pm2 restart ecosystem.config.js --env production 2>/dev/null || \
  pm2 start dist/ecosystem.config.js --env production

pm2 save

echo "✅ Deploy completado"
pm2 status
