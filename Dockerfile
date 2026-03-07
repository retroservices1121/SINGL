FROM node:22-slim AS base

RUN apt-get update && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package.json package-lock.json .npmrc ./
RUN npm ci

COPY . .

ARG NEXT_PUBLIC_PRIVY_APP_ID
ARG NEXT_PUBLIC_DFLOW_METADATA_URL
ARG NEXT_PUBLIC_DFLOW_TRADE_URL
ENV NEXT_PUBLIC_PRIVY_APP_ID=$NEXT_PUBLIC_PRIVY_APP_ID
ENV NEXT_PUBLIC_DFLOW_METADATA_URL=$NEXT_PUBLIC_DFLOW_METADATA_URL
ENV NEXT_PUBLIC_DFLOW_TRADE_URL=$NEXT_PUBLIC_DFLOW_TRADE_URL

RUN npx prisma generate
RUN npm run build

EXPOSE 3000

CMD ["sh", "-c", "npx prisma migrate deploy && npm start"]
