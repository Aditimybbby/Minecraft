#!/bin/bash
set -e

DATA=/data
PLUGINS=$DATA/plugins
JAR=$DATA/paper.jar

echo "╔══════════════════════════════════════╗"
echo "║  MC Panel — PaperMC + Geyser Server  ║"
echo "╚══════════════════════════════════════╝"
echo "[MC] Version:    ${MC_VERSION}"
echo "[MC] Memory:     ${MC_MEMORY}"
echo "[MC] Difficulty: ${MC_DIFFICULTY}"
echo ""

mkdir -p "$PLUGINS"

# ── Download PaperMC ──────────────────────────────────────────────────────────
download_paper() {
  echo "[PaperMC] Fetching build info..."
  if [ "$MC_VERSION" = "latest" ]; then
    MC_VERSION=$(curl -s "https://api.papermc.io/v2/projects/paper" | jq -r '.versions[-1]')
    echo "[PaperMC] Latest version: $MC_VERSION"
  fi
  BUILD=$(curl -s "https://api.papermc.io/v2/projects/paper/versions/${MC_VERSION}/builds" | jq -r '.builds[-1].build')
  JARNAME="paper-${MC_VERSION}-${BUILD}.jar"
  URL="https://api.papermc.io/v2/projects/paper/versions/${MC_VERSION}/builds/${BUILD}/downloads/${JARNAME}"
  echo "[PaperMC] Downloading build $BUILD..."
  curl -L -o "$JAR" "$URL"
  echo "$MC_VERSION-$BUILD" > "$DATA/.paper_build"
  echo "[PaperMC] Done."
}

CACHED=$(cat "$DATA/.paper_build" 2>/dev/null || echo "")
EXPECTED="${MC_VERSION}-latest"
if [ ! -f "$JAR" ] || [[ "$CACHED" != *"$MC_VERSION"* ]]; then
  download_paper
else
  echo "[PaperMC] Using cached jar."
fi

# ── Download plugin helper ─────────────────────────────────────────────────────
download_plugin() {
  local name="$1" url="$2" file="$PLUGINS/${name}.jar"
  if [ ! -f "$file" ]; then
    echo "[Plugin] Downloading $name..."
    curl -L -o "$file" "$url" && echo "[Plugin] $name OK" || echo "[Plugin] WARNING: $name download failed"
  else
    echo "[Plugin] $name already present."
  fi
}

# ── Geyser ────────────────────────────────────────────────────────────────────
download_plugin "Geyser-Spigot" \
  "https://download.geysermc.org/v2/projects/geyser/versions/latest/builds/latest/downloads/spigot"

# ── Floodgate ─────────────────────────────────────────────────────────────────
download_plugin "floodgate-spigot" \
  "https://download.geysermc.org/v2/projects/floodgate/versions/latest/builds/latest/downloads/spigot"

# ── ViaVersion ────────────────────────────────────────────────────────────────
VV_URL=$(curl -s "https://api.github.com/repos/ViaVersion/ViaVersion/releases/latest" | jq -r '.assets[] | select(.name | endswith(".jar")) | .browser_download_url' | head -1)
download_plugin "ViaVersion" "$VV_URL"

# ── ViaBackwards ──────────────────────────────────────────────────────────────
VB_URL=$(curl -s "https://api.github.com/repos/ViaVersion/ViaBackwards/releases/latest" | jq -r '.assets[] | select(.name | endswith(".jar")) | .browser_download_url' | head -1)
download_plugin "ViaBackwards" "$VB_URL"

# ── Accept EULA ───────────────────────────────────────────────────────────────
echo "eula=true" > "$DATA/eula.txt"

# ── Write server.properties ───────────────────────────────────────────────────
cat > "$DATA/server.properties" <<EOF
server-port=25565
enable-rcon=true
rcon.port=${RCON_PORT}
rcon.password=${RCON_PASSWORD}
broadcast-rcon-to-ops=false
online-mode=${MC_ONLINE_MODE}
gamemode=${MC_GAMEMODE}
difficulty=${MC_DIFFICULTY}
max-players=${MC_MAX_PLAYERS}
pvp=${MC_PVP}
allow-flight=${MC_ALLOW_FLIGHT}
view-distance=${MC_VIEW_DISTANCE}
motd=${MC_MOTD}
hardcore=${MC_HARDCORE}
spawn-monsters=${MC_SPAWN_MONSTERS}
spawn-animals=${MC_SPAWN_ANIMALS}
enable-command-block=${MC_ENABLE_COMMAND_BLOCK}
level-type=${MC_LEVEL_TYPE}
level-seed=${MC_SEED}
level-name=world
white-list=${MC_WHITELIST}
EOF
echo "[MC] server.properties written."

# ── Write Geyser config ───────────────────────────────────────────────────────
mkdir -p "$PLUGINS/Geyser-Spigot"
cat > "$PLUGINS/Geyser-Spigot/config.yml" <<EOF
bedrock:
  port: 19132
  clone-remote-port: false
  motd1: "${MC_MOTD}"
  motd2: "Geyser"
  server-name: "${MC_MOTD}"
remote:
  address: auto
  port: 25565
  auth-type: floodgate
floodgate-key-file: key.pem
EOF
echo "[Geyser] config written."

# ── Start sidecar ─────────────────────────────────────────────────────────────
echo "[Sidecar] Starting on :8080..."
SIDECAR_SECRET="$SIDECAR_SECRET" \
DATA_DIR="$DATA" \
PLUGINS_DIR="$PLUGINS" \
PANEL_API_URL="$PANEL_API_URL" \
AUTO_SHUTDOWN_MINUTES="$AUTO_SHUTDOWN_MINUTES" \
RCON_HOST="127.0.0.1" \
RCON_PORT="$RCON_PORT" \
RCON_PASSWORD="$RCON_PASSWORD" \
node /sidecar/index.js &
SIDECAR_PID=$!
echo "[Sidecar] PID: $SIDECAR_PID"

# ── Start PaperMC ─────────────────────────────────────────────────────────────
echo "[MC] Starting PaperMC with ${MC_MEMORY} RAM..."
cd "$DATA"

java \
  -Xms512M -Xmx${MC_MEMORY} \
  -XX:+UseG1GC \
  -XX:+ParallelRefProcEnabled \
  -XX:MaxGCPauseMillis=200 \
  -XX:+UnlockExperimentalVMOptions \
  -XX:+DisableExplicitGC \
  -XX:+AlwaysPreTouch \
  -XX:G1NewSizePercent=30 \
  -XX:G1MaxNewSizePercent=40 \
  -XX:G1HeapRegionSize=8M \
  -XX:G1ReservePercent=20 \
  -XX:G1HeapWastePercent=5 \
  -XX:G1MixedGCCountTarget=4 \
  -XX:InitiatingHeapOccupancyPercent=15 \
  -XX:G1MixedGCLiveThresholdPercent=90 \
  -XX:SurvivorRatio=32 \
  -XX:+PerfDisableSharedMem \
  -XX:MaxTenuringThreshold=1 \
  -Dusing.aikars.flags=https://mcflags.emc.gs \
  -jar "$JAR" --nogui &

MC_PID=$!
echo "[MC] Server PID: $MC_PID"

cleanup() {
  echo "[MC] Graceful shutdown..."
  kill -TERM $MC_PID 2>/dev/null || true
  sleep 5
  kill $SIDECAR_PID 2>/dev/null || true
  exit 0
}
trap cleanup SIGTERM SIGINT

wait $MC_PID
cleanup
