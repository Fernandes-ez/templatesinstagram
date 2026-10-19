// Templates de Instagram da ezf.tech (manual v0.4) em JPG.
//   npm run generate → output/jpg/*.jpg, output/previews/*.png, output/carrossel_escopo/*.jpg
// Cores, fontes e arquivos vêm de brand.config.js. Logos e ícones saem dos arquivos oficiais em marca/.
const fs = require("node:fs");
const path = require("node:path");
const { createCanvas, GlobalFonts, Path2D, loadImage } = require("@napi-rs/canvas");
const { Resvg } = require("@resvg/resvg-js");
const B = require("./brand.config.js");

const K = B.cores;
const OUT = path.join(__dirname, "output");
const GRAVAR = require.main === module; // rodando direto grava em output/; importado (serviço de render) só devolve os buffers
if (GRAVAR) for (const d of ["jpg", "previews", "carrossel_escopo"]) fs.mkdirSync(path.join(OUT, d), { recursive: true });

const ICONES = ["celular", "relogio", "loja", "pin", "mensagem", "janela", "calendario", "lupa", "cadeado", "grafico", "preco", "sistema"];
const exigidos = [...Object.values(B.fontes), ...Object.values(B.logo), ...ICONES.flatMap((i) => ["sobre-tinta", "sobre-nevoa"].map((t) => path.join(B.icones, t, `${i}.svg`)))];
const faltando = exigidos.filter((f) => !fs.existsSync(f));
if (faltando.length) {
  console.error(`Faltam arquivos da marca. Nada foi gerado:\n${faltando.map((f) => `  - ${path.relative(__dirname, f)}`).join("\n")}`);
  process.exit(1);
}

const FAM = {};
for (const [k, f] of Object.entries(B.fontes)) {
  GlobalFonts.registerFromPath(f, `Ezf_${k}`);
  FAM[k] = `Ezf_${k}`;
}
const medidor = createCanvas(10, 10).getContext("2d");
const CHAVE = new Path2D(B.chaveD);
const cache = new Map();
async function imagem(arquivo) {
  if (!cache.has(arquivo)) cache.set(arquivo, await loadImage(arquivo));
  return cache.get(arquivo);
}
const iconeImg = async (tema, nome, size) => {
  const svg = fs.readFileSync(path.join(B.icones, tema, `${nome}.svg`), "utf8");
  return loadImage(new Resvg(svg, { fitTo: { mode: "width", value: Math.round(size * 2) } }).render().asPng());
};

function fonte(ctx, f, size, tracking = 0) {
  ctx.font = `${size}px ${FAM[f]}`;
  ctx.letterSpacing = `${(tracking / 1000) * size}px`;
}

/** Quebra o texto em linhas de palavras. Marcação: {palavra} vira palavra em destaque com chaves em Geist Mono. */
function quebrar(str, { font, size, tracking, w, destaque, cor }) {
  const palavras = [];
  let dentro = false;
  for (const bruto of str.split(/\s+/)) {
    let p = bruto;
    const abre = p.startsWith("{");
    if (abre) (dentro = true), (p = p.slice(1));
    const fecha = p.endsWith("}");
    if (fecha) p = p.slice(0, -1);
    const pecas = [];
    if (abre) pecas.push({ t: "{", font: "monoMedium", cor: destaque });
    pecas.push({ t: p, font, cor: dentro ? destaque : cor });
    if (fecha) pecas.push({ t: "}", font: "monoMedium", cor: destaque });
    palavras.push(pecas);
    if (fecha) dentro = false;
  }
  const larg = (pecas) => pecas.reduce((s, c) => (fonte(medidor, c.font, size, tracking), s + medidor.measureText(c.t).width), 0);
  fonte(medidor, font, size, tracking);
  const espaco = medidor.measureText(" ").width;
  const linhas = [];
  let atual = [];
  let wAtual = 0;
  for (const pecas of palavras) {
    const wp = larg(pecas);
    if (atual.length && wAtual + espaco + wp > w) (linhas.push({ palavras: atual, w: wAtual }), (atual = []), (wAtual = 0));
    wAtual += (atual.length ? espaco : 0) + wp;
    atual.push(pecas);
  }
  if (atual.length) linhas.push({ palavras: atual, w: wAtual });
  return { linhas, espaco };
}

