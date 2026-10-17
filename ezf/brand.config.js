// ezf.tech: configuração central dos templates do Instagram. Fonte da verdade: marca/manual (v0.4).
const path = require("node:path");
const MARCA = path.join(__dirname, "marca");
module.exports = {
  cores: {
    tinta: "#1B1026", // fundo escuro, texto sobre claro
    elevada: "#261835", // superfície sobre Tinta
    nevoa: "#EEEAF3", // fundo claro, texto sobre escuro
    violeta: "#8A12B4", // a cor da marca; destaque sobre Névoa
    lilas: "#B98BE0", // chaves, linhas e etiquetas, só sobre Tinta
    ambar: "#F2B233", // ação e acento
    nevoaApagada: "#B9ABCB", // texto secundário sobre Tinta
    tintaApagada: "#5C5070", // texto secundário sobre Névoa
    linha: "#3A2A4E",
  },
  fontes: {
    regular: path.join(MARCA, "fonts/Geist-Regular.ttf"),
    medium: path.join(MARCA, "fonts/Geist-Medium.ttf"),
    semi: path.join(MARCA, "fonts/Geist-SemiBold.ttf"),
    bold: path.join(MARCA, "fonts/Geist-Bold.ttf"),
    mono: path.join(MARCA, "fonts/GeistMono-Regular.ttf"),
    monoMedium: path.join(MARCA, "fonts/GeistMono-Medium.ttf"),
  },
  logo: {
    corSobreTinta: path.join(MARCA, "logo/ezftech-cor-sobre-tinta.png"),
    corSobreNevoa: path.join(MARCA, "logo/ezftech-cor-sobre-nevoa.png"),
    monoNevoa: path.join(MARCA, "logo/ezftech-mono-nevoa.png"),
    monoTinta: path.join(MARCA, "logo/ezftech-mono-tinta.png"),
  },
  icones: path.join(MARCA, "icones"), // sobre-tinta/*.svg, sobre-nevoa/*.svg
  exemplos: path.join(MARCA, "exemplos"),
  // chave "{" no espaço 100×400 (a mesma do logo e do manual); "}" é o espelho
  chaveD: "M88 4C46 4 50 36 50 76v84c0 28-16 40-44 40 28 0 44 12 44 40v84c0 40-4 72 38 72",
  feed: { largura: 1080, altura: 1350, margem: 80 },
  story: { largura: 1080, altura: 1920, margem: 80, zonaSegura: 250 },
  logoMinimoCor: 200, // manual: logo colorido só a partir de 200 px; abaixo, mono
};
