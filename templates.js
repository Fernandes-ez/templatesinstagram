/**
 * Puka Render Engine (pukacrm.com.br)
 * Direção de Arte: Editorial Teatral / Roteiro de Operações
 */

import { createCanvas, GlobalFonts, loadImage } from "@napi-rs/canvas";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const W = 1080;
const H = 1350; // 4:5 oficial do feed

// ============================================================
// 1. REGISTRO DE FONTES PUKA
// ============================================================
const fontsDir = path.join(__dirname, "fonts");

function registrarFonteSegura(arquivosPossiveis, familyName) {
  for (const arq of arquivosPossiveis) {
    const p = path.join(fontsDir, arq);
    if (fs.existsSync(p)) {
      GlobalFonts.registerFromPath(p, familyName);
      return true;
    }
  }
  return false;
}

registrarFonteSegura(
  [
    "BricolageGrotesque-Bold.ttf",
    "BricolageGrotesque[opsz,wdth,wght].ttf",
    "Unbounded-Medium.ttf",
  ],
  "PukaDisplay",
);
registrarFonteSegura(
  ["AtkinsonHyperlegibleNext-Regular.ttf", "InstrumentSans-Regular.ttf"],
  "PukaSans",
);
registrarFonteSegura(
  ["AtkinsonHyperlegibleNext-Bold.ttf", "InstrumentSans-SemiBold.ttf"],
  "PukaSansBold",
);
registrarFonteSegura(
  ["AtkinsonHyperlegibleMono-Regular.ttf", "JetBrainsMono-Regular.ttf"],
  "PukaMono",
);

// ============================================================
// 2. TOKENS DE IDENTIDADE PUKA
// ============================================================
const PUKA_COLORS = {
  roteiro: "#F4EEE4", // Marfim editorial
  coxia: "#1E1B24", // Preto teatral profundo
  ponto: "#2D3F9E", // Azul da IA
  ribalta: "#D2502D", // Terracota do Humano
  rotunda: "#E6DCCB", // Bege escuro de contraste
  textoEscuro: "#1E1B24",
  textoClaro: "#F4EEE4",
};

const PUKA_FONTS = {
  display: "PukaDisplay",
  sans: "PukaSans",
  sansBold: "PukaSansBold",
  mono: "PukaMono",
};

// ============================================================
// 3. UTILITÁRIOS GRÁFICOS E EDITORIAIS
// ============================================================
function aplicarTexturaRoteiro(ctx, intensidade = 0.025) {
  ctx.save();
  for (let i = 0; i < 14000; i++) {
    const x = Math.random() * W;
    const y = Math.random() * H;
    ctx.fillStyle =
      Math.random() > 0.5
        ? `rgba(255,255,255,${intensidade})`
        : `rgba(30,27,36,${intensidade * 1.2})`;
    ctx.fillRect(x, y, 1.5, 1.5);
  }
  ctx.restore();
}

function parseRichTokens(texto = "") {
  const palavras = [];
  const regex = /\{([^}]+)\}|(\S+)/g;
  let match;
  while ((match = regex.exec(texto)) !== null) {
    if (match[1] !== undefined) {
      match[1]
        .trim()
        .split(/\s+/)
        .forEach((w, idx, arr) => {
          palavras.push({
            text: w,
            highlight: true,
            isFirstHighlight: idx === 0,
            isLastHighlight: idx === arr.length - 1,
          });
        });
    } else if (match[2] !== undefined) {
      palavras.push({ text: match[2], highlight: false });
    }
  }
  return palavras;
}