class Doc {
  constructor(nome, W, H, fundo, margem = 80) {
    this.nome = nome;
    this.W = W;
    this.H = H;
    this.M = margem;
    this.canvas = createCanvas(W, H);
    this.ctx = this.canvas.getContext("2d");
    this.avisos = [];
    this.limiteBase = H - margem - 100; // texto abaixo disso invade o rodapé (o rodapé tem nome "rodape" e fica de fora)
    this.ctx.fillStyle = fundo;
    this.ctx.fillRect(0, 0, W, H);
  }

  /** Texto com quebra automática. (x, y) = linha de base da 1ª linha (ou da última, com ancora:"baixo"). */
  texto(str, { font = "regular", size, cor, x, y, w, leading, align = "left", tracking = 0, destaque = K.ambar, ancora = "cima", nome = "texto" }) {
    const ctx = this.ctx;
    const maxW = w ?? this.W - this.M - x;
    const lead = leading ?? Math.round(size * 1.3);
    const { linhas, espaco } = quebrar(str, { font, size, tracking, w: maxW, destaque, cor });
    const y0 = ancora === "baixo" ? y - (linhas.length - 1) * lead : y;
    let xmin = Infinity;
    let xmax = -Infinity;
    linhas.forEach((l, i) => {
      let cx = align === "center" ? x - l.w / 2 : align === "right" ? x - l.w : x;
      xmin = Math.min(xmin, cx);
      xmax = Math.max(xmax, cx + l.w);
      l.palavras.forEach((pecas, k) => {
        for (const c of pecas) {
          fonte(ctx, c.font, size, tracking);
          ctx.fillStyle = c.cor;
          ctx.fillText(c.t, cx, y0 + i * lead);
          cx += ctx.measureText(c.t).width;
        }
        if (k < l.palavras.length - 1) cx += espaco;
      });
    });
    if (xmin < this.M - 1 || xmax > this.W - this.M + 1) this.avisos.push(`${nome}: "${str.slice(0, 40)}" sai da margem (${Math.round(xmin)}–${Math.round(xmax)})`);
    const base = y0 + (linhas.length - 1) * lead;
    if (nome !== "rodape" && nome !== "etiqueta" && base > this.limiteBase) this.avisos.push(`${nome}: "${str.slice(0, 40)}" invade o rodapé (texto longo demais)`);
    return { x0: xmin, x1: xmax, topo: y0 - size * 0.72, base, linhas: linhas.length };
  }

  titulo(str, o) {
    return this.texto(str, { font: "semi", tracking: -30, leading: Math.round(o.size * 1.04), nome: "titulo", ...o });
  }

  /** Etiqueta em Geist Mono minúscula, no estilo de comentário de código. */
  etiqueta(str, o) {
    return this.texto(str, { font: "mono", size: 28, tracking: 20, nome: "etiqueta", ...o });
  }

  apoio(str, o) {
    return this.texto(str, { font: "regular", size: 38, leading: 54, nome: "apoio", ...o });
  }

  /** Chave "{" (dir 1) ou "}" (dir -1) desenhada em traço, com o mesmo desenho do logo. (x, y) = canto da caixa. */
  chave({ x, y, h, dir = 1, cor, sw = 3, alpha = 1, ctx = this.ctx }) {
    const s = h / 400;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(x + (dir < 0 ? 100 * s : 0), y);
    ctx.scale(dir * s, s);
    ctx.strokeStyle = cor;
    ctx.lineWidth = sw / s;
    ctx.lineCap = "round";
    ctx.stroke(CHAVE);
    ctx.restore();
  }

