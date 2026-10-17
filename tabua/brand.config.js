// Configuração central da marca para os templates do Instagram.
// Mudou uma cor, uma fonte ou um arquivo? Troque aqui e rode `npm run generate` para refazer todos os .psd.
const path = require("node:path");

const ROOT = path.join(__dirname, "marca"); // marca copiada do repositório da Tábua
const PKG = path.join(ROOT, "pacote"); // pacote oficial da marca

module.exports = {
  // Tokens (manual, pág. 8). Proporção de uso: cal 50 · verdeBoteco 28 · tinta 12 · amareloOvo 6 · vermelhoPlaca 2 · azulejo 2
  cores: {
    cal: "#F6F1E6", // fundo padrão; nunca branco puro
    verdeBoteco: "#1E5B43", // marca, títulos, fundos de destaque
    tinta: "#1A1A17", // texto, contornos e sombras
    amareloOvo: "#F2B91E", // CTAs, faixas, sombra sobre verde (pouco e certeiro)
    vermelhoPlaca: "#C8372D", // só "novo", promoção, carimbos e avisos
    azulejo: "#D5E5D9", // fundos secundários e padrão
  },

  // Instâncias estáticas da Anybody (camada de texto não usa eixo variável) + Atkinson Hyperlegible ORIGINAL.
  // `ps` é o nome PostScript gravado no .psd: instale estes arquivos no computador que for abrir no Photoshop.
  fontes: {
    display: { arquivo: path.join(PKG, "fonts/ttf/Anybody-Black-W75.ttf"), ps: "Anybody-Black-W75" }, // display e títulos
    subtitulo: { arquivo: path.join(PKG, "fonts/ttf/Anybody-ExtraBold-W75.ttf"), ps: "Anybody-ExtraBold-W75" },
    etiqueta: { arquivo: path.join(PKG, "fonts/ttf/Anybody-ExtraBold-W60.ttf"), ps: "Anybody-ExtraBold-W60" }, // CAIXA ALTA, +6%
    numero: { arquivo: path.join(PKG, "fonts/ttf/Anybody-Black-W80.ttf"), ps: "Anybody-Black-W80" }, // números e preços
    corpo: { arquivo: path.join(ROOT, "brand/fonts/AtkinsonHyperlegible-Regular.ttf"), ps: "AtkinsonHyperlegible-Regular" },
    corpoBold: { arquivo: path.join(ROOT, "brand/fonts/AtkinsonHyperlegible-Bold.ttf"), ps: "AtkinsonHyperlegible-Bold" },
  },

  // Fonte das instâncias (usada por prepare-fonts.py)
  anybodyVariavel: path.join(PKG, "fonts/ttf/Anybody-VariableFont_wdth,wght.ttf"),

  logo: {
    principalCor: path.join(ROOT, "brand/svg/tabua-principal-cor.svg"), // sobre Cal
    principalNegativo: path.join(ROOT, "brand/svg/tabua-principal-negativo.svg"), // sobre Verde
    reduzidaCor: path.join(ROOT, "brand/svg/tabua-reduzida-cor.svg"), // abaixo de 120 px de largura
    simbolo: path.join(ROOT, "brand/svg/tabua-simbolo-cor.svg"), // de onde sai o gesto
  },

  padrao: {
    claro: path.join(PKG, "padrao/tabua-padrao-claro-ladrilho.svg"), // Azulejo sobre Cal
    verde: path.join(PKG, "padrao/tabua-padrao-verde-ladrilho.svg"), // verde claro sobre Verde-boteco
  },

  icones: path.join(PKG, "icones"), // cardapio, comanda, mesa-qr, conversa, entrega, relogio, impressora, cozinha

  // Regras do sistema gráfico
  feed: { largura: 1080, altura: 1350, margem: 80 },
  story: { largura: 1080, altura: 1920, margem: 80, zonaSegura: 250 },
  grade: { colunas: 12, calha: 24 },
  sombraSolta: 0.035, // deslocamento = 3,5% da altura do título
  logoMinimo: 120, // principal abaixo disso vira a reduzida
};
