# ─── Stage 1: deps ───────────────────────────────────────────
FROM node:20-alpine AS deps
RUN apk add --no-cache libc6-compat openssl
WORKDIR /app
COPY package.json package-lock.json* ./
COPY prisma ./prisma
# Use `npm ci` if lock file exists, otherwise `npm install`
RUN if [ -f package-lock.json ]; then npm ci; else npm install; fi

# ─── Stage 2: builder ────────────────────────────────────────
FROM node:20-alpine AS builder
RUN apk add --no-cache libc6-compat openssl
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
# NEXT_PUBLIC_* lar build vaqtida bundlega yoziladi — demo rejim shu yerdan o'tadi
ARG NEXT_PUBLIC_DEMO_CREDENTIALS=0
ENV NEXT_PUBLIC_DEMO_CREDENTIALS=$NEXT_PUBLIC_DEMO_CREDENTIALS
# Faqat build (page-data collection) uchun placeholder'lar — bu stage'dagi ENV
# runner'ga o'tmaydi; runtime qiymatlar docker-compose'dan keladi.
ENV DATABASE_URL="postgresql://build:build@localhost:5432/build"
ENV JWT_SECRET="build-time-placeholder-secret-not-used-at-runtime"
RUN npx prisma generate && npm run build

# ─── Stage 3: runner ─────────────────────────────────────────
FROM node:20-alpine AS runner
# tzdata — TZ=Asia/Tashkent ishlashi uchun shart. Bo'lmasa Node jimgina
# UTC'ga qaytadi va dars vaqtlari 5 soat surilib ketadi.
RUN apk add --no-cache openssl tzdata
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/scripts ./scripts
COPY --from=builder /app/tsconfig.json ./tsconfig.json

RUN mkdir -p public/uploads public/models && chown -R nextjs:nodejs public scripts

USER nextjs

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Sync DB schema on container start, then run.
# `prisma db push` works without migration files.
CMD ["sh", "-c", "npx prisma db push --skip-generate --accept-data-loss && npx next start -p 3000"]