  /** Campo de chaves em tom sobre tom, que some para um lado (fade: "baixo" some para baixo). */
  campoChaves({ x = 0, y = 0, w = this.W, h, cor = K.lilas, alpha = 0.3, altura = 150, passoX = 74, passoY = 190, sw = 2, fade = "baixo" }) {
    const c = createCanvas(w, h);
    const g = c.getContext("2d");
    let n = 0;
    for (let r = 0; r * passoY < h + altura; r++) {
      for (let col = -1; col * passoX < w + passoX; col++) {
        const ox = col * passoX + (r % 2 ? passoX / 2 : 0);
        const oy = r * passoY - altura / 4;
        this.chave({ ctx: g, x: ox, y: oy, h: altura, dir: (col + r) % 2 ? -1 : 1, cor, sw, alpha: alpha * (0.55 + ((n++ * 37) % 10) / 22) });
      }
    }
    g.globalCompositeOperation = "destination-in";
    const grad = g.createLinearGradient(0, fade === "baixo" ? 0 : h, 0, fade === "baixo" ? h : 0);
    grad.addColorStop(0, "rgba(0,0,0,1)");
    grad.addColorStop(0.35, "rgba(0,0,0,.9)");
    grad.addColorStop(1, "rgba(0,0,0,0)");
    g.fillStyle = grad;
    g.fillRect(0, 0, w, h);
    this.ctx.drawImage(c, x, y);
  }

  async icone(tema, nome, { x, y, size }) {
    this.ctx.drawImage(await iconeImg(tema, nome, size), x, y, size, size);
  }

  /** Logo oficial. Colorido só a partir de 200 px; abaixo disso, mono (manual, seção 02). */
  async logo(fundo, { x, y, largura = 260, align = "left" }) {
    const mono = largura < B.logoMinimoCor || fundo === "violeta";
    const arq = fundo === "tinta" ? (mono ? B.logo.monoNevoa : B.logo.corSobreTinta) : fundo === "violeta" ? B.logo.monoNevoa : mono ? B.logo.monoTinta : B.logo.corSobreNevoa;
    const img = await imagem(arq);
    const h = (img.height / img.width) * largura;
    const x0 = align === "right" ? x - largura : x;
    this.ctx.drawImage(img, x0, y, largura, h);
    return { x0, x1: x0 + largura, y0: y, y1: y + h };
  }

  /** Rodapé padrão: logo à esquerda, frase curta em mono à direita, na linha de base do logo. */
  async rodape(fundo, frase, cor) {
    const l = await this.logo(fundo, { x: this.M, y: this.H - this.M - 61, largura: 260 });
    if (frase) this.etiqueta(frase, { size: 26, cor, x: this.W - this.M, y: l.y1 - 14, align: "right", w: 640, nome: "rodape" });
  }

  retanguloArred(x, y, w, h, r, { fill, stroke, lw = 2 }) {
    const c = this.ctx;
    c.beginPath();
    c.roundRect(x, y, w, h, r);
    if (fill) (c.fillStyle = fill), c.fill();
    if (stroke) (c.strokeStyle = stroke), (c.lineWidth = lw), c.stroke();
  }

  /** Botão de ação: Âmbar com texto Tinta, raio 8. */
  botao(str, { x, y, altura = 104 }) {
    fonte(medidor, "semi", 38, 0);
    const w = medidor.measureText(str).width + 2 * 56;
    this.retanguloArred(x, y, w, altura, 8, { fill: K.ambar });
    this.texto(str, { font: "semi", size: 38, cor: K.tinta, x: x + w / 2, y: y + altura / 2 + 13, align: "center", w: w, nome: "botao" });
    return { x0: x, x1: x + w, y0: y, y1: y + altura };
  }

  /** Fio pontilhado com ponto Âmbar no fim (ou em `no`). */
  fio({ x0, x1, y, cor = K.violeta, no = x1 }) {
    const c = this.ctx;
    c.save();
    c.strokeStyle = cor;
    c.lineWidth = 4;
    c.lineCap = "round";
    c.setLineDash([0.1, 16]);
    c.beginPath();
    c.moveTo(x0, y);
    c.lineTo(x1, y);
    c.stroke();
    c.restore();
    c.fillStyle = K.ambar;
    c.beginPath();
    c.arc(no, y, 11, 0, Math.PI * 2);
    c.fill();
  }

