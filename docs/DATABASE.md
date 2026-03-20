# Signage Platform — Database Schema

## Entity Relationship Diagram

```
organizations
    │
    ├──< users (many)
    │       └──< user_roles >──< roles >──< role_permissions >──< permissions
    │
    ├──< screens (many)
    │       ├──>< screen_group_screens >──< screen_groups
    │       ├──< campaign_assignments
    │       └──< heartbeats
    │
    ├──< media_files (many)
    │
    ├──< playlists (many)
    │       └──< playlist_items >── media_files
    │
    └──< campaigns (many)
            ├──> playlists (FK)
            └──< campaign_assignments >── screens / screen_groups
```

## Tables

### `organizations`
| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| name | VARCHAR(100) | |
| slug | VARCHAR(100) UNIQUE | URL-safe identifier |
| plan | ENUM | free/starter/professional/enterprise |
| maxScreens | INT | Subscription limit |
| maxStorageBytes | BIGINT | Storage quota |
| isActive | BOOLEAN | |
| settings | JSONB | Custom config |

### `users`
| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| name | VARCHAR(100) | |
| email | VARCHAR(255) UNIQUE IDX | |
| password | VARCHAR | bcrypt hashed |
| status | ENUM | active/inactive/suspended/pending |
| isSuperAdmin | BOOLEAN | Cross-organization |
| organizationId | UUID FK | |
| refreshTokenHash | VARCHAR | Hashed refresh token |
| failedLoginAttempts | INT | Lockout counter |
| lockedUntil | TIMESTAMP | Auto-unlock time |
| twoFactorEnabled | BOOLEAN | 2FA ready |
| twoFactorSecret | VARCHAR | TOTP secret |

### `roles`
| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| name | VARCHAR(100) | |
| isSystemRole | BOOLEAN | Cannot be deleted |
| organizationId | UUID FK | null = global |

### `permissions`
| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| name | VARCHAR UNIQUE | e.g. "campaigns:create" |
| action | ENUM | create/read/update/delete/manage |
| resource | ENUM | campaigns/screens/media/etc |

### `screens`
| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| deviceCode | VARCHAR(50) UNIQUE IDX | 6-char pairing code |
| status | ENUM | online/offline/maintenance |
| orientation | ENUM | landscape/portrait |
| lastSeenAt | TIMESTAMP | Updated on heartbeat |
| ipAddress | VARCHAR | Last known IP |
| currentPlaylistId | UUID | Currently playing |
| organizationId | UUID FK | |

### `media_files`
| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| originalName | VARCHAR | |
| storagePath | VARCHAR | Server filesystem path |
| publicUrl | VARCHAR | Served URL |
| type | ENUM | image/video |
| mimeType | VARCHAR | |
| sizeBytes | BIGINT | |
| checksum | VARCHAR | SHA-256 for dedup |
| organizationId | UUID FK | |

### `playlists`
| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| name | VARCHAR | |
| defaultDurationSeconds | INT | Default for images |
| isActive | BOOLEAN | |
| organizationId | UUID FK | |

### `playlist_items`
| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| playlistId | UUID FK | |
| mediaFileId | UUID FK | |
| order | INT | Sort order |
| durationSeconds | INT nullable | Override default |
| isActive | BOOLEAN | |

### `campaigns`
| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| status | ENUM | draft/active/paused/completed/archived |
| priority | INT | Higher = shown first |
| playlistId | UUID FK | |
| startsAt | TIMESTAMPTZ | |
| endsAt | TIMESTAMPTZ | |
| scheduleDays | ARRAY | e.g. ["1","2","3","4","5"] |
| scheduleTimeFrom | VARCHAR(5) | "HH:MM" |
| scheduleTimeTo | VARCHAR(5) | "HH:MM" |
| organizationId | UUID FK | |

### `campaign_assignments`
| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| campaignId | UUID FK | |
| screenId | UUID FK nullable | Assign to specific screen |
| screenGroupId | UUID FK nullable | Assign to group |
| isActive | BOOLEAN | |

### `heartbeats`
| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| screenId | UUID FK | IDX(screenId, createdAt) |
| ipAddress | VARCHAR | |
| appVersion | VARCHAR | |
| cpuUsage | FLOAT | |
| memoryUsage | FLOAT | |

### `audit_logs`
| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| action | ENUM | e.g. "campaigns.created" |
| userId | UUID FK | |
| organizationId | UUID IDX | |
| targetId | UUID | Affected resource |
| before | JSONB | Pre-change state |
| after | JSONB | Post-change state |
| ipAddress | VARCHAR | |

## Indexes Strategy
- `users.email` — for login lookup
- `screens.deviceCode` — for player pairing
- `heartbeats(screenId, createdAt)` — for time-series queries
- `audit_logs(organizationId, createdAt)` — for filtered history
- `audit_logs(userId, createdAt)` — for user activity
