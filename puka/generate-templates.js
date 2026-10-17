// Templates de Instagram da Puka (direção "A Deixa") em .psd com camadas separadas e nomeadas.
//   npm run generate   → output/*.psd + output/previews/*.png + output/carrossel_continuo/*.png
// Cores, fontes e arquivos vêm de brand.config.js. Logo, padrão, ícones e símbolo saem dos arquivos oficiais da marca.
const fs = require("node:fs");
const path = require("node:path");
const { createCanvas, GlobalFonts, Path2D, loadImage } = require("@napi-rs/canvas");
const { initializeCanvas, writePsdBuffer } = require("ag-psd");
const { Resvg } = require("@resvg/resvg-js");
const B = require("./brand.config.js");

initializeCanvas((w, h) => createCanvas(w, h));

const K = B.cores;
const OUT = path.join(__dirname, "output");
const ICONES = ["agenda", "conversa", "deixa", "equipe", "etapas", "historico", "lead", "ponto"];
const GRUPOS = ["Fundo", "Padrao", "Grafismos", "Imagem (substituir)", "Texto", "Logo", "Guias"];
const rgb = (hex) => ({ r: parseInt(hex.slice(1, 3), 16), g: parseInt(hex.slice(3, 5), 16), b: parseInt(hex.slice(5, 7), 16) });
const rel = (f) => path.relative(__dirname, f);

function conferir() {
  const exigidos = [...Object.values(B.fontes).map((f) => f.arquivo), ...Object.values(B.logo), ...Object.values(B.padrao), ...ICONES.map((i) => path.join(B.icones, `${i}.svg`))];
  const faltando = exigidos.filter((f) => !fs.existsSync(f));
  if (faltando.length) {
    console.error(`Faltam arquivos da marca. Nada foi gerado:\n${faltando.map((f) => `  - ${rel(f)}`).join("\n")}`);
    process.exit(1);
  }
}
conferir();

const FAM = {};
for (const [k, f] of Object.entries(B.fontes)) {
  GlobalFonts.registerFromPath(f.arquivo, `Puka_${k}`);
  FAM[k] = `Puka_${k}`;
}
const medidor = createCanvas(10, 10).getContext("2d");
function capRatio(font) {
  medidor.font = `100px ${FAM[font]}`;
  return medidor.measureText("0").actualBoundingBoxAscent / 100;
}

const lerSvg = (f) => fs.readFileSync(f, "utf8");
async function svgParaImagem(svg, largura, salvarComo) {
  const png = new Resvg(svg, { fitTo: { mode: "width", value: Math.round(largura * 2) } }).render().asPng();
  if (salvarComo) fs.writeFileSync(path.join(OUT, "assets", salvarComo), png);
  return loadImage(png);
}
const HASTE_P = new Path2D(B.simbolo.hasteD);
const DEIXA_P = new Path2D(B.simbolo.deixaD);

// ── Documento com grupos e camadas ────────────────────────────────────────────
class Doc {
  constructor(nome, formato, fundo) {
    this.nome = nome;
    this.W = formato.largura;
    this.H = formato.altura;
    this.M = formato.margem;
    this.fundo = fundo;
    this.raiz = GRUPOS.map((name) => ({ name, opened: true, children: [] }));
    this.guias = [];
    this.avisos = [];
    this.pixel("Fundo", fundo === K.roteiro ? "Fundo_roteiro" : "Fundo_coxia", (ctx) => {
      ctx.fillStyle = fundo;
      ctx.fillRect(0, 0, this.W, this.H);
    });
  }

  grupo(nome, sub) {
    const g = this.raiz.find((x) => x.name === nome);
    if (!sub) return g;
    let s = g.children.find((c) => c.name === sub && c.children);
    if (!s) g.children.push((s = { name: sub, opened: true, children: [] }));
    return s;
  }

  /** Camada de pixel do tamanho do documento (o ag-psd corta a transparência ao salvar). */
  pixel(grupo, name, desenhar, { hidden = false, sub } = {}) {
    const canvas = createCanvas(this.W, this.H);
    desenhar(canvas.getContext("2d"));
    this.grupo(grupo, sub).children.push({ name, canvas, hidden });
  }

  forma(grupo, name, path2d, cor, opts) {
    this.pixel(grupo, name, (ctx) => ((ctx.fillStyle = cor), ctx.fill(path2d)), opts);
  }

