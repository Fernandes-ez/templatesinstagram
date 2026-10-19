// Reels animado da Tábua ("Letreiro"): título em Anybody com sombra solta, faixa em V, azulejo de fundo,
// barra de progresso em forma de faixa e cartão final em Cal com logo, gesto e botão de placa.
const fs = require("node:fs");
const { createCanvas, GlobalFonts, Path2D, loadImage } = require("@napi-rs/canvas");
const { Resvg } = require("@resvg/resvg-js");
const B = require("./brand.config.js");
const R = require("../render/reel-base.js");
const { W, H, FPS, clamp, easeOut, easeInOut, overshoot } = R;

const K = B.cores;
const FAM = {};
for (const [k, f] of Object.entries(B.fontes)) {
  GlobalFonts.registerFromPath(f.arquivo, `TabuaReel_${k}`);
  FAM[k] = `TabuaReel_${k}`;
}
const M = 90;
const lerSvg = (f) => fs.readFileSync(f, "utf8");
const png = (svg, largura) => loadImage(new Resvg(svg, { fitTo: { mode: "width", value: Math.round(largura * 2) } }).render().asPng());
const fonte = (ctx, f, size, tracking = 0) => {
  ctx.font = `${size}px ${FAM[f]}`;
  ctx.letterSpacing = `${(tracking / 1000) * size}px`;
};
const GESTO_D = lerSvg(B.padrao.verde).match(/<path d="([^"]+)"/)[1];
const GESTO_BOX = { x: 82, y: -196, w: 112, h: 108 };

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

