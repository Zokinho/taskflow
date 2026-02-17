# Stage 1: Install backend dependencies
FROM node:20-alpine AS deps
WORKDIR /app
# Build tools for bcrypt native compilation
RUN apk add --no-cache python3 make g++
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# Stage 2: Build web app
FROM node:20-alpine AS web-build
WORKDIR /app
COPY src/web/package.json src/web/package-lock.json* src/web/
RUN npm ci --prefix src/web
COPY src/web/ src/web/
RUN npm run --prefix src/web build

# Stage 3: Build backend (tsc + prisma generate)
FROM node:20-alpine AS build
WORKDIR /app
RUN apk add --no-cache python3 make g++
COPY package.json package-lock.json ./
RUN npm ci
COPY tsconfig.json ./
COPY prisma/ prisma/
COPY src/ src/
# Remove web source (already built in stage 2)
RUN rm -rf src/web
RUN npx prisma generate
RUN npm run build

# Stage 4: Production image
FROM node:20-alpine AS production
WORKDIR /app

# Prisma needs OpenSSL
RUN apk add --no-cache openssl

COPY --from=deps /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=build /app/node_modules/@prisma ./node_modules/@prisma
COPY prisma/ prisma/
COPY package.json ./

# Web static files — will be copied to Caddy volume at runtime
COPY --from=web-build /app/src/web/dist ./web-static

COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

EXPOSE 3002

ENTRYPOINT ["/docker-entrypoint.sh"]
