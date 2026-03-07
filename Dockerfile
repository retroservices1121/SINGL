FROM node:22-slim AS base

RUN apt-get update && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package.json package-lock.json .npmrc ./
RUN npm ci

COPY . .

RUN npx prisma generate
RUN npm run build

EXPOSE 3000

CMD ["sh", "-c", "npx prisma migrate deploy && npm start"]