  /**
   * Camada de texto EDITÁVEL (fonte, corpo, cor, tracking, entrelinha, alinhamento) + bitmap de prévia.
   * (x, y) = ponto de ancoragem da primeira linha, na linha de base (esquerda, centro ou direita conforme `align`).
   */
  texto(grupo, name, str, o) {
    const { font = "corpo", size, cor, x, y, align = "left", tracking = 0, underline = false, respiro = null, sub, rot = 0 } = o;
    const linhas = str.split("\n");
    const leading = o.leading ?? Math.round(size * (font.startsWith("corpo") ? 1.55 : 1.0));
    const canvas = createCanvas(this.W, this.H);
    const ctx = canvas.getContext("2d");
    ctx.font = `${size}px ${FAM[font]}`;
    const extra = (tracking / 1000) * size;
    const largura = (l) => (extra ? [...l].reduce((s, ch) => s + ctx.measureText(ch).width, 0) + extra * ([...l].length - 1) : ctx.measureText(l).width);
    const desenhar = (l, lx, ly, modo) => {
      if (!extra) return modo === "fill" ? ctx.fillText(l, lx, ly) : ctx.strokeText(l, lx, ly);
      let cx = lx;
      for (const ch of l) {
        modo === "fill" ? ctx.fillText(ch, cx, ly) : ctx.strokeText(ch, cx, ly);
        cx += ctx.measureText(ch).width + extra;
      }
    };
    const larguras = linhas.map(largura);
    let x0 = Infinity;
    let x1 = -Infinity;
    ctx.save();
    if (rot) {
      ctx.translate(x, y);
      ctx.rotate((rot * Math.PI) / 180);
    }
    const ax = rot ? 0 : x;
    const ay = rot ? 0 : y;
    linhas.forEach((l, i) => {
      const w = larguras[i];
      const lx = align === "center" ? ax - w / 2 : align === "right" ? ax - w : ax;
      const ly = ay + i * leading;
      if (respiro) {
        // o respiro da sombra solta: contorno na cor do fundo (no .psd é o efeito Traçado da camada)
        ctx.strokeStyle = respiro.cor;
        ctx.lineWidth = respiro.largura * 2;
        ctx.lineJoin = "round";
        desenhar(l, lx, ly, "stroke");
      }
      ctx.fillStyle = cor;
      desenhar(l, lx, ly, "fill");
      if (underline) ctx.fillRect(lx, ly + size * 0.1, w, Math.max(2, size * 0.07));
      x0 = Math.min(x0, lx + (rot ? x : 0));
      x1 = Math.max(x1, lx + w + (rot ? x : 0));
    });
    ctx.restore();
    if (!rot && (x0 < this.M - 1 || x1 > this.W - this.M + 1)) this.avisos.push(`${name}: "${str.replace(/\n/g, " / ")}" sai da margem (${Math.round(x0)}–${Math.round(x1)})`);

    const r = (rot * Math.PI) / 180;
    const camada = {
      name,
      canvas,
      text: {
        text: linhas.join("\r"),
        transform: [Math.cos(r), Math.sin(r), -Math.sin(r), Math.cos(r), x, y],
        antiAlias: "smooth",
        style: { font: { name: B.fontes[font].ps }, fontSize: size, fillColor: rgb(cor), tracking, autoLeading: false, leading, underline },
        paragraphStyle: { justification: align },
      },
    };
    if (respiro) {
      camada.effects = {
        stroke: [{ present: true, showInDialog: true, enabled: true, position: "outside", fillType: "color", blendMode: "normal", opacity: 1, size: { units: "Pixels", value: respiro.largura }, color: rgb(respiro.cor) }],
      };
    }
    this.grupo(grupo, sub).children.push(camada);
    return { x0, x1, topo: y - capRatio(font) * size, base: y + (linhas.length - 1) * leading, leading };
  }

  /** O título da marca: Bricolage ExtraBold, apertado. */
  titulo(str, o) {
    return this.texto("Texto", o.nome ?? "Titulo", str, { tracking: -12, leading: Math.round(o.size * 1.02), ...o, font: "display" });
  }

  /** Etiqueta em mono, caixa alta (horário, rótulo, origem). */
  etiqueta(str, o) {
    return this.texto("Texto", o.nome ?? "Etiqueta", str.toUpperCase(), { font: o.medium ? "monoMedium" : "mono", size: o.size ?? 26, tracking: 40, ...o });
  }

  /** Haste: barra reta de corte seco (divisor, marcador de lista, barra de título). */
  haste({ x, y, w = 14, h, cor, nome = "Haste", sub }) {
    this.pixel("Grafismos", nome, (ctx) => ((ctx.fillStyle = cor), ctx.fillRect(x, y, w, h)), { sub });
  }

  /** Retângulo de corte seco (superfície). */
  bloco({ x, y, w, h, cor, nome = "Bloco", grupo = "Grafismos", sub }) {
    this.pixel(grupo, nome, (ctx) => ((ctx.fillStyle = cor), ctx.fillRect(x, y, w, h)), { sub });
  }

  /** A deixa: a curva do braço do k. (x, y) = canto superior esquerdo da caixa dela. Uma por peça. */
  deixa({ x, y, altura, cor, rot = 0, nome = "Deixa" }) {
    const s = altura / B.simbolo.deixaBox.h;
    this.pixel("Grafismos", nome, (ctx) => {
      const w = B.simbolo.deixaBox.w * s;
      ctx.translate(x + w / 2, y + altura / 2);
      ctx.rotate((rot * Math.PI) / 180);
      ctx.translate(-w / 2 - B.simbolo.deixaBox.x * s, altura / 2);
      ctx.scale(s, -s);
      ctx.fillStyle = cor;
      ctx.fill(DEIXA_P);
    });
  }

