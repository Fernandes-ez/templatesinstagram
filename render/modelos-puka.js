// Modelos da Puka ("A Deixa") expostos ao serviço de render.
// Fora do serviço de propósito: `foto` (puka/generate-templates.js), porque precisa de uma foto real de cliente com autorização
// e o serviço ainda não recebe imagens. Textos de simulação ("simulação · exemplo", "exemplo, não é cliente real") ficam fixos nas peças.
const puka = require("../puka/generate-templates.js");
const { t, icone: icone0 } = require("./validacao.js");
const icone = (extra = {}) => icone0(puka.ICONES, extra);

const hora = (extra = {}) => t(5, { padrao: "^[0-9]{2}:[0-9]{2}$", dica: "formato HH:MM", ...extra });
const msg = (corpoMax, rotuloMax = 24) => ({ tipo: "objeto", campos: { rotulo: t(rotuloMax), corpo: t(corpoMax) } });
const novidadeCampos = {
  titulo: t(30, { obrigatorio: true }),
  itens: { tipo: "lista", min: 3, max: 3, obrigatorio: true, campos: { icone: icone({ obrigatorio: true }), nome: t(30, { obrigatorio: true }), texto: t(90, { obrigatorio: true }) } },
};
const itensNovidade = (a) => a.itens.map((i) => [i.icone, i.nome, i.texto]);

module.exports = {
  story_conversa: {
    fn: (a) => puka.storyConversa(a),
    descricao: "Story 1080×1920: conversa com a IA atendendo e a pessoa assumindo. Mensagens de simulação.",
    campos: { titulo: t(48), cliente: msg(34), ia: msg(70), pessoa: msg(70), botao: t(28) },
  },
  frase: {
    fn: (a) => puka.frase(a),
    descricao: "Frase de cliente com a resposta e o símbolo gigante. Peça de exemplo.",
    campos: { contexto: t(40), pergunta: t(36, { obrigatorio: true }), resposta: t(70) },
  },
  antes_depois: {
    fn: (a) => puka.antesDepois(a),
    descricao: "Antes e depois pelo horário da resposta. Peça de exemplo.",
    campos: { sem: { tipo: "objeto", campos: { horario: hora(), texto: t(90) } }, com: { tipo: "objeto", campos: { horario: hora(), texto: t(66) } } },
  },
  numero: {
    fn: (a) => puka.numero(a),
    descricao: "Número grande de 1 ou 2 dígitos com unidade e apoio. Número e unidade são dados de oferta: confirme antes de publicar.",
    campos: { numero: t(2, { padrao: "^[0-9]{1,2}$", dica: "1 ou 2 dígitos" }), unidade: t(16), apoio: t(90) },
  },
  lista: {
    fn: (a) => puka.lista(a),
    descricao: "Lista de 3 itens, cada um com título curto e uma frase.",
    campos: { etiqueta: t(20), titulo: t(30, { obrigatorio: true }), itens: { tipo: "lista", min: 3, max: 3, campos: { nome: t(28, { obrigatorio: true }), texto: t(100, { obrigatorio: true }) } } },
  },
  tela: {
    fn: (a) => puka.tela(a),
    descricao: "Captura de tela de conversa do Puka com título. A imagem é fixa (conversa de teste).",
    campos: { etiqueta: t(24), titulo: t(28, { obrigatorio: true }) },
  },
  enquete: {
    fn: (a) => puka.enquete({ ...a, opcoes: a.opcoes?.map((o) => o.texto) }),
    descricao: "Pergunta com três respostas A, B e C.",
    campos: { etiqueta: t(24), pergunta: t(58, { obrigatorio: true }), opcoes: { tipo: "lista", min: 3, max: 3, campos: { texto: t(26, { obrigatorio: true }) } }, chamada: t(40) },
  },
  novidade: {
    fn: (a) => puka.novidade("servico", { tag: "NOVIDADE", titulo: a.titulo, itens: itensNovidade(a) }),
    descricao: "Anuncia algo que já está no ar (etiqueta NOVIDADE). Só use para o que já foi liberado.",
    campos: novidadeCampos,
  },
  em_breve: {
    fn: (a) => puka.novidade("servico_em_breve", { tag: "EM BREVE", titulo: a.titulo, itens: itensNovidade(a) }),
    descricao: "Antecipa algo que ainda não foi liberado (etiqueta EM BREVE).",
    campos: novidadeCampos,
  },
  carrossel_noite_dia: {
    fn: (a) => puka.carrosselNoiteDia(a),
    multiplo: true,
    descricao: "Carrossel contínuo de 4 lâminas: a noite (23:47) vira dia (08:02). Textos de simulação.",
    campos: { horario_noite: hora(), mensagem_cliente: t(50), titulo_ia: t(14), ia: msg(54), horario_manha: hora(), texto_manha: t(60), titulo_time: t(30), pessoa: msg(44), botao: t(28) },
  },
  carrossel_conversa: {
    fn: (a) => puka.carrosselConversa(a),
    multiplo: true,
    descricao: "Carrossel contínuo de 5 lâminas: a conversa passa da IA para a pessoa. Textos de simulação.",
    campos: {
      titulo_capa: t(34), cliente: msg(40, 20), titulo_ia: t(30), ia: msg(46, 20), titulo_passagem: t(34), titulo_time: t(34), pessoa: msg(38, 20),
      cliente_final: msg(16, 18), titulo_final: t(42), botao: t(28),
    },
  },
};
