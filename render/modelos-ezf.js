const ezf = require("../ezf/generate-templates.js");
const { t, icone: icone0 } = require("./validacao.js");
const icone = (extra = {}) => icone0(ezf.ICONES, extra);

module.exports = {
    capa_carrossel: { fn: ezf.capaCarrossel, descricao: "Capa do carrossel educativo. Use {palavra} para destacar uma palavra ou número.", campos: { etiqueta: t(40), titulo: t(70, { obrigatorio: true }) } },
    miolo_carrossel: { fn: ezf.miolo, descricao: "Lâmina de conteúdo: um ícone, uma ideia.", campos: { etiqueta: t(40), icone: icone(), titulo: t(45, { obrigatorio: true }), apoio: t(90), rodape: t(34) } },
    final_carrossel: { fn: ezf.finalCarrossel, descricao: "Última lâmina, com botão de ação.", campos: { etiqueta: t(40), titulo: t(28, { obrigatorio: true }), apoio: t(80), botao: t(22), rodape: t(34) } },
    lista_recebe: { fn: ezf.listaRecebe, descricao: "Lista com 3 a 4 itens, cada um com ícone.", campos: { etiqueta: t(40), titulo: t(22, { obrigatorio: true }), itens: { tipo: "itens", min: 3, max: 4, icone: icone(), texto: t(60), obrigatorio: true }, rodape: t(34) } },
    numero: { fn: ezf.numero, descricao: "Número grande com ícone.", campos: { etiqueta: t(40), numero: t(3, { obrigatorio: true, padrao: "^[0-9.,+%x]+$", dica: "só dígitos e + % x" }), unidade: t(12, { obrigatorio: true }), icone: icone(), titulo: t(50, { obrigatorio: true }), apoio: t(45) } },
    pergunta_cliente: { fn: ezf.perguntaCliente, descricao: "Pergunta real de cliente como capa.", campos: { etiqueta: t(40), pergunta: t(60, { obrigatorio: true }), titulo: t(36) } },
    trabalho_entregue: { fn: ezf.trabalhoEntregue, automatico: false, descricao: "Site entregue com captura de tela (só Aqua Fit por enquanto; só com autorização do cliente).", campos: { etiqueta: t(40), titulo: t(36, { obrigatorio: true }), local: t(34) } },
    antes_depois: { fn: ezf.antesDepois, descricao: "Antes e depois em duas linhas.", campos: { etiqueta: t(40), titulo: t(55, { obrigatorio: true }), antes: t(36), depois: t(36) } },
    story_pergunta: { fn: ezf.storyPergunta, descricao: "Story 1080×1920 com pergunta de cliente.", campos: { etiqueta: t(40), pergunta: t(60, { obrigatorio: true }), titulo: t(60), chamada: t(24) } },
    carrossel_escopo: {
      fn: ezf.carrosselEscopo,
      multiplo: true,
      descricao: "Carrossel de 5 lâminas: capa, 3 sinais, ação.",
      campos: { capa: t(70, { obrigatorio: true }), sinais: { tipo: "sinais", min: 3, max: 3, icone: icone(), titulo: t(50), apoio: t(90), obrigatorio: true }, final: { tipo: "objeto", campos: { titulo: t(40), apoio: t(100), botao: t(26) } } },
    },
};
