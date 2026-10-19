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

# Sem perguntas durante a instalação (o "needrestart" do Ubuntu abre um menu que trava scripts) e com a saída visível.
export DEBIAN_FRONTEND=noninteractive NEEDRESTART_MODE=a
APT="sudo -E apt-get -o Dpkg::Options::=--force-confold -o DPkg::Lock::Timeout=120"

echo "==> 1/6 Pacotes e Node.js"
$APT update -y
$APT install -y git curl ca-certificates openssl ffmpeg
if ! command -v node >/dev/null || [ "$(node -p 'process.versions.node.split(".")[0]')" -lt 20 ]; then
  echo "    instalando Node 22 (pode levar 1 a 3 minutos)"
  curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
  $APT install -y nodejs
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
# Se o n8n roda em Docker, ele não enxerga 127.0.0.1 da VM. Escutamos só no gateway da rede do container do n8n
# (não fica exposto na internet) e liberamos no firewall só essa interface, só nessa porta.
HOST_BIND="${HOST_BIND:-127.0.0.1}"
IFACE=""
if [ "$HOST_BIND" = "127.0.0.1" ] && command -v docker >/dev/null; then
  N8N="$(sudo docker ps --format '{{.Names}} {{.Image}}' | awk 'tolower($2) ~ /n8n/ && tolower($2) !~ /postgres/ {print $1; exit}')"
  if [ -n "$N8N" ]; then
    GW="$(sudo docker inspect "$N8N" --format '{{range .NetworkSettings.Networks}}{{.Gateway}} {{end}}' | awk '{print $1}')"
    if [ -n "$GW" ]; then
      HOST_BIND="$GW"
      IFACE="$(ip -o -4 addr show | awk -v ip="$GW" '$4 ~ "^"ip"/" {print $2; exit}')"
      echo "    n8n no container '$N8N', rede com gateway $GW (interface ${IFACE:-?})"
    fi
  fi
fi
echo "    escutando em $HOST_BIND:$PORT"
if [ -n "$IFACE" ] && command -v iptables >/dev/null; then
  if ! sudo iptables -C INPUT -i "$IFACE" -p tcp --dport "$PORT" -j ACCEPT 2>/dev/null; then
    sudo iptables -I INPUT -i "$IFACE" -p tcp --dport "$PORT" -j ACCEPT
    echo "    firewall: liberada a porta $PORT para a interface $IFACE"
  fi
  # grava a regra para sobreviver a reinício da VM
  if ! dpkg -s iptables-persistent >/dev/null 2>&1; then
    echo iptables-persistent iptables-persistent/autosave_v4 boolean true | sudo debconf-set-selections
    echo iptables-persistent iptables-persistent/autosave_v6 boolean true | sudo debconf-set-selections
    $APT install -y iptables-persistent
  fi
  sudo netfilter-persistent save >/dev/null 2>&1 || true
fi

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
curl -fsS "http://$HOST_BIND:$PORT/health" >/dev/null && echo "    /health ok (a partir da VM)"
if [ -n "${N8N:-}" ]; then
  if sudo docker exec "$N8N" wget -qO- "http://$HOST_BIND:$PORT/health" >/dev/null 2>&1; then echo "    /health ok (a partir do container $N8N)"; else echo "    ATENÇÃO: o container $N8N NÃO alcança http://$HOST_BIND:$PORT. Veja o firewall (sudo iptables -S INPUT)."; fi
fi
curl -fsS -H "Authorization: Bearer $TOKEN" "http://$HOST_BIND:$PORT/modelos?formato=feed&automatico=1" | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{const m=JSON.parse(s);console.log("    modelos de feed:",Object.entries(m).map(([k,v])=>k+"="+Object.keys(v).length).join(" "))})'

cat <<FIM

Pronto. No n8n:
  1) Credencial "Header Auth":  Name = Authorization   Value = Bearer $TOKEN
  2) Workflow 01, nó "Marcas e regras": render_url = http://$HOST_BIND:$PORT

Para ver o token de novo:  sudo grep RENDER_TOKEN $ENV_FILE
Logs:                      journalctl -u ezf-render -f
Atualizar depois:          bash $DIR/render/instalar-vm.sh
FIM
