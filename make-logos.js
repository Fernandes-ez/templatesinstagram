// Gera as variações do logo a partir de ezf-marca/logo/fonte-positivo.png, sem redesenhar:
// separa cada pixel em (tinta original × cobertura) sobre o fundo liso e reaplica a cobertura como alfa na cor nova.
// Uso: node make-logos.js
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createCanvas, loadImage } from "@napi-rs/canvas";
import brand from "./brand.config.js";

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const DIR = path.resolve(ROOT, "../ezf-marca/logo");
const SOURCE = path.join(DIR, "fonte-positivo.png");

const c = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const { tinta, nevoa, violeta, lilas } = brand.colors;
const LILAS_ESCURO = "#9B5FD0"; // chaves no claro: 3,58:1 sobre Névoa (o Lilás dá 2,26:1)

// Tintas do arquivo-fonte (medidas no PNG) e o fundo liso
const INKS = { ezf: c("#12121F"), tech: c("#9111B8"), chaves: c("#A972D9") };
const BG = c("#F4F2FF");

const VARIANTS = {
  "ezftech-positivo": { ezf: tinta, tech: violeta, chaves: LILAS_ESCURO }, // Névoa e fundos claros
  "ezftech-negativo": { ezf: nevoa, tech: violeta, chaves: lilas }, // Tinta (mesmo desenho do logo atual do site)
  "ezftech-mono-nevoa": { ezf: nevoa, tech: nevoa, chaves: nevoa }, // Violeta, Âmbar escuro, fotos
  "ezftech-mono-tinta": { ezf: tinta, tech: tinta, chaves: tinta }, // Âmbar, Lilás, impressão em 1 cor
};

function unmix(r, g, b) {
  let best = null;
  for (const [name, ink] of Object.entries(INKS)) {
    const d = ink.map((v, i) => v - BG[i]);
    const p = [r - BG[0], g - BG[1], b - BG[2]];
    const len = d[0] ** 2 + d[1] ** 2 + d[2] ** 2;
    const a = Math.min(1, Math.max(0, (p[0] * d[0] + p[1] * d[1] + p[2] * d[2]) / len));
    const err = p.reduce((s, v, i) => s + (v - a * d[i]) ** 2, 0);
    if (!best || err < best.err) best = { name, a, err };
  }
  return best;
}

const img = await loadImage(SOURCE);
const src = createCanvas(img.width, img.height).getContext("2d");
src.drawImage(img, 0, 0);
const data = src.getImageData(0, 0, img.width, img.height).data;

// Mapa de (tinta, cobertura) e caixa do desenho
const map = new Array(img.width * img.height);
let x0 = img.width, y0 = img.height, x1 = 0, y1 = 0;
for (let i = 0; i < map.length; i++) {
  const m = unmix(data[i * 4], data[i * 4 + 1], data[i * 4 + 2]);
  if (m.a < 0.03) continue;
  map[i] = m;
  const x = i % img.width, y = Math.floor(i / img.width);
  x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y);
}
const w = x1 - x0 + 1, h = y1 - y0 + 1;

for (const [file, colors] of Object.entries(VARIANTS)) {
  const out = createCanvas(w, h);
  const ctx = out.getContext("2d");
  const id = ctx.createImageData(w, h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const m = map[(y + y0) * img.width + x + x0];
      if (!m) continue;
      const o = (y * w + x) * 4;
      const [r, g, b] = c(colors[m.name]);
      id.data.set([r, g, b, Math.round(m.a * 255)], o);
    }
  }
  ctx.putImageData(id, 0, 0);
  fs.writeFileSync(path.join(DIR, `${file}.png`), out.toBuffer("image/png"));
  console.log(`✓ ${file}.png (${w}×${h})`);
}
