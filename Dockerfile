FROM node:22-slim AS base

RUN apt-get update && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package.json package-lock.json .npmrc ./
RUN npm ci

COPY . .

# NEXT_PUBLIC_* vars are inlined into the client bundle at build time.
# They must be declared as ARGs and re-exported as ENVs before `npm run build`.
ARG NEXT_PUBLIC_AGG_APP_ID
ARG NEXT_PUBLIC_AGG_API_KEY
ARG NEXT_PUBLIC_AGG_BASE_URL
ARG NEXT_PUBLIC_AGG_WS_URL
ARG NEXT_PUBLIC_AGG_AUTH_REDIRECT
ARG NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID
ARG NEXT_PUBLIC_SITE_URL
ENV NEXT_PUBLIC_AGG_APP_ID=$NEXT_PUBLIC_AGG_APP_ID
ENV NEXT_PUBLIC_AGG_API_KEY=$NEXT_PUBLIC_AGG_API_KEY
ENV NEXT_PUBLIC_AGG_BASE_URL=$NEXT_PUBLIC_AGG_BASE_URL
ENV NEXT_PUBLIC_AGG_WS_URL=$NEXT_PUBLIC_AGG_WS_URL
ENV NEXT_PUBLIC_AGG_AUTH_REDIRECT=$NEXT_PUBLIC_AGG_AUTH_REDIRECT
ENV NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=$NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID
ENV NEXT_PUBLIC_SITE_URL=$NEXT_PUBLIC_SITE_URL

RUN npx prisma generate
RUN npm run build

EXPOSE 3000

CMD ["sh", "-c", "node scripts/recover-oracle-migration.mjs && npx prisma migrate deploy && npm start"]
