# --- Etapa 1: build de producción --------------------------------------------
# Compila el frontend a archivos estáticos (carpeta dist/).
FROM node:22-alpine AS build
WORKDIR /app

# Habilita pnpm (viene con Node vía Corepack).
RUN corepack enable

# Instala dependencias primero (se cachea si no cambian los lockfiles).
COPY package.json pnpm-lock.yaml* ./
RUN pnpm install --frozen-lockfile

# Copia el resto del código y compila.
COPY . .
RUN pnpm build

# --- Etapa 2: servidor estático (Nginx) --------------------------------------
# Sirve el build con Nginx. Imagen final ligera, sin Node.
FROM nginx:alpine AS web
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
