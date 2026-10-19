// Trilhas originais geradas por código (sem amostras de terceiros: uso livre). Três estilos bem diferentes:
//   calor  (Tábua) : bossa/jazz leve, 108 bpm com swing, piano elétrico, baixo caminhando, vassourinha e aro de caixa
//   pulso  (Puka)  : eletrônico pop, 120 bpm, bumbo em 4, pad serrilhado com "respiração", arpejo brilhante, palmas
//   codigo (ezf)   : tech minimalista, 92 bpm, sub grave, bips FM em ritmo euclidiano, cliques e pad escuro em Mi menor
const SR = 44100;
const TWO_PI = Math.PI * 2;
const hz = (m) => 440 * Math.pow(2, (m - 69) / 12);

function rng(seed) {
  let s = seed >>> 0 || 1;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
}
function mixer(n) {
  const L = new Float32Array(n);
  const R = new Float32Array(n);
  const add = (t0, dur, fn, pan = 0, gain = 1) => {
    const i0 = Math.max(0, Math.floor(t0 * SR));
    const len = Math.floor(dur * SR);
    const gl = Math.cos(((pan + 1) * Math.PI) / 4) * gain;
    const gr = Math.sin(((pan + 1) * Math.PI) / 4) * gain;
    for (let i = 0; i < len && i0 + i < n; i++) {
      const v = fn(i / SR, i / len);
      L[i0 + i] += v * gl;
      R[i0 + i] += v * gr;
    }
  };
  return { L, R, add };
}
const saw = (f, t, h = 6) => {
  let v = 0;
  for (let k = 1; k <= h; k++) v += Math.sin(TWO_PI * f * k * t) / k;
  return v * 0.55;
};
const sq = (f, t, h = 5) => {
  let v = 0;
  for (let k = 1; k <= h * 2; k += 2) v += Math.sin(TWO_PI * f * k * t) / k;
  return v * 0.8;
};

// ── calor: bossa leve ────────────────────────────────────────────────────────
function calor(m, dur, rand) {
  const bpm = 108;
  const beat = 60 / bpm;
  const comp = 4 * beat;
  const sw = 0.17; // swing das colcheias
  // II-V-I-vi em Ré: Em7 - A7 - Dmaj7 - Bm7 (notas MIDI), baixo (raiz, quinta, oitava, aproximação)
  const prog = [
    { c: [64, 67, 71, 74], b: [40, 47, 52, 49] },
    { c: [61, 67, 71, 76], b: [45, 52, 57, 50] },
    { c: [62, 66, 69, 73], b: [38, 45, 50, 47] },
    { c: [62, 66, 69, 74], b: [47, 54, 59, 52] },
  ];
  const ep = (t0, f, vel) =>
    m.add(t0, 1.4, (tt) => {
      const env = Math.exp(-tt * 2.6) * Math.min(1, tt / 0.003);
      const idx = 2.2 * Math.exp(-tt * 5);
      return vel * env * (Math.sin(TWO_PI * f * tt + idx * Math.sin(TWO_PI * f * tt)) + 0.25 * Math.sin(TWO_PI * f * 2 * tt) * Math.exp(-tt * 8));
    }, -0.15);
  const n = Math.ceil(dur / comp) + 1;
  for (let c = 0; c < n; c++) {
    const t = c * comp;
    const { c: acorde, b } = prog[c % 4];
    // comping (acordes curtos) em 1, 2&, 4
    for (const [off, v] of [[0, 0.16], [1.5 + sw, 0.12], [3, 0.13]]) {
      acorde.forEach((nt, j) => ep(t + off * beat + j * 0.012, hz(nt), v));
    }
    // baixo caminhando
    b.forEach((nt, j) => m.add(t + j * beat, beat * 0.95, (tt) => 0.34 * Math.exp(-tt * 3.2) * Math.min(1, tt / 0.008) * (Math.sin(TWO_PI * hz(nt) * tt) + 0.3 * Math.sin(TWO_PI * hz(nt) * 2 * tt))));
    // vassourinha: colcheias com acento no contratempo
    let prev = 0;
    for (let s = 0; s < 8; s++) {
      const off = s * 0.5 + (s % 2 ? sw * 0.5 : 0);
      m.add(t + off * beat, 0.09, (tt) => {
        const x = rand() * 2 - 1;
        const hp = x - prev;
        prev = x;
        return (s % 2 ? 0.075 : 0.04) * hp * Math.exp(-tt * 38);
      }, s % 2 ? 0.3 : -0.3);
    }
    // aro de caixa no 2& e 4, bumbo leve no 1 e 3&
    for (const off of [1.5, 3]) m.add(t + off * beat, 0.08, (tt) => 0.16 * Math.exp(-tt * 55) * (Math.sin(TWO_PI * 430 * tt) + (rand() * 2 - 1) * 0.6));
    for (const off of [0, 2.5]) m.add(t + off * beat, 0.3, (tt) => 0.38 * Math.exp(-tt * 14) * Math.sin(TWO_PI * (55 + 70 * Math.exp(-tt * 30)) * tt));
    // melodia simples (marimba) a cada 2 compassos
    if (c % 2 === 0) {
      const mel = c % 4 === 0 ? [81, 79, 76, 74] : [78, 76, 73, 76];
      mel.forEach((nt, j) => m.add(t + (j * 0.75 + 0.5) * beat, 0.7, (tt) => 0.14 * Math.exp(-tt * 6) * (Math.sin(TWO_PI * hz(nt) * tt) + 0.5 * Math.sin(TWO_PI * hz(nt) * 4 * tt) * Math.exp(-tt * 20)), 0.35));
    }
  }
  return { delay: beat * 0.75, fb: 0.18, drive: 1.1 };
}

