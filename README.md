# Signage Platform

**Plataforma profesional de Digital Signage — SaaS Ready**

Sistema completo de señalización digital con panel administrativo web, API backend, y reproductor de pantallas fullscreen con soporte offline.

---

## Estructura del proyecto

```
signage-platform/
├── packages/
│   ├── backend/         # NestJS API — Puerto 3001
│   ├── admin/           # Next.js 14 Admin Panel — Puerto 3000
│   └── player/          # Electron Player (TV/Kiosk)
├── docs/
│   ├── ARCHITECTURE.md  # Diagrama y decisiones de arquitectura
│   ├── DATABASE.md      # Esquema de base de datos
│   └── API.md           # Referencia de API
├── docker/
│   └── postgres/init.sql
├── docker-compose.yml
├── .env.example
└── README.md
```

---

## Inicio rápido

### Requisitos
- Node.js >= 20
- pnpm >= 8
- Docker + Docker Compose

### 1. Configurar variables de entorno
```bash
cp .env.example .env
# Editar .env con tus valores
```

### 2. Levantar base de datos y Redis
```bash
pnpm docker:up
```

### 3. Instalar dependencias
```bash
pnpm install
```

### 4. Ejecutar seeds (primera vez)
```bash
cd packages/backend
pnpm seed
```

### 5. Levantar en desarrollo
```bash
# Backend + Admin en paralelo
pnpm dev

# O individualmente:
pnpm dev:backend   # Puerto 3001
pnpm dev:admin     # Puerto 3000
pnpm dev:player    # Electron
```

---

## Credenciales por defecto

| Campo | Valor |
|-------|-------|
| Email | admin@signage.local |
| Password | Admin@123456 |

> **Cambiar inmediatamente en producción**

---

## Componentes

### Backend (NestJS)
- `http://localhost:3001/api/v1` — REST API
- `http://localhost:3001/api/docs` — Swagger UI (solo dev)
- `ws://localhost:3001/screens` — WebSocket Gateway

### Admin Panel (Next.js)
- `http://localhost:3000` — Panel web

### Player (Electron)
Ver [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) para instrucciones de build.

---

## Flujo de uso

### 1. Registrar una pantalla
1. En el panel: ir a **Pantallas** → **Nueva pantalla**
2. Anotar el código de 6 caracteres generado (ej: `ABC123`)
3. En el TV: abrir el player → ingresar el código → **Vincular**

### 2. Subir contenido
1. Panel → **Multimedia** → drag & drop imágenes o videos

### 3. Crear playlist
1. Panel → **Playlists** → **Nueva playlist**
2. Agregar items con el orden y duración deseados

### 4. Crear y asignar campaña
1. Panel → **Campañas** → **Nueva campaña**
2. Asociar la playlist
3. Configurar fechas y horarios de programación
4. Asignar a pantallas o grupos

### 5. Activar campaña
1. En la tabla de campañas → clic en ▶ Activar
2. La pantalla recibirá la actualización en tiempo real via WebSocket

---

## Seguridad

- Passwords: bcrypt (12 rounds)
- Tokens: JWT 15min + refresh token rotation 7d
- RBAC: sistema flexible de roles y permisos
- Rate limiting: 100 req/min general, 10 req/min en login
- Helmet headers: CSP, HSTS, X-Frame-Options
- Uploads: validación por MIME type, límite 500MB, checksum SHA-256
- Audit log: todas las acciones importantes quedan registradas

---

## Producción (Docker)

```bash
# Build e inicio completo
docker-compose up -d --build

# Ver logs
docker-compose logs -f backend

# Ejecutar migraciones
docker-compose exec backend node dist/database/migrations/...
```

---

## Roadmap SaaS

- [ ] Multi-tenant con separación por schema PostgreSQL
- [ ] Billing / planes de suscripción (Stripe)
- [ ] Auto-update del player (electron-updater)
- [ ] 2FA (TOTP)
- [ ] Analytics de reproducción
- [ ] CDN para archivos de media
- [ ] App Android para TV
- [ ] Dashboard con gráficos avanzados
- [ ] API pública para integraciones

---

## Tecnologías

| Capa | Tecnología |
|------|-----------|
| Backend | NestJS 10, TypeScript, TypeORM |
| Base de datos | PostgreSQL 16 |
| Cache | Redis 7 |
| Auth | JWT + Refresh Token Rotation |
| Admin | Next.js 14, React 18, Tailwind CSS |
| Player | Electron 30, React, Vite |
| WebSockets | Socket.io |
| Container | Docker + Docker Compose |

---

## Documentación

- [Arquitectura del sistema](docs/ARCHITECTURE.md)
- [Esquema de base de datos](docs/DATABASE.md)
- [Referencia de API](docs/API.md)
