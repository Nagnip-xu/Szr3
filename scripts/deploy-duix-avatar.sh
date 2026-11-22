#!/usr/bin/env bash
set -euo pipefail

log() { echo "[duix-deploy] $*"; }

log "=== check gpu ==="
nvidia-smi || { echo "nvidia-smi failed"; exit 1; }

if ! command -v docker >/dev/null 2>&1; then
  log "install docker"
  apt-get update -y
  DEBIAN_FRONTEND=noninteractive apt-get install -y docker.io docker-compose git curl ca-certificates
  systemctl enable docker
  systemctl start docker
else
  log "docker already installed: $(docker --version)"
fi

if ! docker info 2>/dev/null | grep -q nvidia; then
  if ! command -v nvidia-ctk >/dev/null 2>&1; then
    log "install nvidia-container-toolkit"
    apt-get update -y
    apt-get install -y nvidia-container-toolkit || {
      distribution=$(. /etc/os-release; echo ${ID}${VERSION_ID})
      curl -fsSL https://nvidia.github.io/libnvidia-container/gpgkey | gpg --dearmor -o /usr/share/keyrings/nvidia-container-toolkit-keyring.gpg
      curl -s -L "https://nvidia.github.io/libnvidia-container/stable/deb/nvidia-container-toolkit.list" | \
        sed 's#deb https://#deb [signed-by=/usr/share/keyrings/nvidia-container-toolkit-keyring.gpg] https://#g' | \
        tee /etc/apt/sources.list.d/nvidia-container-toolkit.list
      apt-get update -y
      apt-get install -y nvidia-container-toolkit
    }
    nvidia-ctk runtime configure --runtime=docker
    systemctl restart docker
  fi
fi

log "=== prepare project ==="
mkdir -p /opt/duix
cd /opt/duix
if [ ! -d Duix-Avatar/.git ]; then
  rm -rf Duix-Avatar
  git clone --depth 1 https://github.com/duixcom/Duix-Avatar.git
fi
cd Duix-Avatar
git pull --ff-only || true

mkdir -p ~/duix_avatar_data/voice/data ~/duix_avatar_data/face2face

log "=== pull images (may take 30+ min) ==="
cd deploy
docker compose version >/dev/null 2>&1 && COMPOSE="docker compose" || COMPOSE="docker-compose"
$COMPOSE -f docker-compose-linux.yml pull

log "=== start services ==="
$COMPOSE -f docker-compose-linux.yml up -d

sleep 15
$COMPOSE -f docker-compose-linux.yml ps

log "=== health check ==="
curl -sf http://127.0.0.1:8383/ >/dev/null && echo "video service port 8383: OK" || echo "video service port 8383: waiting..."
curl -sf http://127.0.0.1:18180/ >/dev/null && echo "tts service port 18180: OK" || echo "tts service port 18180: waiting..."

docker ps --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}'

log "DONE"
