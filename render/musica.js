// Trilha original gerada por código (sem amostras de terceiros: uso livre). Estilo: lo-fi eletrônico leve.
// Estilos: "suave" (lo-fi, 84 bpm), "pulso" (tech, 100 bpm), "brisa" (ambiente, 72 bpm).
const SR = 44100;

const ESTILOS = {
  suave: { bpm: 84, swing: 0.1, acordes: [[57, 60, 64, 67], [53, 57, 60, 64], [48, 52, 55, 59], [55, 59, 62, 65]], baixo: [45, 41, 36, 43], arp: [0, 2, 1, 3, 2, 1, 3, 2], kick: [0, 2.5], snare: [1, 3], hat: true, pad: 0.16, arpVol: 0.2 },
  pulso: { bpm: 100, swing: 0, acordes: [[57, 60, 64], [55, 59, 62], [53, 57, 60], [55, 59, 62]], baixo: [45, 43, 41, 43], arp: [0, 1, 2, 1, 0, 2, 1, 2], kick: [0, 1, 2, 3], snare: [1, 3], hat: true, pad: 0.1, arpVol: 0.24 },
  brisa: { bpm: 72, swing: 0, acordes: [[60, 64, 67, 71], [57, 60, 64, 67], [53, 57, 60, 64], [55, 59, 62, 67]], baixo: [48, 45, 41, 43], arp: [0, 3, 1, 2, 0, 3, 2, 1], kick: [], snare: [], hat: false, pad: 0.22, arpVol: 0.14 },
};

const hz = (m) => 440 * Math.pow(2, (m - 69) / 12);
function rng(seed) {
  let s = seed >>> 0 || 1;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
}

/** Devolve um WAV estéreo 16 bits com `duracao` segundos. */
function gerarMusica({ duracao, estilo = "suave", seed = 7 }) {
  const E = ESTILOS[estilo] || ESTILOS.suave;
  const n = Math.ceil(duracao * SR);
  const L = new Float32Array(n);
  const R = new Float32Array(n);
  const rand = rng(seed);
  const beat = 60 / E.bpm;
  const compasso = 4 * beat;

  const add = (t0, dur, fn, pan = 0) => {
    const i0 = Math.floor(t0 * SR);
    const len = Math.floor(dur * SR);
    const gl = Math.cos(((pan + 1) * Math.PI) / 4);
    const gr = Math.sin(((pan + 1) * Math.PI) / 4);
    for (let i = 0; i < len && i0 + i < n; i++) {
      const v = fn(i / SR, i / len);
      L[i0 + i] += v * gl;
      R[i0 + i] += v * gr;
    }
  };

  const nCompassos = Math.ceil(duracao / compasso) + 1;
  for (let c = 0; c < nCompassos; c++) {
    const t = c * compasso;
    const k = c % E.acordes.length;
    const acorde = E.acordes[k];
    // pad: seno com leve desafinação, ataque e soltura lentos
    for (const [j, m] of acorde.entries()) {
      const f = hz(m);
      const det = 1 + (j - 1.5) * 0.0016;
      add(t, compasso + 0.6, (tt, p) => {
        const env = Math.min(1, tt / 0.5) * Math.min(1, (compasso + 0.6 - tt) / 0.6);
        return E.pad * 0.5 * env * (Math.sin(2 * Math.PI * f * det * tt) + 0.35 * Math.sin(4 * Math.PI * f * tt + j));
      }, (j - 1.5) * 0.35);
    }
    // baixo: duas notas por compasso
    for (const off of [0, 2]) {
      const f = hz(E.baixo[k]);
      add(t + off * beat, beat * 1.9, (tt) => 0.3 * Math.exp(-tt * 1.6) * Math.min(1, tt / 0.01) * (Math.sin(2 * Math.PI * f * tt) + 0.2 * Math.sin(4 * Math.PI * f * tt)));
    }
    // arpejo (pluck) em colcheias
    for (let s = 0; s < 8; s++) {
      const swing = s % 2 ? E.swing * beat * 0.5 : 0;
      const m = acorde[E.arp[s] % acorde.length] + 12;
      const f = hz(m);
      const vel = (0.7 + rand() * 0.3) * E.arpVol;
      add(t + s * beat * 0.5 + swing, 0.9, (tt) => {
        const env = Math.exp(-tt * 5.5) * Math.min(1, tt / 0.004);
        return vel * env * (Math.sin(2 * Math.PI * f * tt) + 0.4 * Math.sin(4 * Math.PI * f * tt) * Math.exp(-tt * 9) + 0.15 * Math.sin(6 * Math.PI * f * tt) * Math.exp(-tt * 14));
      }, s % 2 ? 0.35 : -0.35);
    }
    // bateria leve
    for (const b of E.kick) add(t + b * beat, 0.35, (tt) => 0.55 * Math.exp(-tt * 11) * Math.sin(2 * Math.PI * (45 + 90 * Math.exp(-tt * 28)) * tt));
    for (const b of E.snare) {
      let lp = 0;
      add(t + b * beat, 0.25, (tt) => {
        lp += 0.35 * ((rand() * 2 - 1) - lp);
        return 0.17 * Math.exp(-tt * 20) * (lp + 0.3 * Math.sin(2 * Math.PI * 190 * tt) * Math.exp(-tt * 30));
      });
    }
    if (E.hat) {
      let prev = 0;
      for (let s = 0; s < 8; s++) {
        add(t + s * beat * 0.5 + (s % 2 ? E.swing * beat * 0.5 : 0), 0.06, (tt) => {
          const x = rand() * 2 - 1;
          const hp = x - prev;
          prev = x;
          return 0.05 * Math.exp(-tt * 70) * hp * (s % 2 ? 0.6 : 1);
        }, 0.2);
      }
    }
  }

  // eco simples (3/8 de tempo) para dar espaço, depois limitador suave
  const atraso = Math.floor(beat * 0.75 * SR);
  for (let i = atraso; i < n; i++) {
    L[i] += 0.22 * R[i - atraso];
    R[i] += 0.22 * L[i - atraso];
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
    const l = Math.tanh(L[i] * ganho * 1.2) * f;
    const r = Math.tanh(R[i] * ganho * 1.2) * f;
    buf.writeInt16LE(Math.round(Math.max(-1, Math.min(1, l)) * 32767 * 0.9), 44 + i * 4);
    buf.writeInt16LE(Math.round(Math.max(-1, Math.min(1, r)) * 32767 * 0.9), 46 + i * 4);
  }
  return buf;
}

module.exports = { gerarMusica, ESTILOS };
