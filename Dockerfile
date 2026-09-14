# One image: the API and the built PWA behind the same origin. That is not
# tidiness — a service worker belongs to an origin, and the app having exactly
# one place to live is what keeps an installed copy from ever being served a
# shell it cannot boot.

FROM node:24-bookworm-slim AS build
WORKDIR /app

COPY package.json package-lock.json tsconfig.base.json tsconfig.json ./
COPY packages ./packages
COPY apps ./apps
RUN npm ci
RUN npm run build --workspace @calcflow/web \
 && npm run build --workspace @calcflow/server


# The server's own dependencies, resolved from the same lockfile but without the
# rest of the monorepo: React, KaTeX and the icon set are already inside the
# bundle the web build produced, and shipping them again is 100 MB of nothing.
FROM node:24-bookworm-slim AS deps
WORKDIR /app
COPY package.json package-lock.json ./
COPY packages/shared/package.json ./packages/shared/
COPY packages/engine/package.json ./packages/engine/
COPY packages/generators/package.json ./packages/generators/
COPY apps/web/package.json ./apps/web/
COPY apps/server/package.json ./apps/server/
RUN npm ci --omit=dev --workspace @calcflow/server && npm cache clean --force


FROM node:24-bookworm-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production \
    HOST=0.0.0.0 \
    PORT=8787 \
    CALCFLOW_DB=/data/calcflow.db \
    CALCFLOW_WEB=/app/web

COPY --from=deps  /app/node_modules ./node_modules
COPY --from=build /app/apps/server/dist ./dist
COPY --from=build /app/apps/server/package.json ./package.json
COPY --from=build /app/apps/web/dist ./web
# `node_modules/@calcflow/shared` is the symlink npm made for the workspace, and
# it points back out at `packages/shared` — which exists in the build stage and
# not here. So the shared package comes along, built: the server imports real
# values from it (`TIERS`), and a symlink into nothing is a container that dies
# on its first import with `ERR_MODULE_NOT_FOUND`.
COPY --from=build /app/packages/shared/package.json ./packages/shared/package.json
COPY --from=build /app/packages/shared/dist ./packages/shared/dist

# The volume mounts here, and the process is not root, so the directory has to
# exist with the right owner before Docker seeds the volume from it.
RUN mkdir -p /data && chown -R node:node /data
USER node
VOLUME /data
EXPOSE 8787

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s \
  CMD node -e "fetch('http://127.0.0.1:'+process.env.PORT+'/api/health').then(r=>process.exit(r.ok?0:1),()=>process.exit(1))"

CMD ["node", "dist/index.js"]
