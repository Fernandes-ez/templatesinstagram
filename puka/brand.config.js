// Configuração central da marca Puka ("A Deixa") para os templates do Instagram.
// Fonte da verdade: o manual da marca (puka-manual.html, repositório pukacrm-landing). Se divergir, o manual vence.
const path = require("node:path");
const MARCA = path.join(__dirname, "marca");

module.exports = {
  // Manual, seção 06. Proporção de uso: roteiro/coxia 60-25 · ponto 10 · ribalta no máximo 5
  cores: {
    roteiro: "#F4EEE4", // fundo
    coxia: "#1E1B24", // texto e estrutura
    ponto: "#2D3F9E", // a IA
    ribalta: "#D2502D", // a pessoa: só gráfico e texto 24 px+
    ribaltaFunda: "#A83A1C", // texto pequeno, links, botão
    ribaltaAcesa: "#E8704A", // ribalta sobre Coxia
    pontoClaro: "#8E9BE0", // ponto sobre Coxia
    rotunda: "#E6DCCB", // superfícies
    bastidor: "#5E5868", // texto secundário
    papel: "#FBF8F2",
    linha: "#D9CDB9",
  },
  // `ps` é o nome PostScript gravado no .psd: instale estes arquivos para editar o texto no Photoshop.
  fontes: {
    display: { arquivo: path.join(MARCA, "fonts/BricolageGrotesque-ExtraBold.ttf"), ps: "BricolageGrotesque-ExtraBold" },
    subtitulo: { arquivo: path.join(MARCA, "fonts/BricolageGrotesque-Bold.ttf"), ps: "BricolageGrotesque-Bold" },
    corpo: { arquivo: path.join(MARCA, "fonts/AtkinsonHyperlegibleNext-Regular.ttf"), ps: "AtkinsonHyperlegibleNext-Regular" },
    corpoBold: { arquivo: path.join(MARCA, "fonts/AtkinsonHyperlegibleNext-Bold.ttf"), ps: "AtkinsonHyperlegibleNext-Bold" },
    mono: { arquivo: path.join(MARCA, "fonts/AtkinsonHyperlegibleMono-Regular.ttf"), ps: "AtkinsonHyperlegibleMono-Regular" },
    monoMedium: { arquivo: path.join(MARCA, "fonts/AtkinsonHyperlegibleMono-Medium.ttf"), ps: "AtkinsonHyperlegibleMono-Medium" },
  },
  logo: {
    principalCor: path.join(MARCA, "logo/puka-principal-cor.svg"), // sobre Roteiro
    principalNegativo: path.join(MARCA, "logo/puka-principal-negativo.svg"), // sobre Coxia
    simboloCor: path.join(MARCA, "logo/puka-simbolo-cor.svg"),
    simboloNegativo: path.join(MARCA, "logo/puka-simbolo-negativo.svg"),
  },
  padrao: {
    claro: path.join(MARCA, "padrao/puka-padrao-claro.svg"),
    escuro: path.join(MARCA, "padrao/puka-padrao-escuro.svg"),
  },
  icones: path.join(MARCA, "icones"), // agenda, conversa, deixa, equipe, etapas, historico, lead, ponto
  // Símbolo (manual, seção 02): haste reta + deixa curva, no espaço do SVG (y para cima)
  simbolo: {
    hasteD: "M33.0 0V694H183.0V0Z",
    deixaD: "M364 527C318 450 221.02 344 221.02 270C221.02 192 280 86 312 0H512C458 92 386 180 386 262C386 334 452 440 498 527Z",
    box: { x: 33, y: 0, w: 479, h: 694 },
    deixaBox: { x: 221, y: 0, w: 291, h: 527 },
  },
  feed: { largura: 1080, altura: 1350, margem: 80 },
  story: { largura: 1080, altura: 1920, margem: 80, zonaSegura: 250 },
  grade: { colunas: 12, calha: 24 },
  lacuna: 14, // 1/4 da haste na escala do feed; nunca fecha
  logoMinimo: 72,
};