function drawPukaHeadline(
  ctx,
  texto,
  x,
  y,
  maxWidth,
  fontSize,
  lineHeight,
  options = {},
) {
  ctx.save();
  ctx.font = `${fontSize}px "${PUKA_FONTS.display}"`;
  ctx.textBaseline = "alphabetic";
  const tokens = parseRichTokens(texto);
  const spaceWidth = ctx.measureText(" ").width;

  const lines = [];
  let currentLine = [];
  let currentWidth = 0;

  for (const tk of tokens) {
    const label = tk.text;
    const tkWidth = ctx.measureText(label).width;
    const addedWidth = currentLine.length > 0 ? spaceWidth + tkWidth : tkWidth;
    if (currentWidth + addedWidth > maxWidth && currentLine.length > 0) {
      lines.push({ items: currentLine, width: currentWidth });
      currentLine = [{ ...tk, label, width: tkWidth }];
      currentWidth = tkWidth;
    } else {
      currentLine.push({ ...tk, label, width: tkWidth });
      currentWidth += addedWidth;
    }
  }
  if (currentLine.length > 0)
    lines.push({ items: currentLine, width: currentWidth });

  let cursorY = y + fontSize * 0.85;
  lines.forEach((line) => {
    let cursorX =
      options.align === "center" ? x + (maxWidth - line.width) / 2 : x;
    line.items.forEach((item) => {
      if (item.highlight) {
        ctx.fillStyle = options.color || PUKA_COLORS.textoEscuro;
        ctx.fillText(item.label, cursorX, cursorY);
        // Grafismo "A Deixa" (sublinhado orgânico terracota)
        ctx.save();
        ctx.strokeStyle = PUKA_COLORS.ribalta;
        ctx.lineWidth = Math.max(6, fontSize * 0.1);
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.moveTo(cursorX - 2, cursorY + 12);
        ctx.lineTo(cursorX + item.width + 2, cursorY + 12);
        ctx.stroke();
        ctx.restore();
      } else {
        ctx.fillStyle = options.color || PUKA_COLORS.textoEscuro;
        ctx.fillText(item.label, cursorX, cursorY);
      }
      cursorX += item.width + spaceWidth;
    });
    cursorY += lineHeight;
  });
  ctx.restore();
  return cursorY;
}

function drawParagraph(
  ctx,
  text,
  x,
  y,
  maxWidth,
  fontSize,
  lineHeight,
  color,
  align = "left",
) {
  if (!text) return y;
  ctx.save();
  ctx.font = `${fontSize}px "${PUKA_FONTS.sans}"`;
  ctx.fillStyle = color;
  ctx.textBaseline = "top";
  const words = String(text).split(/\s+/);
  const lines = [];
  let current = "";
  for (const w of words) {
    const test = current ? `${current} ${w}` : w;
    if (ctx.measureText(test).width > maxWidth && current) {
      lines.push(current);
      current = w;
    } else {
      current = test;
    }
  }
  if (current) lines.push(current);
  let cy = y;
  for (const line of lines) {
    let lx =
      align === "center" ? x + (maxWidth - ctx.measureText(line).width) / 2 : x;
    ctx.fillText(line, lx, cy);
    cy += lineHeight;
  }
  ctx.restore();
  return cy;
}

function drawGrafismoADeixa(ctx, x, y, larguraTotal = 420) {
  const wReta = larguraTotal * 0.48;
  const gap = 22;

  ctx.save();
  ctx.fillStyle = PUKA_COLORS.ponto;
  ctx.fillRect(x, y - 5, wReta, 10);

  ctx.strokeStyle = PUKA_COLORS.ribalta;
  ctx.lineWidth = 10;
  ctx.lineCap = "butt";
  ctx.beginPath();
  const startCurva = x + wReta + gap;
  const endCurva = x + larguraTotal;
  ctx.moveTo(startCurva, y + 6);
  ctx.bezierCurveTo(
    startCurva + 50,
    y - 28,
    startCurva + 120,
    y + 26,
    endCurva,
    y - 6,
  );
  ctx.stroke();
  ctx.restore();
}

// ============================================================
// 4. OS 5 TEMPLATES ESTÁTICOS EXCLUSIVOS DA PUKA
// ============================================================

