// Fonte única da identidade ezf.tech. Troque um valor aqui e rode `npm run build` para regerar tudo.
export default {
  colors: {
    tinta: "#1B1026",
    nevoa: "#EEEAF3",
    violeta: "#8A12B4",
    lilas: "#B98BE0",
    ambar: "#F2B233",
    tintaElevada: "#261835",
    nevoaApagada: "#B9ABCB", // texto secundário sobre Tinta
    tintaApagada: "#5C5070", // texto secundário sobre Névoa
  },

  // Chaves de fonts/fonts.json (gerado por prepare-fonts.py)
  fonts: {
    display: "display", // Unbounded Regular
    displayLight: "displayLight", // Unbounded Light
    body: "body", // Instrument Sans Regular
    bodySemi: "bodySemi", // Instrument Sans SemiBold
    mono: "mono", // JetBrains Mono Regular
  },

  // Tracking em milésimos de em (unidade do Photoshop)
  tracking: { display: -45, body: 0, mono: 20 },

  // Cor de acento por fundo: chaves de {palavra}, etiqueta, fio e chave grande
  accentOn: { tinta: "lilas", nevoa: "violeta", violeta: "ambar" },
  textOn: { tinta: "nevoa", nevoa: "tinta", violeta: "nevoa" },
  mutedOn: { tinta: "nevoaApagada", nevoa: "tintaApagada", violeta: "nevoa" },
  lineOn: { tinta: ["lilas", 0.22], nevoa: ["tinta", 0.14], violeta: ["nevoa", 0.22] },

  layout: { margin: 80, columns: 12, gutter: 20, storySafe: 250 },

  // Variações geradas por make-logos.js a partir de ezf-marca/logo/fonte-positivo.png
  logo: {
    byBackground: {
      tinta: "../ezf-marca/logo/ezftech-negativo.png",
      nevoa: "../ezf-marca/logo/ezftech-positivo.png",
      violeta: "../ezf-marca/logo/ezftech-mono-nevoa.png",
    },
    width: 200,
  },

  handle: "@ezf.tech",
  contatos: { whatsapp: "+55 11 99108-4238", email: "ezftech.contato@gmail.com" },

  paths: {
    // Chave vertical, viewBox 0 0 100 400
    chave: "M88 4C46 4 50 36 50 76v84c0 28-16 40-44 40 28 0 44 12 44 40v84c0 40-4 72 38 72",
    // Fio embaraçado, viewBox 0 0 240 620
    fio: "M30 60C110-10 210 40 170 110S20 170 60 90s170-20 150 70-160 60-120-10 150 10 110 90-110 70-60 10 100 40 50 110c-30 40-30 80-30 130V620",
    // Divisa: gerada em código (ver divisaPath em generate-templates.js), ponta com 64px de raio e 72px de altura
    divisa: { height: 72, base: 64, half: 64 },
  },
};
