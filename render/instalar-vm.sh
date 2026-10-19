#!/usr/bin/env bash
# Instala e sobe o serviço ezf-render numa VM Ubuntu (a mesma do n8n). Pode rodar de novo para atualizar.
#   bash render/instalar-vm.sh
# Variáveis opcionais: REPO, BRANCH, DIR, PORT, HOST_BIND
set -euo pipefail

REPO="${REPO:-https://github.com/Fernandes-ez/templatesinstagram.git}"
BRANCH="${BRANCH:-claude/gallant-brown-2pj3gi}"
DIR="${DIR:-$HOME/templatesinstagram}"
PORT="${PORT:-3100}"
ENV_FILE=/etc/ezf-render.env
USUARIO="$(id -un)"

echo "==> 1/6 Pacotes e Node.js"
sudo apt-get update -y >/dev/null
sudo apt-get install -y git curl ca-certificates openssl >/dev/null
if ! command -v node >/dev/null || [ "$(node -p 'process.versions.node.split(".")[0]')" -lt 20 ]; then
  curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash - >/dev/null
  sudo apt-get install -y nodejs >/dev/null
fi
echo "    node $(node -v)"

echo "==> 2/6 Código ($BRANCH)"
if [ -d "$DIR/.git" ]; then
  git -C "$DIR" fetch origin "$BRANCH" && git -C "$DIR" checkout "$BRANCH" && git -C "$DIR" pull --ff-only origin "$BRANCH"
else
  git clone -b "$BRANCH" "$REPO" "$DIR"
fi

echo "==> 3/6 Dependências (ezf, puka, tabua)"
for marca in ezf puka tabua; do
  (cd "$DIR/$marca" && npm install --omit=dev --no-audit --no-fund >/dev/null)
done

echo "==> 4/6 Onde escutar"
# Se o n8n roda em Docker, ele não enxerga 127.0.0.1 da VM: escutamos só no IP da ponte do Docker (não fica exposto na internet).
HOST_BIND="${HOST_BIND:-127.0.0.1}"
if [ "$HOST_BIND" = "127.0.0.1" ] && command -v docker >/dev/null && sudo docker ps --format '{{.Image}} {{.Names}}' 2>/dev/null | grep -qi n8n; then
  PONTE="$(ip -4 addr show docker0 2>/dev/null | awk '/inet /{sub("/.*","",$2); print $2; exit}')"
  [ -n "$PONTE" ] && HOST_BIND="$PONTE"
fi
echo "    escutando em $HOST_BIND:$PORT"

echo "==> 5/6 Configuração e serviço"
if [ ! -f "$ENV_FILE" ]; then
  echo "RENDER_TOKEN=$(openssl rand -hex 24)" | sudo tee "$ENV_FILE" >/dev/null
  sudo chmod 600 "$ENV_FILE"
fi
sudo mkdir -p /var/lib/ezf-render/files && sudo chown -R "$USUARIO" /var/lib/ezf-render
sudo tee /etc/systemd/system/ezf-render.service >/dev/null <<UNIT
[Unit]
Description=ezf-render (JPG de Instagram para o n8n)
After=network.target

[Service]
User=$USUARIO
WorkingDirectory=$DIR/render
ExecStart=$(command -v node) server.js
Environment=PORT=$PORT
Environment=HOST=$HOST_BIND
Environment=PUBLIC_URL=http://$HOST_BIND:$PORT
Environment=FILES_DIR=/var/lib/ezf-render/files
EnvironmentFile=$ENV_FILE
Restart=always
RestartSec=3

[Install]
WantedBy=multi-user.target
UNIT
sudo systemctl daemon-reload
sudo systemctl enable ezf-render >/dev/null 2>&1
sudo systemctl restart ezf-render

echo "==> 6/6 Conferindo"
(cd "$DIR/render" && npm test 2>&1 | tail -3)
sleep 2
TOKEN="$(sudo grep '^RENDER_TOKEN=' "$ENV_FILE" | cut -d= -f2)"
curl -fsS "http://$HOST_BIND:$PORT/health" >/dev/null && echo "    /health ok"
curl -fsS -H "Authorization: Bearer $TOKEN" "http://$HOST_BIND:$PORT/modelos?formato=feed&automatico=1" | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{const m=JSON.parse(s);console.log("    modelos de feed:",Object.entries(m).map(([k,v])=>k+"="+Object.keys(v).length).join(" "))})'

cat <<FIM

Pronto. No n8n:
  1) Credencial "Header Auth":  Name = Authorization   Value = Bearer $TOKEN
  2) Workflow 01, nó "Marcas e regras": render_url = http://$HOST_BIND:$PORT

Para ver o token de novo:  sudo grep RENDER_TOKEN $ENV_FILE
Logs:                      journalctl -u ezf-render -f
Atualizar depois:          bash $DIR/render/instalar-vm.sh
FIM