async function renderPukaTemplate1(ctx, dados) {
  // 1. Manifesto de Ato Único
  ctx.fillStyle = PUKA_COLORS.roteiro;
  ctx.fillRect(0, 0, W, H);

  // Coxia superior preta
  ctx.fillStyle = PUKA_COLORS.coxia;
  ctx.fillRect(0, 0, W, 24);

  ctx.fillStyle = PUKA_COLORS.ponto;
  ctx.font = `22px "${PUKA_FONTS.mono}"`;
  ctx.fillText(`[ ${dados.etiqueta || "ATO 01 · POSICIONAMENTO"} ]`, 120, 140);

  let nextY = drawPukaHeadline(
    ctx,
    dados.titulo || "",
    120,
    280,
    W - 240,
    80,
    92,
    { color: PUKA_COLORS.coxia },
  );

  if (dados.apoio) {
    drawParagraph(
      ctx,
      dados.apoio,
      120,
      nextY + 50,
      W - 240,
      33,
      48,
      "#5A5462",
    );
  }

  // Rodapé sólido coxia
  ctx.fillStyle = PUKA_COLORS.coxia;
  ctx.fillRect(0, H - 140, W, 140);
  ctx.fillStyle = PUKA_COLORS.roteiro;
  ctx.font = `28px "${PUKA_FONTS.sansBold}"`;
  ctx.fillText(dados.cta || "pukacrm.com.br", 120, H - 62);
  aplicarTexturaRoteiro(ctx);
}

async function renderPukaTemplate2(ctx, dados) {
  // 2. Simulação de Atendimento (Chat com cantos retos)
  ctx.fillStyle = PUKA_COLORS.roteiro;
  ctx.fillRect(0, 0, W, H);

  ctx.fillStyle = PUKA_COLORS.coxia;
  ctx.fillRect(0, 0, W, 130);
  ctx.fillStyle = PUKA_COLORS.roteiro;
  ctx.font = `24px "${PUKA_FONTS.display}"`;
  ctx.fillText("ROTEIRO DE ATENDIMENTO · WHATSAPP", 100, 78);

  let cy = 230;
  const msgs = dados.mensagens || [
    ["cliente", "Olá! Qual o valor do plano trimestral?"],
    [
      "ia",
      "Olá! O plano trimestral sai por 12x de R$ 99. Posso reservar sua vaga?",
    ],
    ["cliente", "Quero sim! Como faço?"],
    [
      "humano",
      "Perfeito! Sou o Gabriel, gestor comercial, envio o link agora.",
    ],
  ];

  msgs.forEach(([tipo, texto]) => {
    const isCliente = tipo === "cliente";
    const isIA = tipo === "ia";
    const boxW = 820;
    const boxX = 100;

    ctx.fillStyle = isCliente
      ? PUKA_COLORS.rotunda
      : isIA
        ? PUKA_COLORS.ponto
        : PUKA_COLORS.ribalta;
    ctx.fillRect(boxX, cy, boxW, 115);

    ctx.fillStyle = isCliente ? PUKA_COLORS.coxia : "#FFFFFF";
    ctx.font = `19px "${PUKA_FONTS.mono}"`;
    ctx.fillText(
      isCliente ? "CLIENTE" : isIA ? "PUKA [IA]" : "EQUIPE [HUMANO]",
      boxX + 24,
      cy + 28,
    );

    ctx.font = `23px "${PUKA_FONTS.sans}"`;
    ctx.fillText(texto, boxX + 24, cy + 74);
    cy += 140;
  });

  ctx.fillStyle = PUKA_COLORS.coxia;
  ctx.fillRect(0, H - 140, W, 140);
  ctx.fillStyle = "#FFFFFF";
  ctx.font = `28px "${PUKA_FONTS.sansBold}"`;
  ctx.fillText(
    dados.cta || "Teste 14 dias grátis: pukacrm.com.br",
    100,
    H - 62,
  );
  aplicarTexturaRoteiro(ctx);
}

