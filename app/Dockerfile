# EduFlow — production image. Built by the hosting platform from the uploaded source zip (deploy-ready pattern):
# building inside Linux is required because @node-rs/argon2 (password hashing) ships a native binary per platform.
# Serves on PORT 80. Runtime configuration (database, keys, tokens) comes from the environment / env file, never the image.

# ── 1. dependencies ──
FROM node:22-bookworm-slim AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

# ── 2. build (next build → .next/standalone: server.js + traced node_modules) ──
FROM node:22-bookworm-slim AS build
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# ── 3. runtime ──
FROM node:22-bookworm-slim AS run
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=80 \
    HOSTNAME=0.0.0.0
# port 80 without running as root: let node bind privileged ports, then drop to the unprivileged `node` user
RUN apt-get update && apt-get install -y --no-install-recommends libcap2-bin \
 && setcap 'cap_net_bind_service=+ep' "$(readlink -f "$(which node)")" \
 && apt-get purge -y libcap2-bin && apt-get autoremove -y && rm -rf /var/lib/apt/lists/*
COPY --from=build --chown=node:node /app/.next/standalone ./
COPY --from=build --chown=node:node /app/.next/static ./.next/static
COPY --from=build --chown=node:node /app/public ./public
# schema, roles, RLS, migrations and the db tool, for `node scripts/db.mjs migrate | user | encrypt` inside the container
COPY --from=build --chown=node:node /app/db ./db
COPY --from=build --chown=node:node /app/scripts/db.mjs ./scripts/db.mjs
# Amazon RDS's public CA bundle (ap-south-1): with DB_SSL_CA empty, the app and db.mjs verify the database's TLS against it
ADD --chown=node:node https://truststore.pki.rds.amazonaws.com/ap-south-1/ap-south-1-bundle.pem /app/db-ca.pem
# defense in depth (the zip already leaves them out): no env file and no demo passwords inside the image
RUN find /app -name node_modules -prune -o -name '.env*' ! -name '.env.example' -type f -print -exec rm -f {} + \
 && rm -f /app/db/seed/users.json
USER node
EXPOSE 80
# No image HEALTHCHECK: on Docker Swarm (Dokploy) a task is kept out of the load balancer until its check passes, and the
# first deploy answered 502 while the app was up. Use the platform's own health check on /api/ping (expects {"ok":true}).
# The configuration guards run BEFORE the server: a refused start exits non-zero before Next prints "Ready".
CMD ["sh","-c","node scripts/db.mjs preflight && exec node server.js"]
