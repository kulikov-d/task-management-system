FROM node:20-alpine AS builder

RUN apk add --no-cache python3 make g++

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci
RUN npm rebuild bcrypt

COPY . .
RUN npx prisma generate --schema=src/prisma/schema.prisma
RUN npm run build

RUN npm prune --omit=dev
RUN npm rebuild bcrypt

FROM node:20-alpine

RUN apk add --no-cache libstdc++ gcc
RUN npm i -g tsx

WORKDIR /app

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./
COPY --from=builder /app/src/prisma ./src/prisma
COPY --from=builder /app/uploads ./uploads

RUN mkdir -p uploads

EXPOSE 3000

CMD ["sh", "-c", "npx prisma migrate deploy --schema=./src/prisma/schema.prisma && tsx src/prisma/seed.ts && node dist/main.js"]