  /** O símbolo inteiro (haste + deixa), para quando ele é o protagonista (pode sangrar da peça). (x, y) = canto da caixa. */
  simbolo({ x, y, altura, corHaste, corDeixa, nome = "Simbolo" }) {
    const s = altura / B.simbolo.box.h;
    const desenhar = (ctx, path, cor) => {
      ctx.translate(x - B.simbolo.box.x * s, y + altura);
      ctx.scale(s, -s);
      ctx.fillStyle = cor;
      ctx.fill(path);
    };
    this.pixel("Grafismos", `${nome}_haste`, (ctx) => desenhar(ctx, HASTE_P, corHaste));
    this.pixel("Grafismos", `${nome}_deixa`, (ctx) => desenhar(ctx, DEIXA_P, corDeixa));
    return { x0: x, x1: x + B.simbolo.box.w * s, hasteLargura: 150 * s };
  }

  /** Linha de passagem: reta em Ponto (a IA), lacuna, e a curva à mão em Ribalta (a pessoa). */
  linhaPassagem({ x, y, largura, escuro = false, retoFrac = 0.4, nome = "Linha_de_passagem" }) {
    const retoW = largura * retoFrac;
    const ini = x + retoW + B.lacuna;
    const cw = largura - retoW - B.lacuna;
    this.pixel("Grafismos", nome, (ctx) => {
      ctx.strokeStyle = escuro ? K.pontoClaro : K.ponto;
      ctx.lineWidth = 7;
      ctx.lineCap = "butt";
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + retoW, y);
      ctx.stroke();
      ctx.strokeStyle = escuro ? K.ribaltaAcesa : K.ribalta;
      ctx.lineWidth = 9;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.beginPath();
      ctx.moveTo(ini, y);
      ctx.bezierCurveTo(ini + cw * 0.2, y - 12, ini + cw * 0.4, y + 11, ini + cw * 0.6, y - 5);
      ctx.bezierCurveTo(ini + cw * 0.75, y - 14, ini + cw * 0.9, y + 3, ini + cw, y);
      ctx.stroke();
    });
    return { retoFim: x + retoW, curvaIni: ini };
  }

  /** Bloco de mensagem. cliente = Papel com borda; ia = barra Ponto; pessoa = barra Ribalta. Nunca balão arredondado. */
  mensagem({ tipo, x, y, w, h, rotulo, corpo, escuro = false, nome }) {
    const n = nome ?? `Msg_${tipo}`;
    const fundo = tipo === "cliente" ? (escuro ? "#2a2632" : K.papel) : escuro ? "#2a2632" : K.rotunda;
    const barra = tipo === "ia" ? (escuro ? K.pontoClaro : K.ponto) : tipo === "pessoa" ? (escuro ? K.ribaltaAcesa : K.ribalta) : null;
    this.pixel("Grafismos", `${n}_fundo`, (ctx) => {
      ctx.fillStyle = fundo;
      ctx.fillRect(x, y, w, h);
      if (tipo === "cliente") {
        ctx.strokeStyle = escuro ? "#3a3444" : K.linha;
        ctx.lineWidth = 2;
        ctx.strokeRect(x + 1, y + 1, w - 2, h - 2);
      } else {
        ctx.fillStyle = barra;
        ctx.fillRect(x, y, 10, h);
      }
    });
    const corRot = tipo === "ia" ? (escuro ? K.pontoClaro : K.ponto) : tipo === "pessoa" ? (escuro ? K.ribaltaAcesa : K.ribaltaFunda) : escuro ? K.roteiro : K.bastidor;
    this.texto("Texto", `${n}_rotulo`, rotulo, { font: "mono", size: 24, cor: corRot, x: x + 36, y: y + 50, tracking: 20 });
    this.texto("Texto", `${n}_texto`, corpo, { size: 34, leading: 46, cor: escuro ? K.roteiro : K.coxia, x: x + 36, y: y + 104 });
  }

  /** Botão principal: Ribalta Funda com texto Roteiro, corte seco. */
  botao(str, { x, y, altura = 96 }) {
    const size = 36;
    medidor.font = `${size}px ${FAM.corpoBold}`;
    const w = medidor.measureText(str).width + 2 * 52;
    this.bloco({ x, y, w, h: altura, cor: K.ribaltaFunda, nome: "Botao_fundo" });
    this.texto("Texto", "Botao", str, { font: "corpoBold", size, cor: K.roteiro, x: x + w / 2, y: y + altura / 2 + size * 0.36, align: "center" });
    return { x0: x, x1: x + w, y0: y, y1: y + altura };
  }

  async logo(arquivo, { x, y, largura, align = "left", nome = "Logo" }) {
    if (largura < B.logoMinimo) this.avisos.push(`Logo com ${largura}px (mínimo da principal: ${B.logoMinimo}px)`);
    const img = await svgParaImagem(lerSvg(arquivo), largura, `${path.basename(arquivo, ".svg")}@2x.png`);
    const h = (img.height / img.width) * largura;
    const x0 = align === "center" ? x - largura / 2 : align === "right" ? x - largura : x;
    this.pixel("Logo", nome, (ctx) => ctx.drawImage(img, x0, y, largura, h));
    return { x0, x1: x0 + largura, y0: y, y1: y + h };
  }

  /** Ícone da marca (grade 24, traço 2), recolorido numa cor só. */
  async icone(nomeIcone, { x, y, size, cor, nome }) {
    const svg = lerSvg(path.join(B.icones, `${nomeIcone}.svg`)).replace(/#1E1B24/gi, cor).replace(/currentColor/g, cor);
    const img = await svgParaImagem(svg, size);
    this.pixel("Grafismos", nome ?? `Icone_${nomeIcone}`, (ctx) => ctx.drawImage(img, x, y, size, size));
  }

  /** Faixa de padrão onde TODA haste é um k completo (haste em Rotunda + deixa em Ribalta). Fileiras inteiras, sem corte vertical.
   *  As deixas giram de −4° a +5° e a linha de base oscila alguns pontos, numa sequência fixa (imperfeição controlada). */
  padraoK({ x, y, w, linhas = 2, altura = 80, passoX = 76, passoY = 100, nome = "Padrao_k" }) {
    const s = altura / B.simbolo.box.h;
    this.pixel("Padrao", nome, (ctx) => {
      for (let r = 0; r < linhas; r++) {
        const base = y + r * passoY + (passoY - altura) / 2;
        for (let c = -1; c * passoX < w + passoX; c++) {
          const cx = x + c * passoX + (r % 2 ? passoX / 2 : 0);
          if (cx + passoX < x || cx > x + w) continue;
          const rot = (((c + 40) * 7 + r * 3) % 10 - 4) * (Math.PI / 180);
          const dy = ((c + 40) * 5 + r * 11) % 7 - 3;
          ctx.save();
          ctx.translate(cx - B.simbolo.box.x * s, base + dy + altura);
          ctx.scale(s, -s);
          ctx.fillStyle = "#E2D6C3"; // haste em Rotunda, um tom abaixo da superfície
          ctx.fill(HASTE_P);
          ctx.translate(330, 260);
          ctx.rotate(rot);
          ctx.scale(0.94, 0.94);
          ctx.translate(-330, -260);
          ctx.fillStyle = K.ribalta;
          ctx.fill(DEIXA_P);
          ctx.restore();
        }
      }
    });
  }

  /** Padrão oficial (campo de hastes com algumas deixas), numa região. tom: "claro" | "escuro". */
  async padrao(tom, { x = 0, y = 0, w = this.W, h = this.H, largura = 1024, opacidade = 1 }) {
    const img = await svgParaImagem(lerSvg(B.padrao[tom]), largura);
    const altura = (img.height / img.width) * largura;
    this.pixel("Padrao", `Padrao_${tom}`, (ctx) => {
      ctx.beginPath();
      ctx.rect(x, y, w, h);
      ctx.clip();
      ctx.globalAlpha = opacidade;
      for (let ty = y; ty < y + h; ty += altura) for (let tx = x; tx < x + w; tx += largura) ctx.drawImage(img, tx, ty, largura, altura);
    });
  }

  /** Espaço da foto (máscara de corte seco). Troque pela foto real na camada FOTO_AQUI (Ctrl+Alt+G). */
  foto({ x, y, w, h, legenda = "FOTO AQUI", cor = K.rotunda }) {
    this.bloco({ x, y, w, h, cor, nome: "FOTO_AQUI", grupo: "Imagem (substituir)", sub: "Foto" });
    this.texto("Imagem (substituir)", "FOTO_AQUI_rotulo (apague)", legenda, { font: "monoMedium", size: 26, tracking: 40, cor: K.coxia, x: x + w / 2, y: y + h / 2, align: "center", leading: 40, sub: "Foto" });
    return { x0: x, x1: x + w, y0: y, y1: y + h };
  }

  /** Máscara "corte da deixa": a foto termina na curva do k, a lacuna separa um bloco de Ribalta do outro lado. */
  fotoCorteDeixa({ x, y, w, h, legenda = "FOTO AQUI", bloco = 90 }) {
    const k = h / B.simbolo.deixaBox.h;
    const px = (cx, d = 0) => x + w - (364 - cx) * k + d; // x da curva do k, escalado
    const py = (cy) => y + h - cy * k;
    const curva = (ctx, d) => {
      ctx.bezierCurveTo(px(318, d), py(450), px(221.02, d), py(344), px(221.02, d), py(270));
      ctx.bezierCurveTo(px(221.02, d), py(192), px(280, d), py(86), px(312, d), py(0));
    };
    this.pixel("Imagem (substituir)", "FOTO_AQUI", (ctx) => {
      ctx.fillStyle = K.rotunda;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(px(364), py(527));
      curva(ctx, 0);
      ctx.lineTo(x, y + h);
      ctx.closePath();
      ctx.fill();
    }, { sub: "Foto" });
    this.pixel("Grafismos", "Bloco_ribalta", (ctx) => {
      ctx.fillStyle = K.ribalta;
      ctx.beginPath();
      ctx.moveTo(px(364, B.lacuna), py(527));
      curva(ctx, B.lacuna);
      ctx.lineTo(px(312, B.lacuna) + bloco, py(0));
      ctx.lineTo(px(364, B.lacuna) + bloco, py(527));
      ctx.closePath();
      ctx.fill();
    });
    this.texto("Imagem (substituir)", "FOTO_AQUI_rotulo (apague)", legenda, { font: "monoMedium", size: 24, tracking: 30, cor: K.coxia, x: x + 300, y: y + h / 2, align: "center", leading: 38, sub: "Foto" });
    return { x0: x, x1: px(312, B.lacuna) + bloco, y0: y, y1: y + h };
  }

  /** Captura de tela real do produto (recorte), com borda seca. */
  async tela(arquivo, { x, y, w, recorte }) {
    const img = await loadImage(arquivo);
    const r = recorte ?? { x: 0, y: 0, w: img.width, h: img.height };
    const h = (r.h / r.w) * w;
    this.pixel("Imagem (substituir)", "Tela_produto", (ctx) => ctx.drawImage(img, r.x, r.y, r.w, r.h, x, y, w, h), { sub: "Tela" });
    this.pixel("Grafismos", "Tela_borda", (ctx) => {
      ctx.strokeStyle = K.coxia;
      ctx.lineWidth = 3;
      ctx.strokeRect(x, y, w, h);
    });
    return { x0: x, x1: x + w, y0: y, y1: y + h };
  }

  /** Grade de 12 colunas (camada oculta) + guias do Photoshop nas margens (e nas zonas seguras do story). */
  grade(zonaSegura = 0) {
    const { colunas, calha } = B.grade;
    const col = (this.W - 2 * this.M - (colunas - 1) * calha) / colunas;
    this.pixel(
      "Guias",
      "Grade_12_colunas",
      (ctx) => {
        ctx.fillStyle = `${K.ribalta}26`;
        for (let i = 0; i < colunas; i++) ctx.fillRect(this.M + i * (col + calha), 0, col, this.H);
        if (zonaSegura) {
          ctx.fillStyle = `${K.coxia}33`;
          ctx.fillRect(0, 0, this.W, zonaSegura);
          ctx.fillRect(0, this.H - zonaSegura, this.W, zonaSegura);
        }
      },
      { hidden: true },
    );
    for (const v of [this.M, this.W - this.M]) this.guias.push({ location: v, direction: "vertical" });
    for (const h of [this.M, this.H - this.M]) this.guias.push({ location: h, direction: "horizontal" });
    if (zonaSegura) for (const h of [zonaSegura, this.H - zonaSegura]) this.guias.push({ location: h, direction: "horizontal" });
  }

  compor(camadas, ctx) {
    for (const c of camadas) {
      if (c.hidden) continue;
      if (c.children) this.compor(c.children, ctx);
      else ctx.drawImage(c.canvas, 0, 0);
    }
  }

  salvar() {
    const composta = createCanvas(this.W, this.H);
    this.compor(this.raiz, composta.getContext("2d"));
    const psd = {
      width: this.W,
      height: this.H,
      canvas: composta,
      children: this.raiz,
      imageResources: { gridAndGuidesInformation: { guides: this.guias }, resolutionInfo: resolucao72 },
    };
    fs.writeFileSync(path.join(OUT, `${this.nome}.psd`), writePsdBuffer(psd, { generateThumbnail: true, trimImageData: true }));
    fs.writeFileSync(path.join(OUT, "previews", `${this.nome}.png`), composta.toBuffer("image/png"));
    for (const a of this.avisos) console.warn(`  aviso ${this.nome}: ${a}`);
    console.log(`ok  ${this.nome}.psd`);
    return composta;
  }
}


