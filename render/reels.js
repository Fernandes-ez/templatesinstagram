// Reels por marca: cada entrada devolve um objeto { largura, altura, fps, duracao, quadro(t) } (ver ../ezf/reel.js).
const { t, validar } = require("./validacao.js");
const ezf = require("../ezf/reel.js");

const CENA = { texto: t(50, { obrigatorio: true }), apoio: t(80), etiqueta: t(24) };

module.exports = {
  ezf: {
    descricao: "Reels animado: de 2 a 4 cenas (a 1ª é o gancho), escopo { } e cartão final com CTA. Use {palavra} para destacar uma palavra por cena.",
    campos: {
      cenas: { tipo: "lista", min: 2, max: 4, campos: CENA, obrigatorio: true },
      cta: t(24),
      musica: t(8, { padrao: "^(suave|pulso|brisa)$", dica: "suave, pulso ou brisa" }),
    },
    fn: (a) => ezf.reelAnimado({ cenas: a.cenas, cta: a.cta }),
  },
};
