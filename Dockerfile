# ============================================================
# Stage 1: Build admin (Next.js static export) + backend (NestJS)
# ============================================================
FROM node:20-alpine AS builder
WORKDIR /app

RUN npm install -g pnpm

# Copy workspace manifests first (for layer caching)
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/backend/package.json ./packages/backend/
COPY packages/admin/package.json    ./packages/admin/
COPY packages/player/package.json   ./packages/player/

RUN pnpm install --frozen-lockfile

# Copy source code
COPY packages/backend ./packages/backend
COPY packages/admin   ./packages/admin
COPY packages/player  ./packages/player

# Build admin static export (NEXT_PUBLIC_API_URL baked in at build time)
ARG NEXT_PUBLIC_API_URL=https://tv.pedraza.com.ar
ARG NEXT_PUBLIC_CLOUDINARY_CLOUD=dnyuwzead
ARG NEXT_PUBLIC_CLOUDINARY_PRESET=Pedraza
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_CLOUDINARY_CLOUD=$NEXT_PUBLIC_CLOUDINARY_CLOUD
ENV NEXT_PUBLIC_CLOUDINARY_PRESET=$NEXT_PUBLIC_CLOUDINARY_PRESET

RUN pnpm --filter admin build

# Build player with /player/ base path for server hosting
RUN cd /app/packages/player && VITE_BASE_PATH=/player/ pnpm run build:web

# Build backend
RUN pnpm --filter backend build

# Create clean production deploy folder (resolves pnpm symlinks)
RUN pnpm --filter backend deploy --prod --legacy /deploy

# Copy admin static files into backend's public folder
RUN cp -r packages/admin/out /deploy/dist/public

# Copy player static files into backend's player folder
RUN cp -r packages/player/dist/renderer /deploy/dist/player

# ============================================================
# Stage 2: Production image (minimal)
# ============================================================
FROM node:20-alpine AS production
WORKDIR /app
ENV NODE_ENV=production

COPY --from=builder /deploy ./

RUN mkdir -p uploads

EXPOSE 3001
CMD ["node", "dist/main"]