const resolucao72 = { horizontalResolution: 72, horizontalResolutionUnit: "PPI", widthUnit: "Inches", verticalResolution: 72, verticalResolutionUnit: "PPI", heightUnit: "Inches" };

// ── Os templates ──────────────────────────────────────────────────────────────
const FEED = B.feed;
const STORY = B.story;
const exemplo = (d, x, y, cor) => d.etiqueta("simulação · exemplo", { nome: "Aviso_exemplo", x, y, size: 22, cor });

/** 1. Story: a conversa com a linha de passagem. Fundo Coxia. Zonas seguras de 250 px. */
async function storyConversa() {
  const d = new Doc("story_conversa_1080x1920", STORY, K.coxia);
  const M = d.M;
  d.etiqueta("Simulação de atendimento · academia", { x: M, y: 300, cor: K.roteiro });
  d.titulo("A IA atende\nprimeiro. Seu time\nentra na deixa.", { x: M, y: 430, size: 88, cor: K.roteiro });
  d.mensagem({ tipo: "cliente", x: M, y: 740, w: 760, h: 170, rotulo: "cliente · 23:47", corpo: "Oi, ainda dá pra matricular hoje?", escuro: true });
  d.mensagem({ tipo: "ia", x: M + 160, y: 940, w: 760, h: 200, rotulo: "IA · 23:47", corpo: "Dá sim! Quer que eu reserve uma\naula grátis pra amanhã de manhã?", escuro: true });
  d.linhaPassagem({ x: M, y: 1230, largura: 920, escuro: true });
  d.etiqueta("passou para a equipe", { x: M, y: 1290, cor: K.ribaltaAcesa, size: 24 });
  d.mensagem({ tipo: "pessoa", x: M + 160, y: 1330, w: 760, h: 200, rotulo: "Marina · 08:02", corpo: "Bom dia! Reservei sua aula pra\nhoje às 9h. Te espero.", escuro: true });
  d.botao("Teste grátis no link da bio", { x: M, y: 1560 });
  d.grade(STORY.zonaSegura);
  d.salvar();
}

