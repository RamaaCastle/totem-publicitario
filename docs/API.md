# Signage Platform — API Reference

Base URL: `http://localhost:3001/api/v1`
Swagger UI: `http://localhost:3001/api/docs` (development only)

All responses follow the envelope format:
```json
{ "success": true, "data": {...}, "timestamp": "..." }
```

## Authentication

### POST /auth/login
```json
Request:  { "email": "admin@co.com", "password": "..." }
Response: { "accessToken": "...", "refreshToken": "...", "user": {...} }
```

### POST /auth/refresh
```json
Request:  { "userId": "uuid", "refreshToken": "..." }
Response: { "accessToken": "...", "refreshToken": "..." }
```

### POST /auth/logout
`Authorization: Bearer <accessToken>`

### GET /auth/me
`Authorization: Bearer <accessToken>` → user profile

---

## Users
| Method | Path | Permission |
|--------|------|-----------|
| GET | /users | users:read |
| GET | /users/:id | users:read |
| POST | /users | users:create |
| PUT | /users/:id | users:update |
| DELETE | /users/:id | users:delete |

---

## Screens
| Method | Path | Permission |
|--------|------|-----------|
| GET | /screens | screens:read |
| GET | /screens/:id | screens:read |
| GET | /screens/:id/playlist | screens:read |
| POST | /screens | screens:create |
| PUT | /screens/:id | screens:update |
| DELETE | /screens/:id | screens:delete |

---

## Media
| Method | Path | Permission |
|--------|------|-----------|
| GET | /media | media:read |
| POST | /media/upload | media:create |
| GET | /media/:id | media:read |
| DELETE | /media/:id | media:delete |
| GET | /media/files/* | public |

---

## Playlists
| Method | Path | Permission |
|--------|------|-----------|
| GET | /playlists | playlists:read |
| POST | /playlists | playlists:create |
| PUT | /playlists/:id | playlists:update |
| PUT | /playlists/:id/items | playlists:update |
| DELETE | /playlists/:id | playlists:delete |

---

## Campaigns
| Method | Path | Permission |
|--------|------|-----------|
| GET | /campaigns | campaigns:read |
| POST | /campaigns | campaigns:create |
| PUT | /campaigns/:id | campaigns:update |
| PATCH | /campaigns/:id/status | campaigns:update |
| POST | /campaigns/:id/assign | campaigns:update |
| DELETE | /campaigns/:id/assign/:screenId | campaigns:update |
| DELETE | /campaigns/:id | campaigns:delete |

---

## Device (Player) Endpoints — No auth required

### POST /devices/register/:deviceCode
Pairs a player with the platform. Returns device JWT token.

```json
Request:  { "appVersion": "1.0.0", "osInfo": "Linux" }
Response: { "token": "...", "screen": { "id": "...", "name": "...", ... } }
```

### GET /devices/config/:deviceCode
Returns the active playlist for the device.

```json
Response: {
  "screen": { "id": "...", "name": "...", "orientation": "landscape" },
  "playlist": {
    "id": "...",
    "name": "...",
    "defaultDurationSeconds": 10,
    "items": [
      {
        "id": "...",
        "order": 0,
        "durationSeconds": 10,
        "media": { "id": "...", "type": "image", "url": "...", "checksum": "..." }
      }
    ]
  }
}
```

### POST /devices/heartbeat/:deviceCode
```json
Request:  { "currentPlaylistId": "uuid", "appVersion": "1.0.0", "cpuUsage": 12.5 }
Response: { "hasUpdate": false }
```

---

## WebSocket Events (namespace: /screens)

### Connection
```javascript
const socket = io('ws://server/screens', {
  auth: { token: deviceToken }
});
```

### Events received by player
| Event | Payload | Action |
|-------|---------|--------|
| `playlist:updated` | `{ screenId, timestamp }` | Fetch new config |
| `config:sync` | `{ screenId }` | Sync config |
| `command` | `{ command, payload }` | Execute command |

### Events emitted by player
| Event | Payload |
|-------|---------|
| `heartbeat` | `{ currentPlaylistId, appVersion, cpuUsage, ... }` |

### Events received by admin panel
| Event | Description |
|-------|-------------|
| `screen:connected` | A screen came online |
| `screen:disconnected` | A screen went offline |
| `screen:heartbeat` | Heartbeat received |
| `screen:playlist_updated` | Playlist was pushed |