async function reelAnimado({ cenas, cta = "Teste grátis", site = "tabua.app.br" }) {
  const tl = R.linhaDoTempo(cenas);
  const logoNeg = await png(lerSvg(B.logo.principalNegativo), 680);
  const ladrilho = await png(lerSvg(B.padrao.verde), 140);
  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext("2d");

  // fundo azulejo (o ladrilho já traz o verde-boteco), desenhado uma vez
  const fundo = createCanvas(W, H);
  {
    const g = fundo.getContext("2d");
    for (let ty = 0; ty < H; ty += 140) for (let tx = -70; tx < W; tx += 140) g.drawImage(ladrilho, tx, ty, 140, 140);
  }

  const lay = tl.cenas.map((c) => {
    const size = c.gancho ? 128 : 112;
    const lead = Math.round(size * 0.96);
    fonte(ctx, "display", size, 34);
    const esp = ctx.measureText(" ").width;
    const linhas = R.quebrarEmLinhas(R.palavrasDe(c.texto.toUpperCase() === c.texto ? c.texto : c.texto), (p) => ctx.measureText(p.t).width, esp, W - 2 * M);
    return { size, lead, linhas, esp };
  });

  function faixa(str, x, y, altura, prog, cor, corTexto) {
    const size = Math.round(altura / 2.1);
    fonte(ctx, "etiqueta", size, 60);
    const w = ctx.measureText(str.toUpperCase()).width + 2 * 1.3 * size;
    ctx.save();
    ctx.beginPath();
    ctx.rect(x, y - 2, w * clamp(prog) + 2, altura + 4); // a faixa se desenrola da esquerda
    ctx.clip();
    ctx.fillStyle = cor;
    ctx.fill(faixaPath(x, y, w, altura));
    ctx.fillStyle = corTexto;
    ctx.fillText(str.toUpperCase(), x + 1.3 * size, y + altura / 2 + size * 0.36);
    ctx.restore();
  }

  function quadro(t) {
    const fimT = tl.fim.t0;
    ctx.globalAlpha = 1;
    ctx.drawImage(fundo, 0, 0);

    // progresso: uma faixa amarela que cresce
    const pw = Math.max(40, (W - 2 * M) * clamp(t / tl.duracao));
    ctx.fillStyle = K.amareloOvo;
    ctx.fill(faixaPath(M, 238, pw, 28));

    for (const c of tl.cenas) {
      if (t < c.t0 || t > c.t0 + c.dur + 0.05) continue;
      const { size, lead, linhas, esp } = lay[c.i];
      const sai = easeInOut((t - (c.t0 + c.dur - 0.3)) / 0.3);
      const a = 1 - clamp(sai);
      const altura = linhas.length * lead;
      const base = Math.round(R.TOPO_SEGURO + (R.BASE_SEGURA - R.TOPO_SEGURO) / 2 - altura / 2 + size * 0.8);
      const off = Math.max(4, Math.round(altura * B.sombraSolta));
      if (c.etiqueta) {
        ctx.globalAlpha = a;
        faixa(c.etiqueta, M, base - size - 90, 64, easeOut((t - c.t0 - 0.05) / 0.45), K.amareloOvo, K.tinta);
      }
      // título de letreiro: sombra solta em Amarelo-ovo e respiro em Verde, palavra por palavra
      fonte(ctx, "display", size, 34);
      let n = 0;
      linhas.forEach((l, li) => {
        let cx = M;
        for (const pal of l) {
          const p = (t - c.t0 - 0.12 - n * 0.08) / 0.5;
          const dy = (1 - clamp(overshoot(p))) * 70;
          ctx.globalAlpha = a * clamp(p * 2.2);
          const y = base + li * lead + dy;
          ctx.fillStyle = K.amareloOvo;
          ctx.fillText(pal.t, cx + off, y + off);
          ctx.lineJoin = "round";
          ctx.strokeStyle = K.verdeBoteco;
          ctx.lineWidth = Math.max(2, Math.round(off * 0.55)) * 2;
          ctx.strokeText(pal.t, cx, y);
          ctx.fillStyle = pal.hl ? K.amareloOvo : K.cal;
          ctx.fillText(pal.t, cx, y);
          cx += ctx.measureText(pal.t).width + esp;
          n++;
        }
      });
      if (c.apoio) {
        const ap = easeOut((t - c.t0 - 0.95) / 0.5);
        ctx.globalAlpha = a * clamp(ap);
        fonte(ctx, "corpo", 46, 0);
        ctx.fillStyle = K.cal;
        const sp = ctx.measureText(" ").width;
        const ls = R.quebrarEmLinhas(R.palavrasDe(c.apoio), (q) => ctx.measureText(q.t).width, sp, W - 2 * M);
        ls.forEach((l, li) => ctx.fillText(l.map((q) => q.t).join(" "), M, base + (linhas.length - 1) * lead + 110 + li * 64 + (1 - clamp(ap)) * 24));
      }
      ctx.globalAlpha = 1;
    }

    // cartão final: continua no Verde-boteco com azulejo; logo em negativo, botão de placa e endereço
    const cort = easeInOut((t - (fimT - 0.1)) / 0.5);
    if (cort > 0) {
      ctx.globalAlpha = 1;
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, H * (1 - cort), W, H * cort); // uma cortina sobe e troca o fundo, sem mudar de cor
      ctx.clip();
      ctx.drawImage(fundo, 0, 0);
      ctx.restore();
      const p2 = easeOut((t - fimT - 0.3) / 0.6);
      if (p2 > 0) {
        const lw = 680;
        const lh = (logoNeg.height / logoNeg.width) * lw;
        const y0 = 760 + (1 - clamp(p2)) * 40;
        ctx.globalAlpha = clamp(p2);
        ctx.drawImage(logoNeg, (W - lw) / 2, y0, lw, lh);
        const p3 = easeOut((t - fimT - 0.85) / 0.5);
        ctx.globalAlpha = clamp(p3);
        fonte(ctx, "corpoBold", 44, 0);
        const bw = Math.min(W - 2 * M, ctx.measureText(cta).width + 112);
        const bx = (W - bw) / 2;
        const by = y0 + lh + 70 + (1 - clamp(p3)) * 24;
        ctx.fillStyle = K.amareloOvo;
        ctx.fill(placaPath(bx, by, bw, 116));
        ctx.fillStyle = K.tinta;
        ctx.fillText(cta, bx + 56, by + 116 / 2 + 15);
        fonte(ctx, "corpo", 38, 0);
        ctx.fillStyle = K.cal;
        ctx.fillText(site, (W - ctx.measureText(site).width) / 2, by + 190);
        ctx.globalAlpha = 1;
      }
    }
    return canvas.data();
  }
  return { largura: W, altura: H, fps: FPS, duracao: tl.duracao, quadro, canvas };
}

module.exports = { reelAnimado };