async function renderPukaTemplate3(ctx, dados) {
  // 3. Quebra de Objeção (Partitura e Linha Vertical Rígida)
  ctx.fillStyle = PUKA_COLORS.roteiro;
  ctx.fillRect(0, 0, W, H);

  // Linha lateral de roteiro
  ctx.strokeStyle = PUKA_COLORS.ponto;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(140, 0);
  ctx.lineTo(140, H - 140);
  ctx.stroke();

  ctx.fillStyle = PUKA_COLORS.ponto;
  ctx.font = `22px "${PUKA_FONTS.mono}"`;
  ctx.fillText(`[ ${dados.etiqueta || "DIAGNÓSTICO"} ]`, 200, 160);

  let nextY = drawPukaHeadline(
    ctx,
    dados.titulo || "",
    200,
    300,
    W - 300,
    76,
    88,
    { color: PUKA_COLORS.coxia },
  );
  drawGrafismoADeixa(ctx, 200, nextY + 45, 400);

  if (dados.apoio) {
    drawParagraph(
      ctx,
      dados.apoio,
      200,
      nextY + 95,
      W - 300,
      32,
      46,
      "#5A5462",
    );
  }

  ctx.fillStyle = PUKA_COLORS.coxia;
  ctx.fillRect(0, H - 140, W, 140);
  ctx.fillStyle = PUKA_COLORS.roteiro;
  ctx.font = `28px "${PUKA_FONTS.sansBold}"`;
  ctx.fillText(dados.cta || "pukacrm.com.br", 200, H - 62);
  aplicarTexturaRoteiro(ctx);
}

async function renderPukaTemplate4(ctx, dados) {
  // 4. Bloco de Impacto com Número Gigante
  ctx.fillStyle = PUKA_COLORS.roteiro;
  ctx.fillRect(0, 0, W, H);

  ctx.fillStyle = PUKA_COLORS.rotunda;
  ctx.fillRect(100, 140, W - 200, 320);
  ctx.fillStyle = PUKA_COLORS.ponto;
  ctx.fillRect(100, 140, 16, 320);

  ctx.fillStyle = PUKA_COLORS.ponto;
  ctx.font = `160px "${PUKA_FONTS.display}"`;
  ctx.fillText(dados.numero || "14 dias", 150, 380);

  let nextY = drawPukaHeadline(
    ctx,
    dados.titulo || "",
    100,
    520,
    W - 200,
    68,
    80,
    { color: PUKA_COLORS.coxia },
  );
  drawGrafismoADeixa(ctx, 100, nextY + 40, 450);

  if (dados.apoio) {
    drawParagraph(
      ctx,
      dados.apoio,
      100,
      nextY + 90,
      W - 200,
      32,
      46,
      "#5A5462",
    );
  }

  ctx.fillStyle = PUKA_COLORS.coxia;
  ctx.fillRect(0, H - 140, W, 140);
  ctx.fillStyle = PUKA_COLORS.roteiro;
  ctx.font = `28px "${PUKA_FONTS.sansBold}"`;
  ctx.fillText(dados.cta || "pukacrm.com.br", 100, H - 62);
  aplicarTexturaRoteiro(ctx);
}