/** 2. Frase de cliente: a pergunta, a resposta com horário e o símbolo gigante sangrando. Fundo Roteiro. */
async function frase() {
  const d = new Doc("feed_frase_1080x1350", FEED, K.roteiro);
  const M = d.M;
  d.etiqueta("23:47 · academia · WhatsApp", { x: M, y: 130, cor: K.bastidor });
  const t = d.titulo("“Oi, ainda dá\npra matricular\nhoje?”", { x: M, y: 310, size: 104, cor: K.coxia });
  d.texto("Texto", "Resposta", "Às 23h47 a IA respondeu.\nÀs 8h02 a Marina fechou.", { size: 42, leading: 58, cor: K.coxia, x: M, y: t.base + 110 });
  d.etiqueta("exemplo, não é cliente real", { nome: "Aviso_exemplo", x: M, y: t.base + 215, size: 20, cor: K.bastidor });
  d.simbolo({ x: 400, y: 790, altura: 900, corHaste: K.coxia, corDeixa: K.ribalta });
  await d.logo(B.logo.principalCor, { x: M, y: 1190, largura: 190 });
  d.grade();
  d.salvar();
}

/** 3. Antes / depois: o horário da resposta. A linha de passagem divide as duas metades. */
async function antesDepois() {
  const d = new Doc("feed_antes_depois_1080x1350", FEED, K.roteiro);
  const M = d.M;
  d.bloco({ x: 0, y: 0, w: FEED.largura, h: 675, cor: K.rotunda, nome: "Metade_sem" });
  d.etiqueta("Sem Puka", { x: M, y: 140, medium: true, size: 30, cor: K.bastidor });
  d.titulo("08:02", { x: M, y: 450, size: 300, cor: K.coxia, nome: "Horario_sem" });
  d.texto("Texto", "Sem_texto", "O cliente escreveu às 23:47.\nA resposta veio no dia seguinte.", { size: 36, leading: 50, cor: K.coxia, x: M, y: 540 });
  d.linhaPassagem({ x: M, y: 675, largura: 920 });
  d.etiqueta("Com Puka", { x: M, y: 800, medium: true, size: 30, cor: K.ribaltaFunda });
  d.titulo("23:47", { x: M, y: 1080, size: 300, cor: K.ponto, nome: "Horario_com" });
  d.texto("Texto", "Com_texto", "O cliente escreveu às 23:47.\nA IA respondeu às 23:47.", { size: 36, leading: 50, cor: K.coxia, x: M, y: 1170 });
  await d.logo(B.logo.principalCor, { x: FEED.largura - M, y: 1236, largura: 170, align: "right" });
  d.etiqueta("exemplo", { nome: "Aviso_exemplo", x: M, y: 1290, size: 20, cor: K.bastidor });
  d.grade();
  d.salvar();
}

