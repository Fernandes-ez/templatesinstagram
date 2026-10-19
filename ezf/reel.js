// Reels animado da ezf.tech (1080×1920): texto entrando por palavra, escopo {  } e fio como barra de progresso.
// Só desenha: devolve uma função quadro(t) que pinta o instante t (segundos) num canvas. O ffmpeg fica em render/video.js.
const { createCanvas } = require("@napi-rs/canvas");
const G = require("./generate-templates.js");
const { K, B, quebrar, fonte, imagem } = G;

const W = 1080;
const H = 1920;
const FPS = 30;
const M = 90;
const TOPO_SEGURO = 300; // o Instagram cobre o topo e a base do Reels com a interface
const BASE_SEGURA = 1500;

const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const easeOut = (p) => 1 - Math.pow(1 - clamp(p), 3);
const easeInOut = (p) => (p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2);

/** Linha do tempo: cada cena dura conforme a quantidade de palavras; o cartão final fecha. */
function linhaDoTempo(cenas) {
  const palavras = (c) => `${c.texto} ${c.apoio || ""}`.trim().split(/\s+/).length;
  let t = 0.6; // respiro para o escopo abrir
  const lista = cenas.map((c, i) => {
    const dur = clamp(1.6 + palavras(c) * 0.32, 2.4, 4.6);
    const cena = { ...c, i, t0: t, dur, gancho: i === 0 };
    t += dur;
    return cena;
  });
  const fim = { t0: t, dur: 2.8 };
  return { cenas: lista, fim, duracao: fim.t0 + fim.dur };
}

function desenharTexto(ctx, linhas, { x, y, size, lead, tracking, t, t0, atraso = 0.07, saida = null, fontePadrao }) {
  // y = linha de base da 1ª linha. Cada palavra sobe e aparece em sequência.
  let n = 0;
  linhas.forEach((l, li) => {
    let cx = x;
    const { palavras } = l;
    palavras.forEach((pecas, k) => {
      const p = easeOut((t - t0 - n * atraso) / 0.5);
      const q = saida === null ? 0 : easeInOut((t - saida) / 0.35);
      const alpha = clamp(p) * (1 - clamp(q));
      if (alpha > 0.001) {
        const dy = (1 - clamp(p)) * 46 - clamp(q) * 30;
        ctx.save();
        ctx.globalAlpha = alpha;
        for (const c of pecas) {
          fonte(ctx, c.font, size, tracking);
          ctx.fillStyle = c.cor;
          ctx.fillText(c.t, cx, y + li * lead + dy);
          cx += ctx.measureText(c.t).width;
        }
        ctx.restore();
      } else {
        for (const c of pecas) {
          fonte(ctx, c.font, size, tracking);
          cx += ctx.measureText(c.t).width;
        }
      }
      fonte(ctx, "semi", size, tracking);
      if (k < palavras.length - 1) cx += ctx.measureText(" ").width;
      n++;
    });
  });
}

function chave(ctx, { x, y, h, dir, cor, sw, prog }) {
  // desenha a chave aos poucos (traço que cresce)
  const s = h / 400;
  const P = new (require("@napi-rs/canvas").Path2D)(B.chaveD);
  if (prog <= 0.01) return;
  ctx.save();
  ctx.translate(x + (dir < 0 ? 100 * s : 0), y);
  ctx.scale(dir * s, s);
  ctx.strokeStyle = cor;
  ctx.lineWidth = sw / s;
  ctx.lineCap = "round";
  const total = 620; // comprimento aproximado do traço no espaço 100×400
  ctx.setLineDash([total * clamp(prog), total * 2]);
  ctx.stroke(P);
  ctx.restore();
}

/**
 * @param {{cenas:{texto:string, apoio?:string, etiqueta?:string}[], cta?:string}} dados
 * @returns {{largura, altura, fps, duracao, quadro:(t:number, ctx?)=>Buffer}}
 */
