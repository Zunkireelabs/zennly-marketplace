# syntax=docker/dockerfile:1
FROM node:22-alpine AS base

# Install (also runs postinstall: prisma generate + copy-maplibre-worker.mjs)
FROM base AS deps
WORKDIR /app
COPY package.json package-lock.json ./
# prisma.config.ts + prisma/schema.prisma must exist before npm install runs,
# since postinstall (prisma generate) needs them - they aren't copied yet by
# the package.json/lock-only COPY above.
COPY prisma.config.ts ./
COPY prisma ./prisma
# npm ci requires byte-exact lockfile parity; this image's npm resolves
# maplibre-gl's nested wasm32-wasi optional deps differently than the npm
# version that generated the lockfile on Windows. npm install tolerates
# that without actually changing the lockfile.
RUN npm install

# Build
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# /src/generated/prisma and /public/maplibre/ are both gitignored - generated
# by deps' postinstall (prisma generate + copy-maplibre-worker.mjs) - and
# live outside node_modules, so the COPYs above don't bring them. Without
# these, @/generated/prisma/client fails to resolve during the build below.
COPY --from=deps /app/src/generated ./src/generated
COPY --from=deps /app/public/maplibre ./public/maplibre

# NEXT_PUBLIC_* vars are inlined into the client bundle at build time, not read
# from the runtime environment, so they must arrive as build args.
ARG NEXT_PUBLIC_SUPABASE_URL
ARG NEXT_PUBLIC_SUPABASE_ANON_KEY
ARG NEXT_PUBLIC_SITE_URL
ARG NEXT_PUBLIC_TRACK_EVENTS
ENV NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL
ENV NEXT_PUBLIC_SUPABASE_ANON_KEY=$NEXT_PUBLIC_SUPABASE_ANON_KEY
ENV NEXT_PUBLIC_SITE_URL=$NEXT_PUBLIC_SITE_URL
ENV NEXT_PUBLIC_TRACK_EVENTS=$NEXT_PUBLIC_TRACK_EVENTS
ENV NEXT_TELEMETRY_DISABLED=1

RUN npm run build

# Runtime
FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
