// Templates de Instagram da Tábua (direção "Letreiro") em .psd com camadas separadas e nomeadas.
//   npm run generate          → output/*.psd + output/previews/*.png + output/assets (logos e ícones em PNG 2×)
// Cores, fontes e arquivos vêm de brand.config.js. Nada aqui redesenha logo, padrão ou ícone: tudo sai dos arquivos oficiais.
const fs = require("node:fs");
const path = require("node:path");
const { createCanvas, GlobalFonts, Path2D, loadImage } = require("@napi-rs/canvas");
const { initializeCanvas, writePsdBuffer } = require("ag-psd");
const { Resvg } = require("@resvg/resvg-js");
const B = require("./brand.config.js");

initializeCanvas((w, h) => createCanvas(w, h));

const K = B.cores;
const OUT = path.join(__dirname, "output");
const ICONES = ["cardapio", "comanda", "mesa-qr", "conversa", "entrega", "relogio", "impressora", "cozinha"];
const GRUPOS = ["Fundo", "Padrao", "Grafismos", "Imagem (substituir)", "Texto", "Logo", "Guias"];
const rgb = (hex) => ({ r: parseInt(hex.slice(1, 3), 16), g: parseInt(hex.slice(3, 5), 16), b: parseInt(hex.slice(5, 7), 16) });
const rel = (f) => path.relative(path.join(__dirname, ".."), f);

// ── 1. Confere os arquivos da marca antes de gerar qualquer coisa ─────────────
function conferir() {
  const exigidos = [
    ...Object.values(B.fontes).map((f) => f.arquivo),
    ...Object.values(B.logo),
    ...Object.values(B.padrao),
    ...ICONES.map((i) => path.join(B.icones, `${i}.svg`)),
  ];
  const faltando = exigidos.filter((f) => !fs.existsSync(f));
  if (faltando.length) {
    console.error(`Faltam arquivos da marca. Nada foi gerado (não troco por outro arquivo nem outra fonte):\n${faltando.map((f) => `  - ${rel(f)}`).join("\n")}`);
    process.exit(1);
  }
}
conferir();

const FAM = {};
for (const [k, f] of Object.entries(B.fontes)) {
  GlobalFonts.registerFromPath(f.arquivo, `Tabua_${k}`);
  FAM[k] = `Tabua_${k}`;
}

// Métrica: altura das maiúsculas/algarismos em relação ao corpo (para alinhar preço e faixa)
const medidor = createCanvas(10, 10).getContext("2d");
function capRatio(font) {
  medidor.font = `100px ${FAM[font]}`;
  return medidor.measureText("0").actualBoundingBoxAscent / 100;
}

// ── 2. Arquivos oficiais → imagens ────────────────────────────────────────────
const lerSvg = (f) => fs.readFileSync(f, "utf8");
async function svgParaImagem(svg, largura, salvarComo) {
  const png = new Resvg(svg, { fitTo: { mode: "width", value: Math.round(largura * 2) } }).render().asPng(); // 2× o tamanho de uso
  if (salvarComo) fs.writeFileSync(path.join(OUT, "assets", salvarComo), png);
  return loadImage(png);
}
// O gesto: o traço do acento do logo, do ladrilho oficial (mesmo path do símbolo)
const GESTO_D = lerSvg(B.padrao.verde).match(/<path d="([^"]+)"/)[1];
const GESTO_BOX = { x: 82, y: -196, w: 112, h: 108 };

// ── 3. Formas do sistema gráfico ──────────────────────────────────────────────
/** A placa: cantos recortados para dentro em quarto de círculo; raio = 10% do lado menor. */
function placaPath(x, y, w, h, r = Math.min(w, h) * 0.1) {
  const p = new Path2D();
  p.moveTo(x + r, y);
  p.lineTo(x + w - r, y);
  p.arc(x + w, y, r, Math.PI, Math.PI / 2, true);
  p.lineTo(x + w, y + h - r);
  p.arc(x + w, y + h, r, -Math.PI / 2, Math.PI, true);
  p.lineTo(x + r, y + h);
  p.arc(x, y + h, r, 0, -Math.PI / 2, true);
  p.lineTo(x, y + r);
  p.arc(x, y, r, Math.PI / 2, 0, true);
  p.closePath();
  return p;
}
/** A faixa: fita com entalhe em V nas duas pontas. */
function faixaPath(x, y, w, h) {
  const n = h / 3;
  const p = new Path2D();
  p.moveTo(x, y);
  p.lineTo(x + w, y);
  p.lineTo(x + w - n, y + h / 2);
  p.lineTo(x + w, y + h);
  p.lineTo(x, y + h);
  p.lineTo(x + n, y + h / 2);
  p.closePath();
  return p;
}

