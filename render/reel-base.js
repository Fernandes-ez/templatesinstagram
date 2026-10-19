// Peças comuns dos Reels animados de todas as marcas (sem dependências): tempo, easing e quebra de palavras.
const W = 1080;
const H = 1920;
const FPS = 30;
const TOPO_SEGURO = 300; // o Instagram cobre o topo e a base do Reels com a interface
const BASE_SEGURA = 1500;

const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const easeOut = (p) => 1 - Math.pow(1 - clamp(p), 3);
const easeInOut = (p) => (p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2);
const overshoot = (p) => {
  const c1 = 1.70158;
  const x = clamp(p) - 1;
  return 1 + (c1 + 1) * x * x * x + c1 * x * x;
};

/** Cada cena dura conforme a quantidade de palavras; o cartão final fecha. */
function linhaDoTempo(cenas, { inicio = 0.6, fim = 2.8 } = {}) {
  const palavras = (c) => `${c.texto} ${c.apoio || ""}`.trim().split(/\s+/).length;
  let t = inicio;
  const lista = cenas.map((c, i) => {
    const dur = clamp(1.6 + palavras(c) * 0.32, 2.4, 4.6);
    const cena = { ...c, i, t0: t, dur, gancho: i === 0 };
    t += dur;
    return cena;
  });
  return { cenas: lista, fim: { t0: t, dur: fim }, duracao: t + fim };
}

/** "Seu site {perde} cliente" → [{t:"Seu"},{t:"site"},{t:"perde",hl:true},{t:"cliente"}]. */
function palavrasDe(str) {
  let dentro = false;
  return String(str)
    .split(/\s+/)
    .filter(Boolean)
    .map((bruto) => {
      if (bruto.includes("{")) dentro = true;
      const fecha = bruto.includes("}");
      const r = { t: bruto.replace(/[{}]/g, ""), hl: dentro };
      if (fecha) dentro = false;
      return r;
    });
}

/** Quebra em linhas pela largura. `largura(palavra)` mede a palavra já com a fonte escolhida; `espaco` é a largura do espaço. */
function quebrarEmLinhas(palavras, largura, espaco, maxW) {
  const linhas = [];
  let atual = [];
  let w = 0;
  for (const p of palavras) {
    const pw = largura(p);
    if (atual.length && w + espaco + pw > maxW) (linhas.push(atual), (atual = []), (w = 0));
    w += (atual.length ? espaco : 0) + pw;
    atual.push(p);
  }
  if (atual.length) linhas.push(atual);
  return linhas;
}

module.exports = { W, H, FPS, TOPO_SEGURO, BASE_SEGURA, clamp, easeOut, easeInOut, overshoot, linhaDoTempo, palavrasDe, quebrarEmLinhas };