async function renderPukaTemplate5(ctx, dados) {
  // 5. Checklist Editorial de Passagem de Bastão
  ctx.fillStyle = PUKA_COLORS.roteiro;
  ctx.fillRect(0, 0, W, H);

  ctx.fillStyle = PUKA_COLORS.ponto;
  ctx.font = `22px "${PUKA_FONTS.mono}"`;
  ctx.fillText(`[ ${dados.etiqueta || "MÉTODO PUKA"} ]`, 100, 140);

  let nextY = drawPukaHeadline(
    ctx,
    dados.titulo || "",
    100,
    240,
    W - 200,
    64,
    76,
    { color: PUKA_COLORS.coxia },
  );
  nextY += 40;

  const itens = (dados.itens || []).slice(0, 3);
  itens.forEach((item, idx) => {
    const ehUltimo = idx === itens.length - 1;
    const corBarra = ehUltimo ? PUKA_COLORS.ribalta : PUKA_COLORS.ponto;

    ctx.fillStyle = PUKA_COLORS.rotunda;
    ctx.fillRect(100, nextY, W - 200, 110);
    ctx.fillStyle = corBarra;
    ctx.fillRect(100, nextY, 12, 110);

    ctx.fillStyle = corBarra;
    ctx.font = `18px "${PUKA_FONTS.mono}"`;
    ctx.fillText(
      ehUltimo ? `FECHO 0${idx + 1}` : `PASSO 0${idx + 1}`,
      130,
      nextY + 30,
    );

    ctx.fillStyle = PUKA_COLORS.coxia;
    ctx.font = `24px "${PUKA_FONTS.sansBold}"`;
    ctx.fillText(item || "", 130, nextY + 74);

    nextY += 135;
  });

  ctx.fillStyle = PUKA_COLORS.coxia;
  ctx.fillRect(0, H - 140, W, 140);
  ctx.fillStyle = PUKA_COLORS.roteiro;
  ctx.font = `28px "${PUKA_FONTS.sansBold}"`;
  ctx.fillText(dados.cta || "pukacrm.com.br", 100, H - 62);
  aplicarTexturaRoteiro(ctx);
}

// ============================================================
// 5. EXPORTAÇÃO PRINCIPAL E MODO TESTE
// ============================================================
export async function renderizarPostPuka(dados) {
  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext("2d");
  const modelo = dados.modelo || 1;

  if (modelo === 1) await renderPukaTemplate1(ctx, dados);
  else if (modelo === 2) await renderPukaTemplate2(ctx, dados);
  else if (modelo === 3) await renderPukaTemplate3(ctx, dados);
  else if (modelo === 4) await renderPukaTemplate4(ctx, dados);
  else await renderPukaTemplate5(ctx, dados);

  return canvas.toBuffer("image/jpeg", 92);
}

// Modo Teste Local (Gera os 5 posts estáticos exclusivos da Puka)
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  (async () => {
    const outDir = path.join(__dirname, "output-puka");
    if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

    const exemplos = [
      {
        arquivo: "puka-post-01-manifesto.jpg",
        dados: {
          modelo: 1,
          etiqueta: "Posicionamento",
          titulo: "A IA dá a {deixa}. Seu time {fecha} a venda.",
          apoio:
            "O robô resolve o triplo de chamados em segundos e transfere a negociação quente com todo o histórico pronto.",
          cta: "Teste 14 dias grátis: pukacrm.com.br",
        },
      },
      {
        arquivo: "puka-post-02-chat.jpg",
        dados: { modelo: 2, cta: "pukacrm.com.br" },
      },
      {
        arquivo: "puka-post-03-quebra-obn.jpg",
        dados: {
          modelo: 3,
          etiqueta: "Eficiência de Equipe",
          titulo: "Ninguém repetindo o mesmo {preço} 50 vezes no dia.",
          apoio:
            "Liberte seus vendedores para o que importa: fechar matrículas e contratos.",
          cta: "pukacrm.com.br",
        },
      },
      {
        arquivo: "puka-post-04-impacto.jpg",
        dados: {
          modelo: 4,
          numero: "14 dias",
          titulo: "De {teste} a rotina automatizada sem dor de cabeça.",
          apoio:
            "Configuração guiada e suporte direto para colocar sua operação para rodar.",
          cta: "pukacrm.com.br",
        },
      },
      {
        arquivo: "puka-post-05-checklist.jpg",
        dados: {
          modelo: 5,
          etiqueta: "Método Operacional",
          itens: [
            "Cliente manda mensagem e espera 2 horas",
            "Vendedor perde o lead esquecido no WhatsApp",
            "Equipe sem histórico unificado de atendimento",
          ],
          cta: "pukacrm.com.br",
        },
      },
    ];

    for (const ex of exemplos) {
      const buf = await renderizarPostPuka(ex.dados);
      const dest = path.join(outDir, ex.arquivo);
      fs.writeFileSync(dest, buf);
      console.log(`🎭 Puka gerada com sucesso: ${dest}`);
    }
  })();
}
