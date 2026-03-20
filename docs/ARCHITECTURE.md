# Signage Platform — Architecture Document

## System Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                        SIGNAGE PLATFORM                             │
│                                                                     │
│  ┌─────────────┐    REST/WS    ┌─────────────┐    WebSocket        │
│  │    ADMIN    │◄────────────►│   BACKEND   │◄──────────────────►  │
│  │  (Next.js)  │              │  (NestJS)   │                      │
│  │  Port 3000  │              │  Port 3001  │   ┌──────────────┐   │
│  └─────────────┘              │             │   │   PLAYER     │   │
│                               │  ┌────────┐ │◄─►│  (Electron)  │   │
│  ┌─────────────┐              │  │  REST  │ │   │  Kiosk TV    │   │
│  │   MOBILE    │◄────────────►│  │  API   │ │   └──────────────┘   │
│  │  (Browser)  │              │  └────────┘ │                      │
│  └─────────────┘              │  ┌────────┐ │   ┌──────────────┐   │
│                               │  │   WS   │ │◄─►│   PLAYER     │   │
│                               │  │Gateway │ │   │  (Electron)  │   │
│                               │  └────────┘ │   │  Kiosk TV    │   │
│                               └──────┬──────┘   └──────────────┘   │
│                                      │                              │
│                          ┌───────────┴───────────┐                 │
│                          │                       │                 │
│                    ┌─────▼─────┐         ┌──────▼─────┐           │
│                    │PostgreSQL │         │   Redis     │           │
│                    │  Port     │         │  Port 6379  │           │
│                    │  5432     │         │  (cache +   │           │
│                    └───────────┘         │   sessions) │           │
│                                          └────────────┘           │
└─────────────────────────────────────────────────────────────────────┘
```

## Component Responsibilities

### 1. Admin Panel (Next.js 14 — App Router)
- Single Page Application consumed via browser
- Communicates with Backend via REST API + WebSocket
- JWT stored in httpOnly cookies (XSS protection)
- Server Components for initial data load
- Client Components for interactive UI

### 2. Backend API (NestJS + TypeScript)
- RESTful API for all CRUD operations
- WebSocket Gateway for real-time screen communication
- JWT Authentication with Refresh Token rotation
- RBAC (Role-Based Access Control)
- File upload with validation
- Heartbeat processing
- Audit logging
- Rate limiting per endpoint

### 3. Player (Electron)
- Runs on TV/kiosk hardware (Windows, Linux, Raspberry Pi OS)
- Fullscreen, no browser chrome
- Connects to Backend via WebSocket
- Downloads and caches media locally
- Works offline (serves from local cache)
- Auto-reconnects on connection loss
- Sends heartbeat every 30s
- Auto-starts on boot

## Technology Stack Justification

| Component | Technology | Why |
|-----------|-----------|-----|
| Backend | NestJS + TypeScript | Modular, DI, decorators, guards, interceptors, pipes — enterprise-grade |
| Database | PostgreSQL 16 | ACID, JSON support, UUID, extensions, production proven |
| Cache/Sessions | Redis 7 | Fast key-value, pub/sub for WS, rate limiting, session storage |
| Admin Frontend | Next.js 14 (App Router) | SSR + CSR, TypeScript, best React meta-framework, Vercel deploy |
| UI Library | shadcn/ui + Tailwind CSS | Accessible, unstyled primitives, fully customizable, no vendor lock |
| Player | Electron 30 | Cross-platform, Node.js access, kiosk mode, offline-first, auto-update |
| ORM | TypeORM | NestJS integration, migrations, decorators, multi-DB support |
| Auth | JWT + Refresh Tokens | Stateless, scalable, refresh rotation prevents token theft |
| File Storage | Local → S3 (abstracted) | Provider pattern allows swap without code changes |
| Container | Docker + Docker Compose | Reproducible environments, easy deployment |

## Player Technology Decision: Electron

**Why Electron over alternatives:**

| Option | Pros | Cons |
|--------|------|------|
| **Electron** ✅ | Full offline support, kiosk mode, auto-start, cross-platform, Node.js APIs | Larger bundle |
| Web App (Kiosk Chrome) | Light | Requires Chrome config, OS-level kiosk setup, harder offline |
| Android App | Native TV | Requires Android TV hardware, separate build pipeline |
| React Native | Mobile-friendly | Poor TV/kiosk support |

Electron provides the best balance: **offline-first**, **hardware access**, **auto-update**, **cross-platform** (Windows sticks, Linux boxes, mini PCs attached to TVs).

## SaaS Architecture: Multi-Tenant Design

```
Organization (Tenant)
├── Users (belong to org)
├── Roles (org-scoped)
├── Screens (org-scoped)
├── Media Files (org-scoped, isolated storage)
├── Campaigns (org-scoped)
└── Playlists (org-scoped)
```

Every resource includes `organizationId`. All queries are automatically scoped via a NestJS interceptor that reads the JWT claim `organizationId`.

### Tenant Isolation Strategy
- **Logical isolation** (MVP): Single database, `organization_id` FK on all tables
- **Schema isolation** (future): One PostgreSQL schema per tenant for stronger isolation
- **Database isolation** (enterprise): One DB per tenant for compliance requirements

## Security Architecture

```
Request Flow:
Client → Rate Limiter → Helmet Headers → CORS Check
      → JWT Guard → RBAC Guard → Route Handler
      → Validation Pipe → Service → Repository
      → Response Interceptor → Client
```

Key security controls:
1. **Passwords**: bcrypt (12 rounds)
2. **Tokens**: JWT RS256 or HS256 with short expiry (15m) + refresh rotation
3. **Storage**: Uploaded files validated by mime + magic bytes, stored outside web root
4. **Audit**: Every mutating action logged to `audit_logs` table
5. **Rate Limiting**: Per IP + per user via Redis
6. **Headers**: Helmet (CSP, HSTS, X-Frame-Options, etc.)

## Communication Flows

### Screen Registration Flow
```
Player → POST /api/screens/register { deviceCode }
Backend → Creates screen record, returns screen token
Player → Stores screen token locally
Player → WS connect with screen token
Backend → Authenticates WS connection, adds to room
```

### Content Sync Flow
```
Admin assigns playlist to screen
Backend → emits WS event: "playlist:updated" to screen room
Player → receives event, requests new playlist via REST
Player → downloads new media files to local cache
Player → confirms download complete via heartbeat
```

### Heartbeat Flow
```
Every 30s:
Player → POST /api/devices/heartbeat { screenId, status, currentPlaylist }
Backend → updates last_seen, marks online
Backend → responds with { hasUpdate: bool }
If hasUpdate → Player fetches new config
```