// ── pulso: eletrônico pop ───────────────────────────────────────────────────
function pulso(m, dur, rand) {
  const bpm = 120;
  const beat = 60 / bpm;
  const comp = 4 * beat;
  const prog = [
    { c: [65, 69, 72], r: 41 }, // F
    { c: [67, 72, 76], r: 36 }, // C
    { c: [62, 65, 69], r: 38 }, // Dm
    { c: [70, 74, 77], r: 46 }, // Bb
  ];
  const duck = (tt) => 1 - 0.75 * Math.exp(-(tt % beat) / 0.11); // sidechain: respira a cada tempo
  const n = Math.ceil(dur / comp) + 1;
  for (let c = 0; c < n; c++) {
    const t = c * comp;
    const { c: ac, r } = prog[c % 4];
    ac.forEach((nt, j) => {
      const f = hz(nt);
      m.add(t, comp + 0.05, (tt) => {
        const g = Math.min(1, tt / 0.04) * Math.min(1, (comp + 0.05 - tt) / 0.08);
        return 0.11 * g * duck(t + tt - 0) * (saw(f * (1 + 0.003 * (j - 1)), tt, 7) + saw(f * 2 * (1 - 0.003 * (j - 1)), tt, 4) * 0.4);
      }, (j - 1) * 0.5);
    });
    // baixo em colcheias de contratempo
    for (let s = 0; s < 4; s++) {
      const off = s + 0.5;
      m.add(t + off * beat, beat * 0.45, (tt) => 0.3 * Math.exp(-tt * 5) * Math.min(1, tt / 0.004) * (Math.sin(TWO_PI * hz(r) * tt) + 0.5 * saw(hz(r), tt, 4)));
    }
    // bumbo em 4, palma em 2 e 4, hats em 16avos
    for (let s = 0; s < 4; s++) m.add(t + s * beat, 0.3, (tt) => 0.62 * Math.exp(-tt * 9) * Math.sin(TWO_PI * (48 + 110 * Math.exp(-tt * 32)) * tt));
    for (const s of [1, 3]) {
      for (const d of [0, 0.011, 0.024]) m.add(t + s * beat + d, 0.12, (tt) => 0.2 * Math.exp(-tt * 28) * (rand() * 2 - 1));
    }
    let prev = 0;
    for (let s = 0; s < 16; s++) {
      const aberto = s % 4 === 2;
      m.add(t + s * beat * 0.25, aberto ? 0.14 : 0.04, (tt) => {
        const x = rand() * 2 - 1;
        const hp = x - prev;
        prev = x;
        return (aberto ? 0.07 : 0.035) * hp * Math.exp(-tt * (aberto ? 22 : 90));
      }, s % 2 ? 0.25 : -0.25);
    }
    // arpejo brilhante em 16avos (sobe e desce), filtro "abrindo" ao longo do compasso
    const pat = [0, 1, 2, 1, 0, 1, 2, 1, 0, 2, 1, 2, 0, 1, 2, 1];
    for (let s = 0; s < 16; s++) {
      const nt = ac[pat[s]] + (s % 8 < 4 ? 12 : 24);
      const f = hz(nt);
      const bright = 0.4 + 0.6 * (s / 16);
      m.add(t + s * beat * 0.25, 0.22, (tt) => 0.11 * Math.exp(-tt * 14) * Math.min(1, tt / 0.002) * (sq(f, tt, 2 + Math.round(bright * 2))), s % 2 ? 0.45 : -0.45);
    }
  }
  return { delay: beat * 0.75, fb: 0.24, drive: 1.35 };
}