  /** Bloco de mensagem real de cliente (WhatsApp): superfície elevada com borda, sem balão arredondado de app. */
  mensagem({ x, y, w, rotulo, corpo, size = 76 }) {
    const { linhas } = quebrar(corpo, { font: "semi", size, tracking: -20, w: w - 2 * 56, destaque: K.ambar, cor: K.nevoa });
    const lead = Math.round(size * 1.1);
    const h = 56 + 28 + 44 + (linhas.length - 1) * lead + size * 0.75 + 56;
    this.retanguloArred(x, y, w, h, 14, { fill: K.elevada, stroke: K.linha, lw: 2 });
    this.etiqueta(rotulo, { size: 26, cor: K.nevoaApagada, x: x + 56, y: y + 70 });
    this.texto(corpo, { font: "semi", size, tracking: -20, leading: lead, cor: K.nevoa, x: x + 56, y: y + 70 + 28 + size * 0.85, w: w - 112, nome: "mensagem" });
    return { y1: y + h };
  }

  /** Captura de tela com borda fina e sombra suave. */
  async tela(arquivo, { x, y, w, raio = 12 }) {
    const img = await imagem(arquivo);
    const h = (img.height / img.width) * w;
    const c = this.ctx;
    c.save();
    c.shadowColor = "rgba(27,16,38,.45)";
    c.shadowBlur = 40;
    c.shadowOffsetY = 18;
    this.retanguloArred(x, y, w, h, raio, { fill: "#fff" });
    c.restore();
    c.save();
    c.beginPath();
    c.roundRect(x, y, w, h, raio);
    c.clip();
    c.drawImage(img, x, y, w, h);
    c.restore();
    return { x0: x, x1: x + w, y0: y, y1: y + h };
  }

  jpg(qualidade = 92) {
    return this.canvas.toBuffer("image/jpeg", qualidade);
  }

  salvar() {
    if (!GRAVAR) return this;
    fs.writeFileSync(path.join(OUT, "previews", `${this.nome}.png`), this.canvas.toBuffer("image/png"));
    if (this.W === B.feed.largura) fs.writeFileSync(path.join(OUT, "jpg", `${this.nome}.jpg`), this.jpg());
    for (const a of this.avisos) console.warn(`  ! ${this.nome}: ${a}`);
    return this;
  }
}

const FEED = B.feed;
const M = FEED.margem;
const novo = (nome, fundo) => new Doc(nome, FEED.largura, FEED.altura, fundo, M);

// ── 1 · Capa do carrossel educativo ───────────────────────────────────────────
async function capaCarrossel({ etiqueta = "// guia rápido · 1/4", titulo = "{3} sinais de que o seu site está perdendo cliente." } = {}) {
  const d = novo("capa_carrossel", K.tinta);
  d.campoChaves({ h: 640, alpha: 0.34 });
  d.etiqueta(etiqueta, { cor: K.lilas, x: M, y: M + 30 });
  d.titulo(titulo, { size: 112, cor: K.nevoa, x: M, y: 1020, w: 920, ancora: "baixo" });
  await d.rodape("tinta", "arrasta →", K.nevoaApagada);
  return d.salvar();
}

// ── 2 · Lâmina de conteúdo (uma ideia, um ícone) ──────────────────────────────
async function miolo({ etiqueta = "// sinal 1 · 2/4", icone = "celular", titulo = "Demora para abrir no celular.", apoio = "Se passa de 3 segundos, o cliente fecha e procura o próximo.", rodape = "salva pra conferir depois" } = {}) {
  const d = novo("miolo_carrossel", K.nevoa);
  d.etiqueta(etiqueta, { cor: K.violeta, x: M, y: M + 30 });
  await d.icone("sobre-nevoa", icone, { x: M - 8, y: 250, size: 220 });
  const t = d.titulo(titulo, { size: 104, cor: K.tinta, x: M, y: 700, w: 920 });
  d.apoio(apoio, { cor: K.tintaApagada, x: M, y: t.base + 90, w: 820 });
  await d.rodape("nevoa", rodape, K.tintaApagada);
  return d.salvar();
}

