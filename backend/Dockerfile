FROM node:22-alpine AS builder
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY --from=builder /app/dist ./dist

# No se corre como root. /app/uploads es un volumen: uno nuevo hereda este dueño;
# uno existente creado por root se corrige una sola vez (ver specs/infra-hardening/tasks.md, T13).
RUN mkdir -p /app/uploads && chown -R node:node /app
USER node

EXPOSE 3000
CMD ["sh", "-c", "npm run migrations:run:prod && node dist/main"]