// ── codigo: tech minimalista ────────────────────────────────────────────────
function euclides(passos, pulsos) {
  const r = [];
  let acc = 0;
  for (let i = 0; i < passos; i++) {
    acc += pulsos;
    if (acc >= passos) (acc -= passos), r.push(1);
    else r.push(0);
  }
  return r;
}
function codigo(m, dur, rand) {
  const bpm = 92;
  const beat = 60 / bpm;
  const comp = 4 * beat;
  const raizes = [40, 40, 36, 43]; // Mi, Mi, Dó, Sol (baixo)
  const pads = [[52, 59, 64], [52, 59, 64], [48, 55, 64], [55, 62, 67]];
  const penta = [64, 67, 69, 71, 74, 76, 79]; // Mi menor pentatônica estendida
  const ritmo = euclides(16, 5);
  const n = Math.ceil(dur / comp) + 1;
  for (let c = 0; c < n; c++) {
    const t = c * comp;
    // pad escuro e lento
    pads[c % 4].forEach((nt, j) => {
      const f = hz(nt);
      m.add(t, comp + 1.2, (tt) => {
        const g = Math.min(1, tt / 1.2) * Math.min(1, (comp + 1.2 - tt) / 1.2);
        return 0.07 * g * (Math.sin(TWO_PI * f * tt) + 0.5 * Math.sin(TWO_PI * f * 1.004 * tt) + 0.2 * Math.sin(TWO_PI * f * 3 * tt));
      }, (j - 1) * 0.6);
    });
    // sub grave sustentado
    const rf = hz(raizes[c % 4]);
    m.add(t, comp * 0.98, (tt) => 0.36 * Math.min(1, tt / 0.03) * Math.min(1, (comp * 0.98 - tt) / 0.12) * Math.sin(TWO_PI * rf * tt));
    // bumbo seco em 1 e fantasma sincopado
    for (const [off, v] of [[0, 0.5], [2.75, 0.22]]) m.add(t + off * beat, 0.22, (tt) => v * Math.exp(-tt * 18) * Math.sin(TWO_PI * (40 + 70 * Math.exp(-tt * 45)) * tt));
    // cliques (hats mínimos) em 16avos, alguns ficam de fora
    let prev = 0;
    for (let s = 0; s < 16; s++) {
      if (rand() < 0.28) continue;
      m.add(t + s * beat * 0.25, 0.025, (tt) => {
        const x = rand() * 2 - 1;
        const hp = x - prev;
        prev = x;
        return (s % 4 === 0 ? 0.09 : 0.055) * hp * Math.exp(-tt * 160);
      }, rand() * 1.2 - 0.6);
    }
    // bips FM em ritmo euclidiano (5 em 16), notas da pentatônica
    for (let s = 0; s < 16; s++) {
      if (!ritmo[(s + c * 3) % 16]) continue;
      const nt = penta[Math.floor(rand() * penta.length)];
      const f = hz(nt);
      m.add(t + s * beat * 0.25, 0.28, (tt) => {
        const env = Math.exp(-tt * 14) * Math.min(1, tt / 0.002);
        return 0.17 * env * Math.sin(TWO_PI * f * tt + 3.2 * Math.exp(-tt * 28) * Math.sin(TWO_PI * f * 3.01 * tt));
      }, rand() * 1.4 - 0.7);
    }
  }
  return { delay: beat * 0.75, fb: 0.34, drive: 1.0 };
}

const ESTILOS = { calor, pulso, codigo };

/** Devolve um WAV estéreo 16 bits com `duracao` segundos. */
function gerarMusica({ duracao, estilo = "pulso", seed = 7 }) {
  const fn = ESTILOS[estilo] || ESTILOS.pulso;
  const n = Math.ceil(duracao * SR);
  const m = mixer(n);
  const cfg = fn(m, duracao, rng(seed));
  const { L, R } = m;
  // eco ping-pong
  const atraso = Math.floor(cfg.delay * SR);
  for (let i = atraso; i < n; i++) {
    L[i] += cfg.fb * R[i - atraso];
    R[i] += cfg.fb * L[i - atraso];
  }
  let pico = 0;
  for (let i = 0; i < n; i++) pico = Math.max(pico, Math.abs(L[i]), Math.abs(R[i]));
  const ganho = pico > 0 ? 0.8 / pico : 1;
  const fadeIn = Math.floor(0.4 * SR);
  const fadeOut = Math.floor(1.8 * SR);
  const buf = Buffer.alloc(44 + n * 4);
  buf.write("RIFF", 0); buf.writeUInt32LE(36 + n * 4, 4); buf.write("WAVEfmt ", 8); buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20); buf.writeUInt16LE(2, 22);
  buf.writeUInt32LE(SR, 24); buf.writeUInt32LE(SR * 4, 28); buf.writeUInt16LE(4, 32); buf.writeUInt16LE(16, 34); buf.write("data", 36); buf.writeUInt32LE(n * 4, 40);
  for (let i = 0; i < n; i++) {
    const f = Math.min(1, i / fadeIn) * Math.min(1, (n - i) / fadeOut);
    const l = Math.tanh(L[i] * ganho * cfg.drive) * f;
    const r = Math.tanh(R[i] * ganho * cfg.drive) * f;
    buf.writeInt16LE(Math.round(Math.max(-1, Math.min(1, l)) * 32767 * 0.9), 44 + i * 4);
    buf.writeInt16LE(Math.round(Math.max(-1, Math.min(1, r)) * 32767 * 0.9), 46 + i * 4);
  }
  return buf;
}

module.exports = { gerarMusica, ESTILOS };
