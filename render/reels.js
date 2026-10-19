// Reels por marca: cada entrada devolve um objeto { largura, altura, fps, duracao, quadro(t) } (ver ../ezf/reel.js).
const { t, validar } = require("./validacao.js");
const ezf = require("../ezf/reel.js");
const puka = require("../puka/reel.js");
const tabua = require("../tabua/reel.js");

const CENA = { texto: t(50, { obrigatorio: true }), apoio: t(80), etiqueta: t(24) };

const CAMPOS = {
  cenas: { tipo: "lista", min: 2, max: 4, campos: CENA, obrigatorio: true },
  cta: t(24),
  musica: t(8, { padrao: "^(calor|pulso|codigo)$", dica: "calor, pulso ou codigo" }),
};

module.exports = {
  puka: {
    descricao: "Reels animado da Puka (A Deixa): cortes secos, haste, linha de passagem como progresso e símbolo gigante no fim. Destaque com {palavra} (cor Ribalta).",
    musicaPadrao: "pulso",
    campos: CAMPOS,
    fn: (a) => puka.reelAnimado({ cenas: a.cenas, cta: a.cta }),
  },
  tabua: {
    descricao: "Reels animado da Tábua (Letreiro): título com sombra solta, faixa em V, azulejo e cartão final em Cal. Destaque com {palavra} (Amarelo-ovo).",
    musicaPadrao: "calor",
    campos: CAMPOS,
    fn: (a) => tabua.reelAnimado({ cenas: a.cenas, cta: a.cta }),
  },
  ezf: {
    musicaPadrao: "codigo",
    descricao: "Reels animado: de 2 a 4 cenas (a 1ª é o gancho), escopo { } e cartão final com CTA. Use {palavra} para destacar uma palavra por cena.",
    campos: {
      cenas: { tipo: "lista", min: 2, max: 4, campos: CENA, obrigatorio: true },
      cta: t(24),
      musica: t(8, { padrao: "^(calor|pulso|codigo)$", dica: "calor, pulso ou codigo" }),
    },
    fn: (a) => ezf.reelAnimado({ cenas: a.cenas, cta: a.cta }),
  },
};
