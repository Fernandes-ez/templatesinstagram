// Reels animado da Puka ("A Deixa"): corte seco, haste que cresce, linha de passagem como barra de progresso
// (reta azul = a IA, lacuna, curva laranja = a pessoa) e o símbolo gigante no cartão final.
const path = require("node:path");
const fs = require("node:fs");
const { createCanvas, GlobalFonts, Path2D, loadImage } = require("@napi-rs/canvas");
const { Resvg } = require("@resvg/resvg-js");
const B = require("./brand.config.js");
const R = require("../render/reel-base.js");
const { W, H, FPS, clamp, easeOut, easeInOut } = R;

const K = B.cores;
const FAM = {};
for (const [k, f] of Object.entries(B.fontes)) {
  GlobalFonts.registerFromPath(f.arquivo, `PukaReel_${k}`);
  FAM[k] = `PukaReel_${k}`;
}
const HASTE = new Path2D(B.simbolo.hasteD);
const DEIXA = new Path2D(B.simbolo.deixaD);
const M = 90;
const X = M + 52; // o texto fica à direita da haste

async function svg(arquivo, largura) {
  return loadImage(new Resvg(fs.readFileSync(arquivo, "utf8"), { fitTo: { mode: "width", value: Math.round(largura * 2) } }).render().asPng());
}
const fonte = (ctx, f, size, tracking = 0) => {
  ctx.font = `${size}px ${FAM[f]}`;
  ctx.letterSpacing = `${(tracking / 1000) * size}px`;
};

/** Onda feita à mão (a pessoa): de (x0, y) a (x1, y), mostrada até `prog`. */
function onda(ctx, x0, x1, y, prog, cor) {
  const n = 60;
  ctx.strokeStyle = cor;
  ctx.lineWidth = 9;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.beginPath();
  for (let i = 0; i <= n * clamp(prog); i++) {
    const u = i / n;
    const px = x0 + (x1 - x0) * u;
    const py = y + Math.sin(u * Math.PI * 5) * 12 * (1 - u * 0.4) - Math.sin(u * Math.PI * 11) * 3;
    i ? ctx.lineTo(px, py) : ctx.moveTo(px, py);
  }
  ctx.stroke();
}

