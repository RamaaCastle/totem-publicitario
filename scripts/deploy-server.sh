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

# 4. Instalar dependencias de producción
echo "📦 Instalando dependencias de producción..."
cd dist/backend && npm install --omit=dev && cd ../..

# 5. Reiniciar PM2
echo "♻️  Reiniciando servicios..."
cd dist/backend && pm2 restart signage-backend --update-env 2>/dev/null || \
  pm2 start main.js --name signage-backend
cd ../..

pm2 save

echo "✅ Deploy completado"
pm2 status
