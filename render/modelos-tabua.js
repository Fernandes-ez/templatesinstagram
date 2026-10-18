// Modelos da Tábua ("Letreiro") expostos ao serviço de render.
// Fora de propósito: depoimento, prato do dia e foto+título (exigem foto real do restaurante/dono, que o serviço ainda não recebe).
// Preço: a precificação da Tábua vai mudar e não entra em nenhum modelo. Os valores em reais dos modelos
// tela_cardapio e story_comanda são de um restaurante fictício de exemplo; o percentual do antes_depois é exemplo declarado no texto.
const tabua = require("../tabua/generate-templates.js");
const { t, icone: icone0 } = require("./validacao.js");

const icone = (extra = {}) => icone0(tabua.ICONES, extra);
const faixa = (max) => t(max, { padrao: "^\\S+(\\s+\\S+){0,3}$", dica: "no máximo 4 palavras" });
const pagina = () => t(5, { padrao: "^[0-9]/[0-9]$", dica: "formato 2/3" });
const digitos = (max) => t(max, { padrao: "^[0-9]+$", dica: "só dígitos" });
const reais = () => t(7, { obrigatorio: true, padrao: "^[0-9]{1,3}(,[0-9]{2})?$", dica: 'reais, ex.: "29,90"' });

module.exports = {
  anuncio: {
    fn: (a) => tabua.anuncio(a),
    descricao: "Anúncio de feed: faixa, título com sombra solta, card com o prazo e botão. Sem preço.",
    campos: { faixa: faixa(24), titulo: t(30, { obrigatorio: true }), apoio: t(90), etiqueta: t(24), numero: digitos(2), unidade: t(4), texto: t(60), cta: t(26) },
  },
  dica: {
    fn: (a) => tabua.dica(a),
    descricao: "Dica pro dono: número grande, ícone e texto curto.",
    campos: { faixa: faixa(24), numero: digitos(2), icone: icone(), titulo: t(24, { obrigatorio: true }), apoio: t(150) },
  },
  carrossel_capa: {
    fn: (a) => tabua.capa(a),
    descricao: "Capa do carrossel: gancho com número.",
    campos: { titulo: t(24, { obrigatorio: true }), subtitulo: t(120), faixa: faixa(24), pagina: pagina() },
  },
  carrossel_miolo: {
    fn: (a) => tabua.miolo(a),
    descricao: "Miolo do carrossel: 3 itens, cada um com ícone, título e texto.",
    campos: { etiqueta: t(28), titulo: t(30, { obrigatorio: true }), itens: { tipo: "lista", min: 3, max: 3, obrigatorio: true, campos: { icone: icone({ obrigatorio: true }), titulo: t(28, { obrigatorio: true }), texto: t(70, { obrigatorio: true }) } }, pagina: pagina() },
  },
  carrossel_final: {
    fn: (a) => tabua.final(a),
    descricao: "Última lâmina do carrossel: tagline, botão e logo. O gesto sublinha a última palavra do título.",
    campos: { titulo: t(36, { obrigatorio: true }), apoio: t(90), cta: t(22), pagina: pagina() },
  },
  antes_depois: {
    fn: (a) => tabua.antesDepois({ ...a, percentual: a.percentual === undefined ? undefined : Number(a.percentual) }),
    descricao: "Comissão de marketplace (percentual de EXEMPLO, dito no texto) × zero comissão na Tábua.",
    campos: { titulo: t(36, { obrigatorio: true }), percentual: t(2, { padrao: "^[1-9][0-9]?$", dica: "1 a 99" }), faixaAntes: faixa(20), antesRodape: t(24), faixaDepois: faixa(20), depoisTexto: t(50), depoisRodape: t(28) },
  },
  story_comanda: {
    fn: (a) => tabua.story(a),
    descricao: "Story 1080×1920: comanda de exemplo chegando, com total somado dos itens. Valores de restaurante fictício.",
    campos: { titulo: t(36, { obrigatorio: true }), mesa: t(24), numero: t(6, { padrao: "^N[ºo°] ?[0-9]{1,3}$", dica: "ex.: Nº 047" }), carimbo: t(16), itens: { tipo: "lista", min: 3, max: 3, obrigatorio: true, campos: { nome: t(26, { obrigatorio: true }), valor: reais() } }, obs: t(34), cta: t(22) },
  },
  tela_cardapio: {
    fn: (a) => tabua.telaCardapio(a),
    descricao: "Cardápio de exemplo (restaurante fictício) dentro de uma placa.",
    campos: { faixa: faixa(24), titulo: t(30, { obrigatorio: true }), restaurante: t(18), status: t(40), itens: { tipo: "lista", min: 3, max: 3, obrigatorio: true, campos: { nome: t(24, { obrigatorio: true }), detalhe: t(44, { obrigatorio: true }), valor: reais() } } },
  },
  enquete: {
    fn: (a) => tabua.enquete(a),
    descricao: "Pergunta com duas respostas em placas (A e B).",
    campos: { faixa: faixa(24), titulo: t(44, { obrigatorio: true }), opcaoA: { tipo: "objeto", obrigatorio: true, campos: { icone: icone({ obrigatorio: true }), rotulo: t(30, { obrigatorio: true }) } }, opcaoB: { tipo: "objeto", obrigatorio: true, campos: { icone: icone({ obrigatorio: true }), rotulo: t(30, { obrigatorio: true }) } }, chamada: t(40) },
  },
  novidade: {
    fn: (a) => tabua.novidadeEstado(a),
    descricao: "Novidade de produto com 3 itens. `estado` é obrigatório e define faixa e carimbo: no_ar (Novidade/NOVO), liberado_a_poucos (Liberado a poucos/EM TESTE), em_breve (Em breve/EM BREVE). Nunca afirme no_ar para o que não está no ar.",
    campos: { estado: t(18, { obrigatorio: true, padrao: "^(no_ar|liberado_a_poucos|em_breve)$", dica: "no_ar, liberado_a_poucos ou em_breve" }), titulo: t(40, { obrigatorio: true }), itens: { tipo: "lista", min: 3, max: 3, obrigatorio: true, campos: { icone: icone({ obrigatorio: true }), titulo: t(30, { obrigatorio: true }), texto: t(70, { obrigatorio: true }) } } },
  },
  carrossel_continuo: {
    fn: (a) => tabua.carrosselContinuo(a),
    multiplo: true,
    descricao: "Carrossel contínuo de 6 lâminas (azulejo, fio e placas atravessam as emendas): capa, 4 paradas, fechamento.",
    campos: {
      capa: { tipo: "objeto", obrigatorio: true, campos: { titulo: t(26, { obrigatorio: true }), apoio: t(50) } },
      paradas: { tipo: "lista", min: 4, max: 4, obrigatorio: true, campos: { icone: icone({ obrigatorio: true }), titulo: t(32, { obrigatorio: true }), apoio: t(80, { obrigatorio: true }) } },
      final: { tipo: "objeto", obrigatorio: true, campos: { titulo: t(26, { obrigatorio: true }), apoio: t(90), cta: t(22) } },
    },
  },
};