/** 4. Número grande: a haste sangra de ponta a ponta e uma deixa pequena entra pela direita. */
async function numero() {
  const d = new Doc("feed_numero_1080x1350", FEED, K.roteiro);
  const M = d.M;
  d.haste({ x: M, y: 0, w: 28, h: FEED.altura, cor: K.coxia });
  d.titulo("14", { x: M + 90, y: 700, size: 600, cor: K.coxia, nome: "Numero" });
  d.deixa({ x: 880, y: 300, altura: 150, cor: K.ribalta });
  d.titulo("dias pra testar.", { x: M + 90, y: 860, size: 96, cor: K.coxia, nome: "Unidade" });
  d.texto("Texto", "Apoio", "Sem cartão de crédito.\nO teste começa pelo link da bio.", { size: 38, leading: 54, cor: K.bastidor, x: M + 90, y: 960 });
  await d.logo(B.logo.principalCor, { x: M + 90, y: 1190, largura: 190 });
  d.grade();
  d.salvar();
}

/** 5. Lista: cada item tem uma haste como marcador; uma deixa pequena fecha a peça. */
async function lista() {
  const d = new Doc("feed_lista_1080x1350", FEED, K.roteiro);
  const M = d.M;
  d.etiqueta("3 sinais", { x: M, y: 140, medium: true, size: 30, cor: K.ribaltaFunda });
  const t = d.titulo("Você está perdendo\nlead no WhatsApp?", { x: M, y: 290, size: 92, cor: K.coxia });
  const itens = [
    ["Mensagem às 23h", "A resposta só chega de manhã."],
    ["Ninguém sabe quem responde", "A conversa fica com quem viu primeiro, ou com ninguém."],
    ["O cliente repete a pergunta", "Cada pessoa que assume começa do zero."],
  ];
  let y = t.base + 130;
  for (const [i, [nome, texto]] of itens.entries()) {
    d.haste({ x: M, y: y - 52, w: 14, h: 130, cor: K.coxia, nome: `Item${i + 1}_haste` });
    d.texto("Texto", `Item${i + 1}_titulo`, nome, { font: "subtitulo", size: 46, cor: K.coxia, x: M + 44, y });
    d.texto("Texto", `Item${i + 1}_texto`, texto, { size: 32, cor: K.bastidor, x: M + 44, y: y + 56 });
    y += 220;
  }
  d.deixa({ x: 900, y: y - 60, altura: 140, cor: K.ribalta });
  await d.logo(B.logo.principalCor, { x: M, y: 1190, largura: 190 });
  d.grade();
  d.salvar();
}

