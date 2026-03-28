# ─── PaperMC + Geyser + Floodgate + ViaVersion ───────────────────────────────
# Deploy as a separate Railway service. Attach volume at /data.

FROM eclipse-temurin:21-jre-alpine

RUN apk add --no-cache curl jq bash nodejs npm unzip

RUN mkdir -p /data/plugins /sidecar
WORKDIR /data

COPY sidecar/package.json /sidecar/
RUN cd /sidecar && npm install --production
COPY sidecar/index.js /sidecar/

COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

# Panel reaches sidecar on this port (internal Railway network only)
EXPOSE 8080
# Minecraft Java
EXPOSE 25565
# Geyser (Bedrock) — Railway TCP proxy handles this
EXPOSE 19132

ENV MC_VERSION=latest \
    MC_MEMORY=2G \
    MC_SEED="" \
    MC_DIFFICULTY=normal \
    MC_GAMEMODE=survival \
    MC_MAX_PLAYERS=20 \
    MC_PVP=true \
    MC_ALLOW_FLIGHT=false \
    MC_VIEW_DISTANCE=10 \
    MC_MOTD="A Minecraft Server" \
    MC_HARDCORE=false \
    MC_SPAWN_MONSTERS=true \
    MC_SPAWN_ANIMALS=true \
    MC_ONLINE_MODE=true \
    MC_ENABLE_COMMAND_BLOCK=false \
    MC_LEVEL_TYPE="minecraft:normal" \
    MC_WHITELIST=false \
    RCON_PASSWORD=changeme_rcon \
    RCON_PORT=25575 \
    SIDECAR_SECRET=changeme \
    PANEL_API_URL="" \
    AUTO_SHUTDOWN_MINUTES=30

ENTRYPOINT ["/entrypoint.sh"]