// ── 3 · Última lâmina: ação ───────────────────────────────────────────────────
async function finalCarrossel({ etiqueta = "// 4/4", titulo = "Reconheceu algum?", apoio = "Me chama no WhatsApp e eu te mostro o que arrumar primeiro.", botao = "Me chama no WhatsApp", rodape = "manda pra quem tem site parado" } = {}) {
  const d = novo("final_carrossel", K.violeta);
  d.etiqueta(etiqueta, { cor: K.nevoa, x: M, y: M + 30 });
  await d.icone("sobre-tinta", "mensagem", { x: M - 8, y: 250, size: 220 });
  const t = d.titulo(titulo, { size: 112, cor: K.nevoa, x: M, y: 700, w: 920 });
  const a = d.apoio(apoio, { cor: K.nevoa, x: M, y: t.base + 90, w: 820 });
  d.botao(botao, { x: M, y: a.base + 70 });
  await d.rodape("violeta", rodape, K.nevoa);
  return d.salvar();
}

// ── 4 · Lista "o que você recebe" (um ícone por informação) ───────────────────
async function listaRecebe({ etiqueta = "// o que você recebe · 3/5", titulo = "O que vem no site.", itens = [["janela", "Site rápido, que abre bem no celular"], ["pin", "Aparece no Google da sua cidade"], ["cadeado", "Hospedagem e segurança inclusas"], ["mensagem", "Suporte direto com quem fez"]], rodape = "salva pra comparar orçamento" } = {}) {
  const d = novo("lista_recebe", K.tinta);
  d.etiqueta(etiqueta, { cor: K.lilas, x: M, y: M + 30 });
  d.titulo(titulo, { size: 96, cor: K.nevoa, x: M, y: 290, w: 920 });
  let y = 400;
  for (const [ic, tx] of itens) {
    d.ctx.fillStyle = K.linha;
    d.ctx.fillRect(M, y, FEED.largura - 2 * M, 2);
    await d.icone("sobre-tinta", ic, { x: M, y: y + 34, size: 100 });
    d.texto(tx, { font: "medium", size: 46, leading: 56, cor: K.nevoa, x: M + 150, y: y + 80, w: 770, nome: "item" });
    y += 170;
  }
  await d.rodape("tinta", rodape, K.nevoaApagada);
  return d.salvar();
}

// ── 5 · Número grande com ícone ───────────────────────────────────────────────
async function numero({ etiqueta = "// prazo · exemplo", numero = "15", unidade = "dias", icone = "relogio", titulo = "Do primeiro contato ao site no ar.", apoio = "Prazo para site institucional simples." } = {}) {
  const d = novo("numero", K.nevoa);
  d.etiqueta(etiqueta, { cor: K.violeta, x: M, y: M + 30 });
  await d.icone("sobre-nevoa", icone, { x: M + 560, y: 200, size: 380 });
  d.texto(numero, { font: "semi", size: 440, tracking: -50, cor: K.tinta, x: M, y: 640, nome: "numero" });
  d.texto(unidade, { font: "semi", size: 130, tracking: -30, cor: K.violeta, x: M, y: 790, nome: "unidade" });
  const t = d.titulo(titulo, { size: 76, cor: K.tinta, x: M, y: 930, w: 880 });
  d.apoio(apoio, { cor: K.tintaApagada, x: M, y: t.base + 70, w: 820 });
  await d.rodape("nevoa", "ezf-tech.com", K.tintaApagada);
  return d.salvar();
}

// ── 6 · Pergunta real de cliente ──────────────────────────────────────────────
async function perguntaCliente({ etiqueta = "// pergunta de cliente", pergunta = "Quanto custa um site?", titulo = "A resposta {honesta}, em 4 lâminas →" } = {}) {
  const d = novo("pergunta_cliente", K.tinta);
  d.etiqueta(etiqueta, { cor: K.lilas, x: M, y: M + 30 });
  const m = d.mensagem({ x: M, y: 330, w: 800, rotulo: "cliente · whatsapp", corpo: pergunta });
  d.titulo(titulo, { size: 96, cor: K.nevoa, x: M, y: m.y1 + 150, w: 920 });
  await d.rodape("tinta", "ezf-tech.com", K.nevoaApagada);
  return d.salvar();
}