/** 6. Tela do produto: captura real da conversa, com a haste ao lado. */
async function tela() {
  const d = new Doc("feed_tela_1080x1350", FEED, K.roteiro);
  const M = d.M;
  d.etiqueta("Dentro do Puka", { x: M, y: 140, medium: true, size: 30, cor: K.ribaltaFunda });
  const t = d.titulo("A conversa passa\ncom o histórico.", { x: M, y: 290, size: 96, cor: K.coxia });
  d.haste({ x: M - 24, y: t.base + 120, w: 12, h: 540, cor: K.ponto, nome: "Haste_tela" });
  const img = await d.tela(path.join(B.icones, "../telas/conversa.png"), { x: M, y: t.base + 120, w: 920, recorte: { x: 0, y: 90, w: 1051, h: 616 } });
  d.etiqueta("tela do Puka · conversa de teste", { nome: "Legenda_tela", x: M, y: img.y1 + 56, size: 22, cor: K.bastidor });
  await d.logo(B.logo.principalCor, { x: FEED.largura - M, y: 1236, largura: 170, align: "right" });
  d.grade();
  d.salvar();
}

/** 7. Enquete: pergunta e três respostas em blocos com haste. */
async function enquete() {
  const d = new Doc("feed_enquete_1080x1350", FEED, K.roteiro);
  const M = d.M;
  d.etiqueta("Pergunta rápida", { x: M, y: 140, medium: true, size: 30, cor: K.ribaltaFunda });
  const t = d.titulo("Quanto tempo seu\ncliente espera uma\nresposta no WhatsApp?", { x: M, y: 290, size: 80, cor: K.coxia });
  const opcoes = [["A", "Menos de 5 minutos"], ["B", "Até 1 hora"], ["C", "Só no dia seguinte"]];
  let y = t.base + 90;
  for (const [l, texto] of opcoes) {
    d.bloco({ x: M, y, w: 920, h: 150, cor: K.rotunda, nome: `Opcao_${l}_fundo` });
    d.haste({ x: M, y, w: 14, h: 150, cor: K.coxia, nome: `Opcao_${l}_haste` });
    d.titulo(l, { nome: `Opcao_${l}_letra`, x: M + 52, y: y + 112, size: 110, cor: K.coxia });
    d.texto("Texto", `Opcao_${l}_texto`, texto, { font: "subtitulo", size: 46, cor: K.coxia, x: M + 190, y: y + 92 });
    y += 180;
  }
  d.texto("Texto", "Chamada", "Responde A, B ou C nos comentários.", { font: "corpoBold", size: 34, cor: K.coxia, x: M, y: y + 50 });
  await d.logo(B.logo.principalCor, { x: FEED.largura - M, y: 1236, largura: 170, align: "right" });
  d.grade();
  d.salvar();
}

/** 8. Foto com corte da deixa: a foto termina na curva, a lacuna separa o bloco de Ribalta. */
async function foto() {
  const d = new Doc("feed_foto_1080x1350", FEED, K.roteiro);
  const M = d.M;
  d.fotoCorteDeixa({ x: 0, y: 0, w: 860, h: 880, legenda: "FOTO REAL\nrecepção 7h40\nluz de janela" });
  d.titulo("Bom dia.\nA conversa já começou.", { x: M, y: 1040, size: 80, cor: K.coxia });
  d.etiqueta("foto real de cliente, com autorização", { nome: "Legenda_foto", x: M, y: 1230, size: 20, cor: K.bastidor });
  await d.logo(B.logo.principalCor, { x: FEED.largura - M, y: 1236, largura: 170, align: "right" });
  d.grade();
  d.salvar();
}

/** 9. Novidade / Em breve: etiqueta, título e três itens com ícone. Fundo Coxia. */
async function novidade(slug, { tag, titulo, itens }) {
  const d = new Doc(`feed_novidade_${slug}_1080x1350`, FEED, K.coxia);
  const M = d.M;
  d.bloco({ x: M, y: 100, w: 260, h: 60, cor: K.roteiro, nome: "Etiqueta_fundo" });
  d.etiqueta(tag, { nome: "Etiqueta_texto", x: M + 130, y: 140, medium: true, size: 28, cor: K.coxia, align: "center" });
  const t = d.titulo(titulo, { x: M, y: 330, size: 104, cor: K.roteiro });
  let y = t.base + 130;
  for (const [i, [icone, nome, texto]] of itens.entries()) {
    d.haste({ x: M, y: y - 50, w: 12, h: 150, cor: K.pontoClaro, nome: `Item${i + 1}_haste` });
    await d.icone(icone, { x: M + 44, y: y - 40, size: 64, cor: K.roteiro, nome: `Item${i + 1}_icone` });
    d.texto("Texto", `Item${i + 1}_titulo`, nome, { font: "subtitulo", size: 42, cor: K.roteiro, x: M + 140, y });
    d.texto("Texto", `Item${i + 1}_texto`, texto, { size: 30, cor: K.roteiro, x: M + 140, y: y + 52 });
    y += 190;
  }
  d.deixa({ x: 930, y: 100, altura: 110, cor: K.ribaltaAcesa });
  await d.logo(B.logo.principalNegativo, { x: M, y: 1190, largura: 190 });
  d.grade();
  d.salvar();
}
const NOVIDADES = [
  { slug: "agenda", tag: "NOVIDADE", titulo: "A agenda mora\nno CRM.", itens: [["agenda", "Conversa e agenda juntas", "Os horários ficam no mesmo lugar das conversas."], ["conversa", "Marcou, ficou registrado", "O time vê o histórico antes de confirmar."], ["equipe", "Cada um na sua agenda", "Quem atende vê o que é dele."]] },
  { slug: "copilot_em_breve", tag: "EM BREVE", titulo: "Conversa parada?\nO time sabe.", itens: [["historico", "Aviso na hora certa", "3 conversas esperando alguém há mais de 10 min."], ["lead", "Sem notificação à toa", "Só fala quando tem algo útil."], ["deixa", "Passa a vez", "Quem precisa entrar vê o contexto todo."]] },
];