async function reelAnimado({ cenas, cta = "Teste grátis no link da bio", site = "pukacrm.com.br" }) {
  const tl = R.linhaDoTempo(cenas);
  const logoNeg = await svg(B.logo.principalNegativo, 460);
  const lw = 460;
  const lh = (logoNeg.height / logoNeg.width) * lw;
  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext("2d");

  const dark = (i) => i % 2 === 1; // alterna dia e noite: Roteiro, Coxia, Roteiro...
  const lay = tl.cenas.map((c) => {
    const size = c.gancho ? 118 : 104;
    const lead = Math.round(size * 1.02);
    fonte(ctx, "display", size, -12);
    const esp = ctx.measureText(" ").width;
    const palavras = R.palavrasDe(c.texto);
    const linhas = R.quebrarEmLinhas(palavras, (p) => ctx.measureText(p.t).width, esp, W - M - X);
    return { size, lead, linhas, esp };
  });

  function quadro(t) {
    const fimT = tl.fim.t0;
    // fundo da cena atual, com corte seco da próxima (uma cortina que anda da esquerda para a direita)
    const atual = clamp(tl.cenas.findIndex((c) => t < c.t0 + c.dur), -1, 99);
    const idx = atual === -1 ? tl.cenas.length - 1 : atual;
    const cor = (i) => (dark(i) ? K.coxia : K.roteiro);
    ctx.globalAlpha = 1;
    ctx.fillStyle = cor(idx);
    ctx.fillRect(0, 0, W, H);
    // cortina que entra
    const c = tl.cenas[idx];
    const entra = easeInOut((t - c.t0 + 0.05) / 0.4);
    if (idx > 0 && entra < 1) {
      ctx.fillStyle = cor(idx - 1);
      ctx.fillRect(W * clamp(entra), 0, W, H);
    }
    const escuro = dark(idx);
    const tinta = escuro ? K.roteiro : K.coxia;

    // linha de passagem: reta azul (IA), lacuna, curva laranja (pessoa) = progresso do vídeo
    const y = 250;
    const x0 = M;
    const x1 = W - M;
    const p = clamp(t / tl.duracao);
    const reto = 0.55;
    ctx.strokeStyle = escuro ? K.pontoClaro : K.ponto;
    ctx.lineWidth = 7;
    ctx.lineCap = "butt";
    ctx.beginPath();
    ctx.moveTo(x0, y);
    ctx.lineTo(x0 + (x1 - x0) * Math.min(p, reto), y);
    ctx.stroke();
    const lac = 16;
    const xc = x0 + (x1 - x0) * reto + lac;
    if (p > reto) onda(ctx, xc, x1, y, (p - reto) / (1 - reto), escuro ? K.ribaltaAcesa : K.ribalta);

    // cenas
    for (const cn of tl.cenas) {
      if (t < cn.t0 || t > cn.t0 + cn.dur + 0.05) continue;
      const { size, lead, linhas } = lay[cn.i];
      const sai = easeInOut((t - (cn.t0 + cn.dur - 0.3)) / 0.3);
      const alphaCena = 1 - clamp(sai);
      const altura = linhas.length * lead;
      const base = Math.round(R.TOPO_SEGURO + (R.BASE_SEGURA - R.TOPO_SEGURO) / 2 - altura / 2 + size * 0.8);
      // haste: barra de marcador que cresce de baixo para cima
      const hp = easeOut((t - cn.t0 - 0.05) / 0.5);
      ctx.globalAlpha = alphaCena;
      ctx.fillStyle = tinta;
      const hh = (altura + (cn.apoio ? 150 : 40)) * hp;
      ctx.fillRect(M, base - size + altura + (cn.apoio ? 130 : 20) - hh + 0, 22, hh);
      // etiqueta
      if (cn.etiqueta) {
        const ep = easeOut((t - cn.t0 - 0.1) / 0.4);
        ctx.globalAlpha = alphaCena * clamp(ep);
        fonte(ctx, "monoMedium", 30, 40);
        ctx.fillStyle = escuro ? K.ribaltaAcesa : K.ribaltaFunda;
        ctx.fillText(cn.etiqueta.toUpperCase(), X, base - size - 34);
      }
      // título: cada palavra sobe e aparece
      let n = 0;
      fonte(ctx, "display", size, -12);
      lay[cn.i].linhas.forEach((l, li) => {
        let cx = X;
        for (const pal of l) {
          const wp = easeOut((t - cn.t0 - 0.15 - n * 0.07) / 0.45);
          ctx.globalAlpha = alphaCena * clamp(wp);
          ctx.fillStyle = pal.hl ? (escuro ? K.ribaltaAcesa : K.ribalta) : tinta;
          ctx.fillText(pal.t, cx, base + li * lead + (1 - clamp(wp)) * 40);
          cx += ctx.measureText(pal.t).width + lay[cn.i].esp;
          n++;
        }
      });
      // apoio
      if (cn.apoio) {
        const ap = easeOut((t - cn.t0 - 0.95) / 0.5);
        ctx.globalAlpha = alphaCena * clamp(ap);
        fonte(ctx, "corpo", 44, 0);
        ctx.fillStyle = escuro ? K.roteiro : K.bastidor;
        const esp = ctx.measureText(" ").width;
        const ls = R.quebrarEmLinhas(R.palavrasDe(cn.apoio), (q) => ctx.measureText(q.t).width, esp, W - M - X);
        ls.forEach((l, li) => ctx.fillText(l.map((q) => q.t).join(" "), X, base + (linhas.length - 1) * lead + 100 + li * 62 + (1 - clamp(ap)) * 24));
      }
      ctx.globalAlpha = 1;
    }

    // cartão final: Coxia, símbolo gigante (haste + deixa) sangrando à direita, logo e botão
    const cort = easeInOut((t - (fimT - 0.1)) / 0.5);
    if (cort > 0) {
      ctx.globalAlpha = 1;
      ctx.fillStyle = K.coxia;
      ctx.fillRect(0, 0, W * clamp(cort), H);
      const q = easeOut((t - fimT - 0.2) / 0.7);
      if (q > 0) {
        const alt = 880;
        const s = alt / B.simbolo.box.h;
        const sx = 470;
        const sy = 300;
        ctx.save();
        ctx.translate(sx - B.simbolo.box.x * s, sy + alt);
        ctx.scale(s, -s);
        ctx.save();
        ctx.beginPath();
        ctx.rect(0, 0, 2000, B.simbolo.box.h * clamp(q)); // a haste cresce de baixo para cima
        ctx.clip();
        ctx.fillStyle = K.roteiro;
        ctx.fill(HASTE);
        ctx.restore();
        ctx.globalAlpha = clamp((q - 0.4) / 0.6);
        ctx.fillStyle = K.ribaltaAcesa;
        ctx.fill(DEIXA);
        ctx.restore();
        ctx.globalAlpha = clamp(easeOut((t - fimT - 0.5) / 0.5));
        ctx.drawImage(logoNeg, M, 1230, lw, lh);
        fonte(ctx, "corpoBold", 42, 0);
        const bw = Math.min(W - 2 * M, ctx.measureText(cta).width + 112);
        const by = 1230 + lh + 50;
        ctx.fillStyle = K.ribaltaFunda;
        ctx.fillRect(M, by, bw, 112);
        ctx.fillStyle = K.roteiro;
        ctx.fillText(cta, M + 56, by + 72);
        fonte(ctx, "mono", 30, 40);
        ctx.fillStyle = K.roteiro;
        ctx.fillText(site, M, by + 112 + 70);
        ctx.globalAlpha = 1;
      }
    }
    return canvas.data();
  }
  return { largura: W, altura: H, fps: FPS, duracao: tl.duracao, quadro, canvas };
}

module.exports = { reelAnimado };