// ── 7 · Trabalho entregue ─────────────────────────────────────────────────────
async function trabalhoEntregue({ etiqueta = "// projeto · aqua fit club", titulo = "Site da academia do bairro, no ar.", local = "Vila Nhocuné, São Paulo", desktop = "aquafit-desktop.jpg", celular = "aquafit-celular.jpg" } = {}) {
  const d = novo("trabalho_entregue", K.nevoa);
  d.etiqueta(etiqueta, { cor: K.violeta, x: M, y: M + 30 });
  const t = await d.tela(path.join(B.exemplos, desktop), { x: M, y: 190, w: 920 });
  await d.tela(path.join(B.exemplos, celular), { x: M + 920 - 230 + 10, y: t.y1 - 210, w: 230, raio: 22 });
  d.titulo(titulo, { size: 84, cor: K.tinta, x: M, y: t.y1 + 190, w: 650 });
  await d.rodape("nevoa", local, K.tintaApagada);
  return d.salvar();
}

// ── 8 · Antes e depois ────────────────────────────────────────────────────────
async function antesDepois({ etiqueta = "// antes / depois", titulo = "Do WhatsApp perdido ao pedido no sistema.", antes = "Pedido perdido no WhatsApp", depois = "Pedido registrado no sistema" } = {}) {
  const d = novo("antes_depois", K.violeta);
  d.etiqueta(etiqueta, { cor: K.nevoa, x: M, y: M + 30 });
  d.titulo(titulo, { size: 92, cor: K.nevoa, x: M, y: 270, w: 920 });
  d.ctx.globalAlpha = 0.7;
  await d.icone("sobre-tinta", "mensagem", { x: M, y: 640, size: 120 });
  d.texto(antes, { font: "medium", size: 50, cor: K.nevoa, x: M + 160, y: 715, w: 760 });
  d.ctx.globalAlpha = 1;
  // seta âmbar entre os dois estados
  const c = d.ctx;
  c.strokeStyle = K.ambar;
  c.lineWidth = 6;
  c.lineCap = "round";
  c.lineJoin = "round";
  c.beginPath();
  c.moveTo(M + 60, 790);
  c.lineTo(M + 60, 880);
  c.moveTo(M + 38, 858);
  c.lineTo(M + 60, 880);
  c.lineTo(M + 82, 858);
  c.stroke();
  await d.icone("sobre-tinta", "sistema", { x: M, y: 920, size: 120 });
  d.texto(depois, { font: "semi", size: 50, cor: K.nevoa, x: M + 160, y: 995, w: 760 });
  await d.rodape("violeta", null);
  return d.salvar();
}

// ── 9 · Story: pergunta de cliente (1080×1920) ────────────────────────────────
async function storyPergunta({ etiqueta = "// pergunta de cliente", pergunta = "Quanto custa um site?", titulo = "A resposta {honesta} está no feed.", chamada = "novo post" } = {}) {
  const S = B.story;
  const d = new Doc("story_pergunta", S.largura, S.altura, K.tinta, S.margem);
  d.limiteBase = S.altura - S.zonaSegura - 140;
  d.campoChaves({ h: 700, alpha: 0.3 });
  d.etiqueta(etiqueta, { cor: K.lilas, x: S.margem, y: 360 });
  const m = d.mensagem({ x: S.margem, y: 430, w: 820, rotulo: "cliente · whatsapp", corpo: pergunta, size: 84 });
  d.titulo(titulo, { size: 100, cor: K.nevoa, x: S.margem, y: m.y1 + 170, w: 920 });
  d.etiqueta(`${chamada} ↓`, { cor: K.nevoaApagada, x: S.margem, y: S.altura - S.zonaSegura - 80 });
  await d.logo("tinta", { x: S.margem, y: S.altura - S.zonaSegura - 20, largura: 260 });
  return d.salvar();
}

