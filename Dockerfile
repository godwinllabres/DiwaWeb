# Two stage image build

# First stage — build the static site
FROM node:20-alpine AS build

WORKDIR /app

COPY package.json package-lock.json ./
# devDependencies are required: `npm run build` runs `tsc -b && vite build`
RUN npm ci

COPY . .

# Blank VITE_API_URL so app/lib/api.ts falls back to same-origin "/api"
# (proxied to the SeviAI container by nginx). Belt to .dockerignore's
# suspenders — the tracked .env would otherwise bake the production URL.
ENV VITE_API_URL=
ENV VITE_BASE_PATH=/

RUN npm run build

# Second stage — serve dist/ with nginx and proxy /api to SeviAI
FROM nginx:alpine

COPY deploy/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
    CMD wget -q --spider http://127.0.0.1/ || exit 1
