# Two stages so the shipped image carries no compiler and no dev dependencies.
# Built from the REPO ROOT as context (Dokploy's default), so every path below
# is prefixed with `server/`. The root .dockerignore keeps that context small.

FROM node:20-alpine AS build
WORKDIR /app
# Copied first and alone: this layer only rebuilds when the dependency set
# changes, not on every source edit.
COPY server/package.json server/package-lock.json ./
RUN npm ci
COPY server/tsconfig.json ./
COPY server/src ./src
RUN npm run build

FROM node:20-alpine AS run
WORKDIR /app
ENV NODE_ENV=production
COPY server/package.json server/package-lock.json ./
# `--omit=dev` is why the compiler and vitest do not reach production.
RUN npm ci --omit=dev && npm cache clean --force
COPY --from=build /app/dist ./dist
# Migrations are read from disk at boot by `migrate()`, so they are files in
# the image rather than anything compiled into it.
COPY server/migrations ./migrations

# Never root. A container that is compromised should not also be privileged.
USER node

EXPOSE 8080
# Dokploy health-checks this; `/health` touches no database, so it answers
# while migrations are still running rather than failing the deploy.
HEALTHCHECK --interval=30s --timeout=3s --start-period=20s \
  CMD node -e "fetch('http://127.0.0.1:8080/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "dist/index.js"]