/** 10. Carrossel contínuo: a linha de passagem atravessa 6 lâminas. Reta em Ponto, a lacuna, e a curva à mão em Ribalta. */
async function carrosselContinuo() {
  const N = 6;
  const SW = FEED.largura;
  const d = new Doc("carrossel_continuo_6480x1350", { largura: SW * N, altura: FEED.altura, margem: FEED.margem }, K.roteiro);
  const M = d.M;
  const yLinha = 1010;
  d.padraoK({ x: 0, y: 1150, w: SW * N, linhas: 2 });
  const xLacuna = SW * 3 + 380; // a passagem acontece dentro da lâmina 4, sempre à vista
  const lp = d.linhaPassagem({ x: M, y: yLinha, largura: SW * N - 2 * M, retoFrac: (xLacuna - M) / (SW * N - 2 * M) });

  // lâmina 1: capa
  await d.logo(B.logo.principalCor, { x: M, y: 96, largura: 190 });
  d.titulo("A conversa\npassa de mão.", { x: M, y: 420, size: 128, cor: K.coxia });
  d.texto("Texto", "Capa_apoio", "Do primeiro oi\naté o fechamento.", { size: 36, leading: 50, cor: K.bastidor, x: M, y: 800 });
  d.etiqueta("Arrasta pro lado", { x: M, y: 960, medium: true, size: 26, cor: K.coxia });

  const passos = [
    { hora: "23:47", cor: K.ponto, titulo: "O cliente\nchama.", apoio: "Fora do horário, no fim de semana,\nno meio do almoço." },
    { hora: "23:47", cor: K.ponto, titulo: "A IA\nresponde.", apoio: "Horário, preço e plano,\nna hora." },
    { hora: "08:02", cor: K.ribalta, titulo: "Passa para\no time.", apoio: "Quando vira negociação, a conversa\nvai com o histórico junto." },
    { hora: "08:02", cor: K.ribalta, titulo: "O time\nfecha.", apoio: "Sem perguntar tudo\nde novo." },
  ];
  for (const [i, p] of passos.entries()) {
    const x = SW * (i + 1) + M;
    d.haste({ x, y: yLinha - 40, w: 10, h: 80, cor: K.coxia, nome: `Parada${i + 1}_haste` });
    d.titulo(p.hora, { nome: `Parada${i + 1}_hora`, x, y: 400, size: 190, cor: p.cor });
    d.titulo(p.titulo, { nome: `Parada${i + 1}_titulo`, x, y: 620, size: 92, cor: K.coxia });
    d.texto("Texto", `Parada${i + 1}_apoio`, p.apoio, { size: 32, leading: 46, cor: K.bastidor, x, y: 830 });
  }
  d.etiqueta("passou para a equipe", { nome: "Rotulo_passagem", x: xLacuna - 160, y: yLinha + 70, size: 22, cor: K.ribaltaFunda });

  // lâmina 6: fechamento
  const x6 = SW * 5 + M;
  d.titulo("A IA dá a deixa.\nSeu time entra\nem cena.", { x: x6, y: 330, size: 96, cor: K.coxia });
  d.botao("Teste grátis no link da bio", { x: x6, y: 690 });
  await d.logo(B.logo.principalCor, { x: x6, y: 840, largura: 200 });
  d.grade();
  for (let i = 1; i < N; i++) d.guias.push({ location: SW * i, direction: "vertical" });
  const composta = d.salvar();
  const dir = path.join(OUT, "carrossel_continuo");
  fs.mkdirSync(dir, { recursive: true });
  for (let i = 0; i < N; i++) {
    const c = createCanvas(SW, FEED.altura);
    c.getContext("2d").drawImage(composta, -i * SW, 0);
    fs.writeFileSync(path.join(dir, `carrossel_continuo_${String(i + 1).padStart(2, "0")}.png`), c.toBuffer("image/png"));
  }
}

(async () => {
  for (const dir of ["", "previews", "assets"]) fs.mkdirSync(path.join(OUT, dir), { recursive: true });
  for (const gerar of [storyConversa, frase, antesDepois, numero, lista, tela, enquete, foto]) await gerar();
  for (const n of NOVIDADES) await novidade(n.slug, n);
  await carrosselContinuo();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
