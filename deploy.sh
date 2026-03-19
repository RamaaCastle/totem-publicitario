#!/bin/bash
# ============================================================
# DEPLOY — pedrazaviajes.dyndns.org
# Ejecutar en el servidor via SSH:
#   bash deploy.sh
# ============================================================
set -e

echo "▶ Actualizando código..."
git pull origin main 2>/dev/null || echo "(sin git, continuando...)"

echo "▶ Copiando .env de producción..."
cp .env.production .env

echo "▶ Levantando servicios con Docker Compose..."
docker compose -f docker-compose.prod.yml up -d --build

echo ""
echo "✓ Deploy completo."
echo "  Backend API:  http://pedrazaviajes.dyndns.org:5050/api/v1"
echo "  Admin panel:  http://pedrazaviajes.dyndns.org:8080"
echo "  Swagger docs: http://pedrazaviajes.dyndns.org:5050/api/docs"
echo ""
echo "▶ Logs del backend:"
docker compose -f docker-compose.prod.yml logs --tail=30 backend