async function reelAnimado({ cenas, cta = "Me chama no WhatsApp" }) {
  const tl = linhaDoTempo(cenas);
  const logo = await imagem(B.logo.monoNevoa);
  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext("2d");
  const hl = K.ambar;

  const lay = (cena) => {
    const size = cena.gancho ? 124 : 108;
    const lead = Math.round(size * 1.04);
    const { linhas } = quebrar(cena.texto, { font: "semi", size, tracking: -30, w: W - M - (M + 120), destaque: hl, cor: K.nevoa });
    return { size, lead, linhas };
  };
  const layouts = tl.cenas.map(lay);

  function quadro(t) {
    const fimT = tl.fim.t0;
    // fundo
    ctx.globalAlpha = 1;
    ctx.fillStyle = K.tinta;
    ctx.fillRect(0, 0, W, H);

    // escopo { }: abre no começo, fecha no cartão final
    const abre = easeOut(t / 0.9);
    const fecha = easeOut((t - (fimT - 0.2)) / 0.7);
    const grande = 1500;
    const e = grande / 400;
    chave(ctx, { x: 34 - 6 * e, y: (H - grande) / 2, h: grande, dir: 1, cor: K.violeta, sw: 9, prog: abre });
    chave(ctx, { x: W - 34 - 94 * e, y: (H - grande) / 2, h: grande, dir: -1, cor: K.violeta, sw: 9, prog: fecha });

    // fio: barra de progresso (o ponto âmbar corre até o fim)
    const x0 = 260;
    const x1 = W - 260;
    const yf = 250;
    ctx.save();
    ctx.strokeStyle = K.lilas;
    ctx.globalAlpha = 0.6 * abre;
    ctx.lineWidth = 4;
    ctx.lineCap = "round";
    ctx.setLineDash([0.1, 16]);
    ctx.beginPath();
    ctx.moveTo(x0, yf);
    ctx.lineTo(x1, yf);
    ctx.stroke();
    ctx.restore();
    ctx.fillStyle = K.ambar;
    ctx.beginPath();
    ctx.arc(x0 + (x1 - x0) * clamp(t / tl.duracao), yf, 12, 0, Math.PI * 2);
    ctx.fill();

    // cenas
    for (const c of tl.cenas) {
      if (t < c.t0 || t > c.t0 + c.dur + 0.05) continue;
      const { size, lead, linhas } = layouts[c.i];
      const saida = c.t0 + c.dur - 0.35;
      const altura = linhas.length * lead;
      const base = Math.round(TOPO_SEGURO + (BASE_SEGURA - TOPO_SEGURO) / 2 - altura / 2 + size * 0.8);
      if (c.etiqueta) {
        ctx.save();
        const p = easeOut((t - c.t0) / 0.5);
        const q = easeInOut((t - saida) / 0.35);
        ctx.globalAlpha = clamp(p) * (1 - clamp(q));
        fonte(ctx, "mono", 32, 20);
        ctx.fillStyle = K.lilas;
        ctx.fillText(c.etiqueta.toLowerCase(), M + 120, base - size - 30 - (1 - clamp(p)) * 20);
        ctx.restore();
      }
      desenharTexto(ctx, linhas, { x: M + 120, y: base, size, lead, tracking: -30, t, t0: c.t0 + 0.1, saida });
      if (c.apoio) {
        const aP = easeOut((t - (c.t0 + 0.9)) / 0.5);
        const q = easeInOut((t - saida) / 0.35);
        const ap = quebrar(c.apoio, { font: "regular", size: 44, tracking: 0, w: W - M - (M + 120), destaque: hl, cor: K.nevoaApagada });
        ctx.save();
        ctx.globalAlpha = clamp(aP) * (1 - clamp(q));
        ap.linhas.forEach((l, li) => {
          let cx = M + 120;
          for (const pecas of l.palavras) {
            for (const p of pecas) {
              fonte(ctx, p.font, 44, 0);
              ctx.fillStyle = p.cor;
              ctx.fillText(p.t, cx, base + (linhas.length - 1) * lead + 96 + li * 62 + (1 - clamp(aP)) * 24);
              cx += ctx.measureText(p.t).width;
            }
            fonte(ctx, "regular", 44, 0);
            cx += ctx.measureText(" ").width;
          }
        });
        ctx.restore();
      }
    }

    // cartão final: cortina Violeta sobe, logo mono, CTA e endereço
    const cort = easeInOut((t - (fimT - 0.15)) / 0.55);
    if (cort > 0) {
      ctx.fillStyle = K.violeta;
      ctx.fillRect(0, H * (1 - cort), W, H * cort);
      chave(ctx, { x: 34 - 6 * e, y: (H - grande) / 2, h: grande, dir: 1, cor: K.nevoa, sw: 7, prog: abre * cort });
      chave(ctx, { x: W - 34 - 94 * e, y: (H - grande) / 2, h: grande, dir: -1, cor: K.nevoa, sw: 7, prog: fecha * cort });
      const p = easeOut((t - fimT - 0.35) / 0.55);
      if (p > 0) {
        ctx.save();
        ctx.globalAlpha = clamp(p);
        const lw = 520;
        const lh = (logo.height / logo.width) * lw;
        ctx.drawImage(logo, (W - lw) / 2, 760 + (1 - clamp(p)) * 30, lw, lh);
        // o botão tem de caber entre as chaves: se o texto for largo, a fonte encolhe
        fonte(ctx, "semi", 46, 0);
        const tam = Math.min(46, Math.floor((46 * 640) / ctx.measureText(cta).width));
        fonte(ctx, "semi", tam, 0);
        const bw = ctx.measureText(cta).width + 120;
        const bx = (W - bw) / 2;
        const by = 960 + (1 - clamp(p)) * 30;
        ctx.fillStyle = K.ambar;
        ctx.beginPath();
        ctx.roundRect(bx, by, bw, 118, 10);
        ctx.fill();
        ctx.fillStyle = K.tinta;
        ctx.fillText(cta, bx + 60, by + 59 + tam * 0.3);
        fonte(ctx, "mono", 34, 20);
        ctx.fillStyle = K.nevoa;
        const site = "ezf-tech.com";
        ctx.fillText(site, (W - ctx.measureText(site).width) / 2, by + 220);
        ctx.restore();
      }
    }
    return canvas.data(); // RGBA cru
  }

  return { largura: W, altura: H, fps: FPS, duracao: tl.duracao, quadro, canvas };
}

module.exports = { reelAnimado, linhaDoTempo, W, H, FPS };