// ── 10 · Carrossel em escopo: o carrossel inteiro é { ... } ───────────────────
const LAMINAS = 5;
const SINAIS_PADRAO = [
  { icone: "celular", titulo: "Demora para abrir no celular.", apoio: "Passou de 3 segundos, o cliente fecha." },
  { icone: "pin", titulo: "Ninguém acha o contato.", apoio: "Telefone e WhatsApp tem que estar na primeira tela." },
  { icone: "lupa", titulo: "Não aparece no Google da cidade.", apoio: "Sem isso, quem procura perto de você acha o concorrente." },
];
/** Devolve { doc, fatias: [Buffer JPG 1080×1350 × 5] }. As lâminas 2 a 4 são os `sinais`. */
async function carrosselEscopo({ capa = "{3} sinais de que o seu site perde cliente.", sinais = SINAIS_PADRAO, final = {} } = {}) {
  const N = LAMINAS;
  const fim = { titulo: "Reconheceu algum?", apoio: "Me chama no WhatsApp e eu te mostro o que arrumar primeiro.", botao: "Me chama no WhatsApp", ...final };
  const W = FEED.largura * N;
  const d = new Doc("carrossel_escopo_5400x1350", W, FEED.altura, K.tinta, M);
  const H = FEED.altura;
  const SW = FEED.largura;
  const grande = 1500;
  const e = grande / 400;
  d.chave({ x: 34 - 6 * e, y: (H - grande) / 2, h: grande, dir: 1, cor: K.violeta, sw: 8 });
  d.chave({ x: W - 34 - 94 * e, y: (H - grande) / 2, h: grande, dir: -1, cor: K.violeta, sw: 8 });
  d.fio({ x0: 340, x1: W - 340, y: 92, cor: K.lilas, no: W - 340 });
  const x0 = 340; // começo do texto na 1ª lâmina (dentro do escopo)
  d.etiqueta(`// guia rápido · 1/${N}`, { cor: K.lilas, x: x0, y: 190 });
  d.titulo(capa, { size: 92, cor: K.nevoa, x: x0, y: 700, w: 660, nome: "capa" });
  d.etiqueta("arrasta →", { cor: K.nevoaApagada, x: x0, y: H - 110 });
  for (const [i, s] of sinais.entries()) {
    const x = SW * (i + 1) + M;
    d.etiqueta(`// sinal ${i + 1} · ${i + 2}/${N}`, { cor: K.lilas, x, y: 190 });
    await d.icone("sobre-tinta", s.icone, { x: x - 8, y: 300, size: 200 });
    const t = d.titulo(s.titulo, { size: 92, cor: K.nevoa, x, y: 640, w: 880, nome: `sinal${i + 1}` });
    d.apoio(s.apoio, { cor: K.nevoaApagada, x, y: t.base + 90, w: 800 });
  }
  const xf = SW * (N - 1) + M;
  d.etiqueta(`// ${N}/${N}`, { cor: K.lilas, x: xf, y: 190 });
  const tf = d.titulo(fim.titulo, { size: 100, cor: K.nevoa, x: xf, y: 640, w: 700 });
  const af = d.apoio(fim.apoio, { cor: K.nevoaApagada, x: xf, y: tf.base + 90, w: 640 });
  d.botao(fim.botao, { x: xf, y: af.base + 70 });
  await d.logo("tinta", { x: xf, y: H - M - 61, largura: 260 });
  d.salvar();
  const fatias = [];
  for (let i = 0; i < N; i++) {
    const c = createCanvas(SW, H);
    c.getContext("2d").drawImage(d.canvas, i * SW, 0, SW, H, 0, 0, SW, H);
    const buf = c.toBuffer("image/jpeg", 92);
    fatias.push(buf);
    if (GRAVAR) fs.writeFileSync(path.join(OUT, "carrossel_escopo", `carrossel_escopo_${String(i + 1).padStart(2, "0")}.jpg`), buf);
  }
  return { doc: d, fatias };
}

module.exports = { Doc, quebrar, fonte, imagem, iconeImg, K, B, FAM, ICONES, capaCarrossel, miolo, finalCarrossel, listaRecebe, numero, perguntaCliente, trabalhoEntregue, antesDepois, storyPergunta, carrosselEscopo };

if (GRAVAR) (async () => {
  await capaCarrossel();
  await miolo();
  await finalCarrossel();
  await listaRecebe();
  await numero();
  await perguntaCliente();
  await trabalhoEntregue();
  await antesDepois();
  await storyPergunta();
  await carrosselEscopo();
  console.log("ok →", path.relative(process.cwd(), OUT) || "output");
})();