// ── 4. Documento com grupos e camadas ─────────────────────────────────────────
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
    this.pixel("Fundo", fundo === K.cal ? "Fundo_cal" : "Fundo_verde", (ctx) => {
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

  /** Título com sombra solta: `Titulo_sombra` (cópia deslocada) embaixo de `Titulo` (com o respiro). */
  titulo(str, o) {
    const n = str.split("\n").length;
    const leading = o.leading ?? Math.round(o.size * 0.96);
    const altura = capRatio("display") * o.size + (n - 1) * leading;
    const off = Math.max(3, Math.round(altura * B.sombraSolta));
    const nome = o.nome ?? "Titulo";
    this.texto("Texto", `${nome}_sombra`, str, { tracking: 34, ...o, font: "display", leading, x: o.x + off, y: o.y + off, cor: o.sombra, sub: o.sub });
    return this.texto("Texto", nome, str, { tracking: 34, ...o, font: "display", leading, respiro: { cor: o.fundo ?? this.fundo, largura: Math.max(2, Math.round(off * 0.55)) }, sub: o.sub });
  }

  /** Faixa com pontas em V + texto em Anybody caixa alta (até 4 palavras). tom: "ovo" | "verde". */
  faixa(str, { x, y, altura = 56, tom = "ovo", nome = "Faixa" }) {
    if (str.trim().split(/\s+/).length > 4) this.avisos.push(`Faixa com mais de 4 palavras: "${str}"`);
    const size = Math.round(altura / 2.1);
    medidor.font = `${size}px ${FAM.etiqueta}`;
    const tracking = 60;
    const w = [...str.toUpperCase()].reduce((s, ch) => s + medidor.measureText(ch).width, 0) + (tracking / 1000) * size * (str.length - 1) + 2 * 1.3 * size;
    this.forma("Grafismos", nome, faixaPath(x, y, w, altura), tom === "ovo" ? K.amareloOvo : K.verdeBoteco);
    this.texto("Texto", `${nome}_texto`, str.toUpperCase(), {
      font: "etiqueta",
      size,
      tracking,
      cor: tom === "ovo" ? K.tinta : K.cal,
      x: x + w / 2,
      y: y + altura / 2 + (capRatio("etiqueta") * size) / 2,
      align: "center",
    });
    return { x0: x, x1: x + w, y0: y, y1: y + altura };
  }

  /** CTA: placa Amarelo-ovo com texto Tinta. */
  cta(str, { x, y, altura = 104, align = "left" }) {
    const size = 38;
    medidor.font = `${size}px ${FAM.corpoBold}`;
    const w = medidor.measureText(str).width + 2 * 48;
    const x0 = align === "center" ? x - w / 2 : align === "right" ? x - w : x;
    this.forma("Grafismos", "CTA_placa", placaPath(x0, y, w, altura), K.amareloOvo);
    this.texto("Texto", "CTA", str, { font: "corpoBold", size, cor: K.tinta, x: x0 + w / 2, y: y + altura / 2 + size * 0.36, align: "center" });
    return { x0, x1: x0 + w, y0: y, y1: y + altura };
  }

  /** Preço de placa: "R$" pequeno no alto, reais grandes, centavos no alto e sublinhados. Sempre Anybody. */
  preco(centavos, { x, y, size, cor, align = "left", riscado = false, prefixo = "Preco", sub }) {
    const reais = Math.floor(centavos / 100).toLocaleString("pt-BR");
    const cents = String(centavos % 100).padStart(2, "0");
    const sRS = Math.round(size * 0.32);
    const sC = Math.round(size * 0.42);
    const mede = (s, t) => ((medidor.font = `${s}px ${FAM.numero}`), medidor.measureText(t).width);
    const [wRS, wI, wC] = [mede(sRS, "R$"), mede(size, reais), mede(sC, cents)];
    const g1 = size * 0.04;
    const g2 = size * 0.03;
    const total = wRS + g1 + wI + g2 + wC;
    const x0 = align === "center" ? x - total / 2 : align === "right" ? x - total : x;
    const cap = capRatio("numero");
    const topo = y - cap * size;
    this.texto("Texto", `${prefixo}_RS`, "R$", { font: "numero", size: sRS, cor, x: x0, y: topo + cap * sRS + size * 0.03, sub });
    this.texto("Texto", `${prefixo}_inteiro`, reais, { font: "numero", size, cor, x: x0 + wRS + g1, y, sub });
    this.texto("Texto", `${prefixo}_centavos`, cents, { font: "numero", size: sC, cor, x: x0 + wRS + g1 + wI + g2, y: topo + cap * sC, underline: true, sub });
    if (riscado) {
      // preço cortado: traço de Vermelho-placa por cima dos números
      this.pixel(
        "Texto",
        `${prefixo}_risco`,
        (ctx) => {
          ctx.strokeStyle = K.vermelhoPlaca;
          ctx.lineWidth = Math.max(6, size * 0.07);
          ctx.lineCap = "round";
          ctx.beginPath();
          ctx.moveTo(x0 - size * 0.05, y - cap * size * 0.3);
          ctx.lineTo(x0 + total + size * 0.05, y - cap * size * 0.62);
          ctx.stroke();
        },
        { sub },
      );
    }
    return { x0, x1: x0 + total, topo, base: y };
  }

  async logo(arquivo, { x, y, largura, align = "left", nome = "Logo" }) {
    let file = arquivo;
    if (largura < B.logoMinimo && arquivo === B.logo.principalCor) {
      file = B.logo.reduzidaCor;
      this.avisos.push(`Logo com ${largura}px: trocado pela versão reduzida (mínimo da principal: ${B.logoMinimo}px)`);
    }
    const img = await svgParaImagem(lerSvg(file), largura, `${path.basename(file, ".svg")}@2x.png`);
    const h = (img.height / img.width) * largura;
    const x0 = align === "center" ? x - largura / 2 : align === "right" ? x - largura : x;
    this.pixel("Logo", nome, (ctx) => ctx.drawImage(img, x0, y, largura, h));
    return { x0, x1: x0 + largura, y0: y, y1: y + h };
  }

  /** Ícone próprio (grade 24, traço 2,3, pontas arredondadas), numa cor só. */
  async icone(nomeIcone, { x, y, size, cor, nome }) {
    const svg = lerSvg(path.join(B.icones, `${nomeIcone}.svg`)).replace(/currentColor/g, cor);
    const img = await svgParaImagem(svg, size, `icone-${nomeIcone}@2x.png`);
    this.pixel("Grafismos", nome ?? `Icone_${nomeIcone}`, (ctx) => ctx.drawImage(img, x, y, size, size));
  }

  /** O gesto solto (um por peça), centrado em (cx, cy) e girado em volta do próprio centro. */
  gesto({ cx, cy, largura, cor, rot = 0 }) {
    const s = largura / GESTO_BOX.w;
    this.pixel("Grafismos", "Gesto", (ctx) => {
      ctx.translate(cx, cy);
      ctx.rotate((rot * Math.PI) / 180);
      ctx.scale(s, s);
      ctx.translate(-GESTO_BOX.x - GESTO_BOX.w / 2, -GESTO_BOX.y - GESTO_BOX.h / 2);
      ctx.fillStyle = cor;
      ctx.fill(new Path2D(GESTO_D));
    });
  }

  /** Azulejo de gesto (ladrilho oficial, sem o fundo), tom sobre tom, numa região. */
  async padrao(tom, { x = 0, y = 0, w = this.W, h = this.H, lado = 140 }) {
    const svg = lerSvg(B.padrao[tom]).replace(/<rect[^>]*\/>/, "");
    const tile = await svgParaImagem(svg, lado);
    this.pixel("Padrao", `Padrao_azulejo_${tom}`, (ctx) => {
      ctx.beginPath();
      ctx.rect(x, y, w, h);
      ctx.clip();
      for (let ty = y; ty < y + h; ty += lado) for (let tx = x - lado / 2; tx < x + w; tx += lado) ctx.drawImage(tile, tx, ty, lado, lado);
    });
  }

  /** Espaço da foto: placa nomeada FOTO_AQUI (coloque a foto logo acima e use máscara de corte: Ctrl+Alt+G). */
  foto({ x, y, w, h, legenda = "FOTO AQUI" }) {
    this.forma("Imagem (substituir)", "FOTO_AQUI", placaPath(x, y, w, h), K.azulejo, { sub: "Foto" });
    this.texto("Imagem (substituir)", "FOTO_AQUI_rotulo (apague)", `${legenda}\nfoto real, luz quente, de perto`, {
      font: "etiqueta",
      size: 28,
      tracking: 60,
      cor: K.verdeBoteco,
      x: x + w / 2,
      y: y + h / 2,
      align: "center",
      leading: 40,
      sub: "Foto",
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
        ctx.fillStyle = `${K.vermelhoPlaca}26`;
        for (let i = 0; i < colunas; i++) ctx.fillRect(this.M + i * (col + calha), 0, col, this.H);
        if (zonaSegura) {
          ctx.fillStyle = `${K.tinta}33`;
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
  }
}

const resolucao72 = { horizontalResolution: 72, horizontalResolutionUnit: "PPI", widthUnit: "Inches", verticalResolution: 72, verticalResolutionUnit: "PPI", heightUnit: "Inches" };

// ── 5. Os templates ───────────────────────────────────────────────────────────
const FEED = B.feed;

/** 1. Anúncio: faixa + título com sombra solta + card de placa com o prazo + CTA + logo. Fundo Cal. Sem preço. */
async function anuncio() {
  const d = new Doc("feed_anuncio_1080x1350", FEED, K.cal);
  const M = d.M;
  const f = d.faixa("Sem comissão por pedido", { x: M, y: 96 });
  const t = d.titulo("Do letreiro\npro celular.", { x: M, y: f.y1 + 190, size: 140, cor: K.verdeBoteco, sombra: K.tinta });
  d.texto("Texto", "Apoio", "Cardápio digital, pedido na mesa pelo QR e\npedido no WhatsApp. Com a cara da sua casa.", { size: 32, cor: K.tinta, x: M, y: t.base + 96 });
  // card de placa (Verde) com o prazo
  const card = { x: M, y: 800, w: FEED.largura - 2 * M, h: 300 };
  d.forma("Grafismos", "Card_placa", placaPath(card.x, card.y, card.w, card.h), K.verdeBoteco);
  d.texto("Texto", "Card_etiqueta", "CARDÁPIO NO AR EM", { font: "etiqueta", size: 28, tracking: 60, cor: K.cal, x: card.x + 56, y: card.y + 84 });
  d.texto("Texto", "Card_numero", "10", { font: "numero", size: 170, cor: K.amareloOvo, x: card.x + 56, y: card.y + 252 });
  d.texto("Texto", "Card_unidade", "MIN", { font: "numero", size: 64, cor: K.amareloOvo, x: card.x + 56 + 215, y: card.y + 252 });
  d.texto("Texto", "Card_texto", "Sem instalar nada.\nO cliente abre\npelo QR ou pelo link.", { size: 34, cor: K.cal, x: card.x + 540, y: card.y + 126 });
  d.cta("Crie seu cardápio grátis", { x: M, y: 1166 });
  await d.logo(B.logo.principalCor, { x: FEED.largura - M, y: 1178, largura: 220, align: "right" });
  d.grade();
  d.salvar();
}

/** 2. Dica pro dono: número grande, ícone próprio, texto curto. Fundo Verde. */
async function dica() {
  const d = new Doc("feed_dica_1080x1350", FEED, K.verdeBoteco);
  const M = d.M;
  await d.padrao("verde", { y: 0, h: 420 });
  d.faixa("Dica de balcão", { x: M, y: 96 });
  d.texto("Texto", "Numero", "01", { font: "numero", size: 230, cor: K.amareloOvo, x: M, y: 380 });
  // ícone próprio dentro de um contêiner de placa
  d.forma("Grafismos", "Icone_placa", placaPath(FEED.largura - M - 170, 200, 170, 170), K.cal);
  await d.icone("relogio", { x: FEED.largura - M - 170 + 35, y: 235, size: 100, cor: K.verdeBoteco });
  const t = d.titulo("Fechou\nmais cedo?", { x: M, y: 600, size: 124, cor: K.cal, sombra: K.amareloOvo });
  d.texto("Texto", "Apoio", "Um toque no painel e o cardápio avisa:\n“Fechado agora. Volta amanhã às 11h.”\nO cliente não pede à toa e a freguesia\nnão fica esperando resposta.", {
    size: 34,
    cor: K.cal,
    x: M,
    y: t.base + 120,
  });
  await d.logo(B.logo.principalNegativo, { x: M, y: 1174, largura: 220 });
  d.texto("Texto", "Rodape_@tabua", "@tabua.app", { font: "corpoBold", size: 26, cor: K.cal, x: FEED.largura - M, y: 1240, align: "right" });
  d.grade();
  d.salvar();
}

/** 3a. Carrossel, capa: gancho com número. Fundo Verde. */
async function capa() {
  const d = new Doc("carrossel_capa_1080x1350", FEED, K.verdeBoteco);
  const M = d.M;
  await d.logo(B.logo.principalNegativo, { x: M, y: 96, largura: 200 });
  const t = d.titulo("Vendeu 100.\nRecebeu 73.", { x: M, y: 520, size: 160, cor: K.cal, sombra: K.amareloOvo });
  d.texto("Texto", "Subtitulo", "Exemplo: numa comissão de 27%, cada\npedido de cem reais deixa 73 pra você.\nArrasta que a gente mostra o outro jeito.", { size: 36, cor: K.cal, x: M, y: t.base + 130 });
  await d.padrao("verde", { y: 1120, h: 230 });
  const f = d.faixa("Arrasta pro lado", { x: M, y: 1196, altura: 64 });
  d.gesto({ cx: f.x1 + 100, cy: f.y0 + 30, largura: 120, cor: K.amareloOvo, rot: 40 }); // aponta pro lado
  d.texto("Texto", "Paginacao", "1/3", { font: "etiqueta", size: 28, tracking: 60, cor: K.cal, x: FEED.largura - M, y: 1240, align: "right" });
  d.grade();
  d.salvar();
}

/** 3b. Carrossel, miolo: conteúdo em lista com ícones próprios. Fundo Cal. */
async function miolo() {
  const d = new Doc("carrossel_miolo_1080x1350", FEED, K.cal);
  const M = d.M;
  d.texto("Texto", "Etiqueta", "O QUE MUDA NO BALCÃO", { font: "etiqueta", size: 28, tracking: 60, cor: K.verdeBoteco, x: M, y: 140 });
  const t = d.titulo("Três coisas,\nzero comissão.", { x: M, y: 280, size: 104, cor: K.verdeBoteco, sombra: K.tinta });
  const itens = [
    ["cardapio", "Preço muda pelo celular", "Acabou o frango? Um toque e ele sai\ndo cardápio na hora."],
    ["mesa-qr", "Pedido na mesa pelo QR", "O cliente pede do celular e a comanda\nchega na cozinha."],
    ["conversa", "Pedido no WhatsApp", "Chega pronto pra anotar: itens,\nendereço e forma de pagamento."],
  ];
  let y = t.base + 110;
  for (const [i, [icone, titulo, texto]] of itens.entries()) {
    d.forma("Grafismos", `Item${i + 1}_icone_placa`, placaPath(M, y, 112, 112), K.verdeBoteco);
    await d.icone(icone, { x: M + 24, y: y + 24, size: 64, cor: K.cal, nome: `Item${i + 1}_icone` });
    d.texto("Texto", `Item${i + 1}_titulo`, titulo, { font: "subtitulo", size: 40, cor: K.tinta, x: M + 148, y: y + 40 });
    d.texto("Texto", `Item${i + 1}_texto`, texto, { size: 30, cor: K.tinta, x: M + 148, y: y + 92 });
    if (i < itens.length - 1) {
      d.pixel("Grafismos", `Item${i + 1}_linha`, (ctx) => {
        ctx.strokeStyle = K.tinta;
        ctx.globalAlpha = 0.35;
        ctx.setLineDash([8, 8]);
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(M, y + 196);
        ctx.lineTo(FEED.largura - M, y + 196);
        ctx.stroke();
      });
    }
    y += 232;
  }
  d.texto("Texto", "Rodape_@tabua", "@tabua.app", { font: "corpoBold", size: 26, cor: K.verdeBoteco, x: M, y: 1270 });
  d.texto("Texto", "Paginacao", "2/3", { font: "etiqueta", size: 28, tracking: 60, cor: K.verdeBoteco, x: FEED.largura - M, y: 1270, align: "right" });
  d.grade();
  d.salvar();
}

/** 3c. Carrossel, final: tagline + gesto + CTA + logo. Fundo Verde. */
async function final() {
  const d = new Doc("carrossel_final_1080x1350", FEED, K.verdeBoteco);
  const M = d.M;
  await d.padrao("verde", { y: 0, h: 280 });
  const t = d.titulo("A freguesia\né sua. O lucro\ntambém.", { x: M, y: 470, size: 128, cor: K.cal, sombra: K.amareloOvo });
  // o gesto sublinha "também." (última linha; entre as linhas não sobra respiro)
  medidor.font = `128px ${FAM.display}`;
  const palavra = medidor.measureText("também").width;
  d.gesto({ cx: M + palavra * 0.55, cy: t.base + 46, largura: palavra * 0.42, cor: K.amareloOvo, rot: 42 });
  d.texto("Texto", "Apoio", "Cardápio, pedido na mesa e no WhatsApp,\nsem comissão por pedido. Teste grátis.", { size: 34, cor: K.cal, x: M, y: t.base + 130 });
  d.cta("Link na bio", { x: M, y: 1030 });
  await d.logo(B.logo.principalNegativo, { x: FEED.largura - M, y: 1150, largura: 260, align: "right" });
  d.texto("Texto", "Paginacao", "3/3", { font: "etiqueta", size: 28, tracking: 60, cor: K.cal, x: M, y: 1270 });
  d.grade();
  d.salvar();
}

/** 4. Depoimento: foto em placa + citação do dono (EXEMPLO a substituir). Fundo Cal. */
async function depoimento() {
  const d = new Doc("feed_depoimento_1080x1350", FEED, K.cal);
  const M = d.M;
  const EX = "EXEMPLO - substituir por cliente real";
  const foto = d.foto({ x: M, y: 80, w: FEED.largura - 2 * M, h: 560, legenda: "FOTO DO DONO NO BALCÃO" });
  d.faixa("Quem usa", { x: M, y: foto.y1 + 36, tom: "verde" });
  d.texto("Texto", "Citacao", "“Parei de pagar comissão\ne a freguesia continuou\nvoltando.”", { font: "display", size: 76, leading: 72, cor: K.verdeBoteco, x: M, y: 850, sub: EX });
  d.texto("Texto", "Nome", "Nome Sobrenome", { font: "corpoBold", size: 34, cor: K.tinta, x: M, y: 1080, sub: EX });
  d.texto("Texto", "Casa_e_bairro", "Nome da Casa · Bairro, Cidade", { size: 30, cor: K.tinta, x: M, y: 1128, sub: EX });
  await d.logo(B.logo.principalCor, { x: FEED.largura - M, y: 1170, largura: 200, align: "right" });
  d.grade();
  d.salvar();
}

/** 5. Antes/depois: comissão cortada × R$ 0,00 de comissão. Fundo Cal. */
async function antesDepois() {
  const d = new Doc("feed_antes_depois_1080x1350", FEED, K.cal);
  const M = d.M;
  const meio = FEED.largura / 2;
  const t = d.titulo("Sem comissão\npor pedido.\nNenhuma.", { x: M, y: 210, size: 112, cor: K.verdeBoteco, sombra: K.tinta });
  const y0 = t.base + 110;
  // lado esquerdo: marketplace
  d.faixa("No marketplace", { x: M, y: y0, tom: "verde", nome: "Faixa_antes" });
  d.texto("Texto", "Antes_texto", "Exemplo: pedido de cem reais\ncom 27% de comissão:", { size: 30, cor: K.tinta, x: M, y: y0 + 130 });
  d.preco(2700, { x: M, y: y0 + 350, size: 130, cor: K.vermelhoPlaca, riscado: true, prefixo: "Antes_preco" });
  d.texto("Texto", "Antes_rodape", "que ficam com o app.", { size: 30, cor: K.tinta, x: M, y: y0 + 420 });
  // divisória
  d.pixel("Grafismos", "Divisoria", (ctx) => {
    ctx.strokeStyle = K.tinta;
    ctx.globalAlpha = 0.35;
    ctx.setLineDash([8, 8]);
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(meio, y0);
    ctx.lineTo(meio, y0 + 440);
    ctx.stroke();
  });
  // lado direito: Tábua
  const xr = meio + 40;
  d.faixa("Na Tábua", { x: xr, y: y0, nome: "Faixa_depois" });
  d.texto("Texto", "Depois_texto", "O mesmo pedido\nna Tábua, de comissão:", { size: 30, cor: K.tinta, x: xr, y: y0 + 130 });
  d.preco(0, { x: xr, y: y0 + 350, size: 150, cor: K.verdeBoteco, prefixo: "Depois_preco" });
  d.texto("Texto", "Depois_rodape", "A freguesia continua sua.", { size: 30, cor: K.tinta, x: xr, y: y0 + 420 });
  await d.logo(B.logo.principalCor, { x: meio, y: 1160, largura: 220, align: "center" });
  d.grade();
  d.salvar();
}

/** 6. Prato do dia: template para o RESTAURANTE cliente (a Tábua só no rodapé). Fundo Cal. */
async function pratoDoDia() {
  const d = new Doc("feed_preco_1080x1350", FEED, K.cal);
  const M = d.M;
  d.texto("Texto", "Restaurante_nome", "NOME DO RESTAURANTE", { font: "etiqueta", size: 30, tracking: 60, cor: K.verdeBoteco, x: M, y: 128 });
  const foto = d.foto({ x: M, y: 170, w: FEED.largura - 2 * M, h: 620, legenda: "FOTO DO PRATO" });
  d.faixa("Prato do dia", { x: M, y: foto.y1 + 28, altura: 64 });
  const t = d.titulo("Feijoada\ncompleta", { x: M, y: foto.y1 + 214, size: 112, cor: K.verdeBoteco, sombra: K.tinta });
  d.texto("Texto", "Descricao", "Arroz, couve, farofa e laranja.\nSó hoje, enquanto durar.", { size: 30, cor: K.tinta, x: M, y: t.base + 84 });
  d.preco(3490, { x: FEED.largura - M, y: t.base + 20, size: 190, cor: K.verdeBoteco, align: "right" });
  d.texto("Logo", "Rodape_cardapio_por_tabua", "CARDÁPIO POR TÁBUA", { font: "etiqueta", size: 22, tracking: 60, cor: K.verdeBoteco, x: FEED.largura / 2, y: 1300, align: "center" });
  d.grade();
  d.salvar();
}

/** 8. Tela do produto: cardápio de exemplo (restaurante fictício) dentro de uma placa. Fundo Verde. */
async function telaCardapio() {
  const d = new Doc("feed_tela_cardapio_1080x1350", FEED, K.verdeBoteco);
  const M = d.M;
  await d.padrao("verde", { y: 0, h: 1350 });
  d.faixa("Cardápio de exemplo", { x: M, y: 96 });
  const t = d.titulo("Cardápio com a\ncara da casa.", { x: M, y: 330, size: 108, cor: K.cal, sombra: K.amareloOvo, fundo: K.verdeBoteco });
  const c = { x: M, y: t.base + 90, w: FEED.largura - 2 * M, h: 640 };
  d.forma("Grafismos", "Cardapio_placa", placaPath(c.x, c.y, c.w, c.h), K.cal);
  const px = c.x + 56;
  const pr = c.x + c.w - 56;
  d.texto("Texto", "Cardapio_nome", "Bar do Zé", { font: "display", size: 64, cor: K.tinta, x: px, y: c.y + 110 });
  d.texto("Texto", "Cardapio_status", "Aberto agora · fecha às 23h", { font: "corpoBold", size: 26, cor: K.verdeBoteco, x: px, y: c.y + 160 });
  const itens = [
    ["X-Salada da casa", "Pão de brioche, blend 150 g, queijo prato", 2990],
    ["Porção de mandioca", "Com manteiga de garrafa", 2400],
    ["Caldo de feijão", "Copo 300 ml, torresmo e cebolinha", 1450],
  ];
  let y = c.y + 250;
  for (const [i, [nome, detalhe, valor]] of itens.entries()) {
    d.texto("Texto", `Cardapio_item${i + 1}`, nome, { font: "subtitulo", size: 38, cor: K.tinta, x: px, y });
    d.texto("Texto", `Cardapio_item${i + 1}_detalhe`, detalhe, { size: 26, cor: K.tinta, x: px, y: y + 44 });
    d.preco(valor, { x: pr, y: y + 36, size: 64, cor: K.verdeBoteco, align: "right", prefixo: `Cardapio_preco${i + 1}` });
    if (i < itens.length - 1) {
      d.pixel("Grafismos", `Cardapio_linha${i + 1}`, (ctx) => {
        ctx.strokeStyle = K.tinta;
        ctx.globalAlpha = 0.35;
        ctx.setLineDash([8, 8]);
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(px, y + 82);
        ctx.lineTo(pr, y + 82);
        ctx.stroke();
      });
    }
    y += 130;
  }
  await d.logo(B.logo.principalNegativo, { x: M, y: 1176, largura: 220 });
  d.texto("Texto", "Rodape_@tabua", "@tabua.app", { font: "corpoBold", size: 26, cor: K.cal, x: FEED.largura - M, y: 1240, align: "right" });
  d.grade();
  d.salvar();
}

/** 9. Enquete: pergunta com duas respostas em placas (A e B). Fundo Cal. */
async function enquete() {
  const d = new Doc("feed_enquete_1080x1350", FEED, K.cal);
  const M = d.M;
  d.faixa("Pergunta do balcão", { x: M, y: 96 });
  const t = d.titulo("Quem pede mais\nno seu restaurante?", { x: M, y: 330, size: 84, cor: K.verdeBoteco, sombra: K.tinta });
  const w = 440;
  const y0 = t.base + 110;
  const opcoes = [
    { x: M, bg: K.verdeBoteco, letra: K.amareloOvo, texto: K.cal, l: "A", rotulo: "Pedido na mesa\npelo QR", icone: "mesa-qr" },
    { x: FEED.largura - M - w, bg: K.amareloOvo, letra: K.verdeBoteco, texto: K.tinta, l: "B", rotulo: "Pedido\nno WhatsApp", icone: "conversa" },
  ];
  for (const o of opcoes) {
    d.forma("Grafismos", `Opcao_${o.l}_placa`, placaPath(o.x, y0, w, 400), o.bg);
    d.texto("Texto", `Opcao_${o.l}_letra`, o.l, { font: "numero", size: 170, cor: o.letra, x: o.x + 48, y: y0 + 200 });
    await d.icone(o.icone, { x: o.x + w - 48 - 80, y: y0 + 48, size: 80, cor: o.texto, nome: `Opcao_${o.l}_icone` });
    d.texto("Texto", `Opcao_${o.l}_rotulo`, o.rotulo, { font: "subtitulo", size: 42, leading: 48, cor: o.texto, x: o.x + 48, y: y0 + 290 });
  }
  d.texto("Texto", "Chamada", "Responde nos comentários: A ou B?", { font: "corpoBold", size: 36, cor: K.tinta, x: M, y: y0 + 500 });
  await d.logo(B.logo.principalCor, { x: FEED.largura - M, y: 1178, largura: 220, align: "right" });
  d.grade();
  d.salvar();
}

/** 10. Foto + título: foto real do balcão em placa e frase curta com letreiro. Fundo Cal. */
async function fotoTitulo() {
  const d = new Doc("feed_foto_titulo_1080x1350", FEED, K.cal);
  const M = d.M;
  const foto = d.foto({ x: M, y: 80, w: FEED.largura - 2 * M, h: 700, legenda: "FOTO DO BALCÃO" });
  d.faixa("Do balcão", { x: M, y: foto.y1 + 36 });
  d.titulo("Pedido\nanotado.", { x: M, y: foto.y1 + 250, size: 150, cor: K.verdeBoteco, sombra: K.tinta });
  await d.logo(B.logo.principalCor, { x: FEED.largura - M, y: 1190, largura: 200, align: "right" });
  d.grade();
  d.salvar();
}

/** 11. Novidade / Em breve: faixa, título com letreiro e uma placa de papel com 3 itens e carimbo. Fundo Verde. */
async function novidade(slug, { faixa, titulo, itens, carimbo, tamanho = 100 }) {
  const o_size = tamanho;
  const d = new Doc(`feed_novidade_${slug}_1080x1350`, FEED, K.verdeBoteco);
  const M = d.M;
  await d.padrao("verde", { y: 0, h: 1350 });
  d.faixa(faixa, { x: M, y: 96 });
  const t = d.titulo(titulo, { x: M, y: 330, size: o_size, cor: K.cal, sombra: K.amareloOvo, fundo: K.verdeBoteco });
  const c = { x: M, y: t.base + 96, w: FEED.largura - 2 * M, h: 560 };
  d.forma("Grafismos", "Papel_placa", placaPath(c.x, c.y, c.w, c.h), K.cal);
  const px = c.x + 56;
  let y = c.y + 84;
  for (const [i, [icone, nome, texto]] of itens.entries()) {
    d.forma("Grafismos", `Item${i + 1}_icone_placa`, placaPath(px, y, 96, 96), K.verdeBoteco);
    await d.icone(icone, { x: px + 20, y: y + 20, size: 56, cor: K.cal, nome: `Item${i + 1}_icone` });
    d.texto("Texto", `Item${i + 1}_titulo`, nome, { font: "subtitulo", size: 38, cor: K.tinta, x: px + 128, y: y + 36 });
    d.texto("Texto", `Item${i + 1}_texto`, texto, { size: 28, cor: K.tinta, x: px + 128, y: y + 82 });
    y += 150;
  }
  // carimbo no canto da placa, girado −6° (só em papel Cal)
  medidor.font = `34px ${FAM.etiqueta}`;
  const cw = [...carimbo].reduce((a, ch) => a + medidor.measureText(ch).width, 0) + (60 / 1000) * 34 * (carimbo.length - 1) + 56;
  const cb = { cx: c.x + c.w - cw / 2 - 40, cy: c.y - 6, w: cw, h: 76 };
  d.pixel("Grafismos", "Carimbo_fundo", (ctx) => {
    ctx.translate(cb.cx, cb.cy);
    ctx.rotate((-6 * Math.PI) / 180);
    ctx.fillStyle = K.cal;
    ctx.fillRect(-cb.w / 2 - 12, -cb.h / 2 - 12, cb.w + 24, cb.h + 24);
    ctx.strokeStyle = K.vermelhoPlaca;
    ctx.lineWidth = 5;
    ctx.strokeRect(-cb.w / 2, -cb.h / 2, cb.w, cb.h);
    ctx.lineWidth = 2;
    ctx.strokeRect(-cb.w / 2 - 7, -cb.h / 2 - 7, cb.w + 14, cb.h + 14);
  });
  d.texto("Texto", "Carimbo_texto", carimbo, { font: "etiqueta", size: 34, tracking: 60, cor: K.vermelhoPlaca, x: cb.cx, y: cb.cy + 12, align: "center", rot: -6 });
  await d.logo(B.logo.principalNegativo, { x: M, y: 1176, largura: 220 });
  d.texto("Texto", "Rodape_@tabua", "@tabua.app", { font: "corpoBold", size: 26, cor: K.cal, x: FEED.largura - M, y: 1240, align: "right" });
  d.grade();
  d.salvar();
}

const NOVIDADES = [
  {
    slug: "retirada_agendada",
    faixa: "Novidade",
    titulo: "Retirada com\nhora marcada.",
    carimbo: "NOVO",
    itens: [
      ["relogio", "O cliente escolhe o horário", "Só aparecem horários em que a casa abre."],
      ["cozinha", "Cozinha sem atropelo", "Você define quantos pedidos cabem por horário."],
      ["cardapio", "Você liga quando quiser", "Vem desligada. Ativa nas configurações."],
    ],
  },
  {
    slug: "balcao",
    faixa: "Novo módulo",
    titulo: "Balcão e telefone\nno mesmo painel.",
    carimbo: "NOVO",
    itens: [
      ["comanda", "Lança o pedido na hora", "Balcão, telefone e WhatsApp num só lugar."],
      ["conversa", "Pagamento dividido", "Dinheiro, Pix e cartão no mesmo pedido, com troco."],
      ["impressora", "Comanda sai sozinha", "Na cozinha, sem apertar nada."],
    ],
  },
  {
    slug: "estoque_em_breve",
    faixa: "Em breve",
    titulo: "Acabou? O cardápio\navisa sozinho.",
    carimbo: "EM BREVE",
    tamanho: 90,
    itens: [
      ["cardapio", "Esgotado automático", "Zerou o estoque, o item sai do ar."],
      ["relogio", "Alerta de mínimo", "Você vê o que está acabando."],
      ["comanda", "Entrada, perda e ajuste", "Cada movimento fica no histórico."],
    ],
  },
];

/** 7. Story: comanda chegando (Nº 047, itens, total em preço de placa, carimbo). Zonas seguras de 250 px. */
async function story() {
  const S = B.story;
  const d = new Doc("story_1080x1920", S, K.verdeBoteco);
  const M = d.M;
  const topo = S.zonaSegura;
  await d.logo(B.logo.principalNegativo, { x: M, y: topo + 20, largura: 200 });
  const t = d.titulo("O cliente pediu.\nA Tábua anotou.", { x: M, y: topo + 250, size: 104, cor: K.cal, sombra: K.amareloOvo });

  // a comanda: papel Cal com a borda de baixo serrilhada
  const c = { x: 140, y: t.base + 90, w: 800, h: 760 };
  const dente = c.w / Math.round(c.w / 24); // divide a largura por inteiro: a borda não entorta
  d.pixel("Grafismos", "Comanda_papel", (ctx) => {
    ctx.fillStyle = K.cal;
    ctx.beginPath();
    ctx.moveTo(c.x, c.y);
    ctx.lineTo(c.x + c.w, c.y);
    ctx.lineTo(c.x + c.w, c.y + c.h);
    for (let x = c.x + c.w; x > c.x; x -= dente) {
      ctx.lineTo(x - dente / 2, c.y + c.h + dente / 2);
      ctx.lineTo(x - dente, c.y + c.h);
    }
    ctx.closePath();
    ctx.fill();
  });
  const px = c.x + 56;
  const pr = c.x + c.w - 56;
  d.texto("Texto", "Comanda_mesa", "MESA 12 · SEX 20:14", { font: "etiqueta", size: 26, tracking: 60, cor: K.tinta, x: px, y: c.y + 76 });
  d.texto("Texto", "Comanda_numero", "Nº 047", { font: "numero", size: 104, cor: K.tinta, x: px, y: c.y + 190 });
  // carimbo: girado −6°, borda + contorno em Vermelho-placa (só em papel Cal)
  const cb = { cx: pr - 150, cy: c.y + 130, w: 300, h: 76 };
  d.pixel("Grafismos", "Carimbo_moldura", (ctx) => {
    ctx.translate(cb.cx, cb.cy);
    ctx.rotate((-6 * Math.PI) / 180);
    ctx.strokeStyle = K.vermelhoPlaca;
    ctx.lineWidth = 5;
    ctx.strokeRect(-cb.w / 2, -cb.h / 2, cb.w, cb.h);
    ctx.lineWidth = 2;
    ctx.strokeRect(-cb.w / 2 - 7, -cb.h / 2 - 7, cb.w + 14, cb.h + 14);
  });
  d.texto("Texto", "Carimbo_texto", "CONFIRMADO · PIX", { font: "etiqueta", size: 30, tracking: 60, cor: K.vermelhoPlaca, x: cb.cx, y: cb.cy + 11, align: "center", rot: -6 });

  const linha = (nome, y) =>
    d.pixel("Grafismos", nome, (ctx) => {
      ctx.strokeStyle = K.tinta;
      ctx.globalAlpha = 0.4;
      ctx.setLineDash([6, 8]);
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(px, y);
      ctx.lineTo(pr, y);
      ctx.stroke();
    });
  linha("Comanda_linha_1", c.y + 240);
  const itens = [
    ["2x X-Salada da casa", 7180],
    ["1x Porção de mandioca", 2400],
    ["2x Caldo de feijão", 2900],
  ];
  let y = c.y + 310;
  for (const [i, [nome, valor]] of itens.entries()) {
    d.texto("Texto", `Item${i + 1}`, nome, { size: 34, cor: K.tinta, x: px, y });
    d.texto("Texto", `Item${i + 1}_valor`, `R$ ${(valor / 100).toFixed(2).replace(".", ",")}`, { font: "numero", size: 36, cor: K.tinta, x: pr, y, align: "right" });
    y += 74;
  }
  d.texto("Texto", "Item_obs", "“sem cebolinha num deles”", { size: 28, cor: K.tinta, x: px, y: y - 18 });
  linha("Comanda_linha_2", y + 30);
  d.texto("Texto", "Total_rotulo", "TOTAL", { font: "etiqueta", size: 32, tracking: 60, cor: K.tinta, x: px, y: y + 170 });
  d.preco(12480, { x: pr, y: y + 190, size: 150, cor: K.tinta, align: "right" });

  d.cta("Link na bio", { x: S.largura / 2, y: S.altura - topo - 120, align: "center" });
  d.grade(topo);
  d.salvar();
}

// ── 6. Gera tudo ──────────────────────────────────────────────────────────────
(async () => {
  for (const dir of ["", "previews", "assets"]) fs.mkdirSync(path.join(OUT, dir), { recursive: true });
  for (const gerar of [anuncio, dica, capa, miolo, final, antesDepois, story, telaCardapio, enquete, fotoTitulo]) await gerar();
  for (const n of NOVIDADES) await novidade(n.slug, n);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
