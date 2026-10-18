// Serviço de render: POST /render {marca, modelo, textos} → JPG pronto para o Instagram.
//   RENDER_TOKEN  (obrigatório)  senha que o n8n manda em "Authorization: Bearer ..."
//   PUBLIC_URL    (opcional)     endereço público desta VM, ex.: https://render.seudominio.com (as URLs devolvidas usam isso)
//   PORT          (opcional)     padrão 3100
//   HOST          (opcional)     padrão 127.0.0.1 (só a própria VM). Use 0.0.0.0 só atrás de HTTPS/proxy.
const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const { MODELOS, validar, descrever, ErroValidacao } = require("./modelos.js");

const PORT = Number(process.env.PORT || 3100);
const HOST = process.env.HOST || "127.0.0.1";
const TOKEN = process.env.RENDER_TOKEN;
const PUBLIC_URL = (process.env.PUBLIC_URL || `http://${HOST}:${PORT}`).replace(/\/$/, "");
const DIR = process.env.FILES_DIR || path.join(__dirname, "files");
const RETENCAO_MS = Number(process.env.RETENCAO_HORAS || 48) * 3600 * 1000;
if (!TOKEN || TOKEN.length < 16) {
  console.error("Defina RENDER_TOKEN com pelo menos 16 caracteres.");
  process.exit(1);
}
fs.mkdirSync(DIR, { recursive: true });

const json = (res, status, corpo) => {
  const b = JSON.stringify(corpo, null, 2);
  res.writeHead(status, { "content-type": "application/json; charset=utf-8", "content-length": Buffer.byteLength(b) });
  res.end(b);
};
const iguais = (a, b) => a.length === b.length && crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
const autorizado = (req) => iguais(String(req.headers.authorization || ""), `Bearer ${TOKEN}`);

function lerCorpo(req, limite = 100_000) {
  return new Promise((ok, erro) => {
    let n = 0;
    const partes = [];
    req.on("data", (c) => {
      n += c.length;
      if (n > limite) (erro(new ErroValidacao("corpo grande demais")), req.destroy());
      else partes.push(c);
    });
    req.on("end", () => ok(Buffer.concat(partes).toString("utf8")));
    req.on("error", erro);
  });
}

function salvar(buffer) {
  const id = `${crypto.randomUUID().replace(/-/g, "")}.jpg`;
  fs.writeFileSync(path.join(DIR, id), buffer);
  return { arquivo: id, url: `${PUBLIC_URL}/files/${id}` };
}

function limpar() {
  const limite = Date.now() - RETENCAO_MS;
  for (const f of fs.readdirSync(DIR)) {
    const p = path.join(DIR, f);
    if (/^[0-9a-f]{32}\.jpg$/.test(f) && fs.statSync(p).mtimeMs < limite) fs.unlinkSync(p);
  }
}
setInterval(limpar, 3600 * 1000).unref();
limpar();

// uma renderização por vez: o canvas é pesado e a VM é pequena
let fila = Promise.resolve();
const emFila = (tarefa) => (fila = fila.then(tarefa, tarefa));

async function render({ marca, modelo, textos }) {
  const m = MODELOS[marca]?.[modelo];
  if (!m) throw new ErroValidacao(`modelo desconhecido: ${marca}/${modelo}. Veja GET /modelos`);
  const args = validar(m, textos ?? {});
  const t0 = Date.now();
  const r = await emFila(() => m.fn(args));
  const avisos = (m.multiplo ? r.doc : r).avisos;
  const fatal = avisos.filter((a) => /invade|sai da margem/.test(a));
  if (fatal.length) throw new ErroValidacao(`texto não cabe no modelo: ${fatal.join(" | ")}`);
  if (m.multiplo) {
    return { marca, modelo, arquivos: r.fatias.map((b, i) => ({ ordem: i + 1, ...salvar(b) })), avisos: r.doc.avisos, ms: Date.now() - t0 };
  }
  return { marca, modelo, arquivos: [{ ordem: 1, ...salvar(r.jpg()) }], avisos: r.avisos, ms: Date.now() - t0 };
}

const servidor = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, "http://x");
    if (req.method === "GET" && url.pathname === "/health") return json(res, 200, { ok: true });
    if (req.method === "GET" && url.pathname.startsWith("/files/")) {
      const nome = url.pathname.slice(7);
      if (!/^[0-9a-f]{32}\.jpg$/.test(nome)) return json(res, 404, { erro: "não encontrado" });
      const p = path.join(DIR, nome);
      if (!fs.existsSync(p)) return json(res, 404, { erro: "não encontrado (arquivos expiram)" });
      const b = fs.readFileSync(p);
      res.writeHead(200, { "content-type": "image/jpeg", "content-length": b.length, "cache-control": "public, max-age=3600" });
      return res.end(b);
    }
    if (!autorizado(req)) return json(res, 401, { erro: "token inválido" });
    if (req.method === "GET" && url.pathname === "/modelos") return json(res, 200, descrever({ marca: url.searchParams.get("marca") || undefined, formato: url.searchParams.get("formato") || undefined, automatico: url.searchParams.get("automatico") === "1" }));
    if (req.method === "POST" && url.pathname === "/render") {
      let corpo;
      try {
        corpo = JSON.parse(await lerCorpo(req));
      } catch (e) {
        if (e instanceof ErroValidacao) throw e;
        throw new ErroValidacao("corpo precisa ser JSON válido");
      }
      const out = await render(corpo);
      if (url.searchParams.get("binario") === "1" && out.arquivos.length === 1) {
        const b = fs.readFileSync(path.join(DIR, out.arquivos[0].arquivo));
        res.writeHead(200, { "content-type": "image/jpeg", "content-length": b.length, "x-avisos": JSON.stringify(out.avisos).slice(0, 500) });
        return res.end(b);
      }
      return json(res, 200, out);
    }
    return json(res, 404, { erro: "rota não existe" });
  } catch (e) {
    if (e instanceof ErroValidacao) return json(res, 422, { erro: e.message });
    console.error(e);
    return json(res, 500, { erro: "falha ao renderizar" });
  }
});
if (require.main === module) servidor.listen(PORT, HOST, () => console.log(`ezf-render em ${HOST}:${PORT}`));
module.exports = { servidor, render };
