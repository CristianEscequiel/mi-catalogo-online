FROM node:22-alpine AS builder
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build -- --configuration production
RUN if [ -f dist/frontend/browser/index.csr.html ]; then cp dist/frontend/browser/index.csr.html dist/frontend/browser/index.html; fi

# nginx-unprivileged corre como usuario no-root (UID 101) y escucha en 8080, no en 80.
FROM nginxinc/nginx-unprivileged:1.27-alpine AS runner

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/dist/frontend/browser /usr/share/nginx/html

EXPOSE 8080
