// Registro dos modelos disponíveis por marca e o que cada um aceita.
// É a fonte única para o serviço validar e para o n8n/IA saber o que preencher (GET /modelos).
const ezf = require("../ezf/generate-templates.js");

const t = (max, extra = {}) => ({ tipo: "texto", max, ...extra });
const icone = (extra = {}) => ({ tipo: "icone", enum: ezf.ICONES, ...extra });

const MODELOS = {
  ezf: {
    capa_carrossel: { fn: ezf.capaCarrossel, descricao: "Capa do carrossel educativo. Use {palavra} para destacar uma palavra ou número.", campos: { etiqueta: t(40), titulo: t(70, { obrigatorio: true }) } },
    miolo_carrossel: { fn: ezf.miolo, descricao: "Lâmina de conteúdo: um ícone, uma ideia.", campos: { etiqueta: t(40), icone: icone(), titulo: t(45, { obrigatorio: true }), apoio: t(90), rodape: t(34) } },
    final_carrossel: { fn: ezf.finalCarrossel, descricao: "Última lâmina, com botão de ação.", campos: { etiqueta: t(40), titulo: t(28, { obrigatorio: true }), apoio: t(80), botao: t(22), rodape: t(34) } },
    lista_recebe: { fn: ezf.listaRecebe, descricao: "Lista com 3 a 4 itens, cada um com ícone.", campos: { etiqueta: t(40), titulo: t(22, { obrigatorio: true }), itens: { tipo: "itens", min: 3, max: 4, icone: icone(), texto: t(60), obrigatorio: true }, rodape: t(34) } },
    numero: { fn: ezf.numero, descricao: "Número grande com ícone.", campos: { etiqueta: t(40), numero: t(3, { obrigatorio: true, padrao: "^[0-9.,+%x]+$", dica: "só dígitos e + % x" }), unidade: t(12, { obrigatorio: true }), icone: icone(), titulo: t(50, { obrigatorio: true }), apoio: t(45) } },
    pergunta_cliente: { fn: ezf.perguntaCliente, descricao: "Pergunta real de cliente como capa.", campos: { etiqueta: t(40), pergunta: t(60, { obrigatorio: true }), titulo: t(36) } },
    trabalho_entregue: { fn: ezf.trabalhoEntregue, descricao: "Site entregue com captura de tela (só Aqua Fit por enquanto; só com autorização do cliente).", campos: { etiqueta: t(40), titulo: t(36, { obrigatorio: true }), local: t(34) } },
    antes_depois: { fn: ezf.antesDepois, descricao: "Antes e depois em duas linhas.", campos: { etiqueta: t(40), titulo: t(55, { obrigatorio: true }), antes: t(36), depois: t(36) } },
    story_pergunta: { fn: ezf.storyPergunta, descricao: "Story 1080×1920 com pergunta de cliente.", campos: { etiqueta: t(40), pergunta: t(60, { obrigatorio: true }), titulo: t(60), chamada: t(24) } },
    carrossel_escopo: {
      fn: ezf.carrosselEscopo,
      multiplo: true,
      descricao: "Carrossel de 5 lâminas: capa, 3 sinais, ação.",
      campos: { capa: t(70, { obrigatorio: true }), sinais: { tipo: "sinais", min: 3, max: 3, icone: icone(), titulo: t(50), apoio: t(90), obrigatorio: true }, final: { tipo: "objeto", campos: { titulo: t(40), apoio: t(100), botao: t(26) } } },
    },
  },
};

class ErroValidacao extends Error {}
const falha = (m) => {
  throw new ErroValidacao(m);
};

function validarTexto(nome, v, def) {
  if (typeof v !== "string") falha(`${nome}: precisa ser texto`);
  const s = v.replace(/\s+/g, " ").trim();
  if (!s) falha(`${nome}: vazio`);
  if (s.length > def.max) falha(`${nome}: ${s.length} caracteres, máximo ${def.max}`);
  if (def.padrao && !new RegExp(def.padrao).test(s)) falha(`${nome}: formato inválido (${def.dica})`);
  return s;
}
function validarIcone(nome, v, def) {
  if (!def.enum.includes(v)) falha(`${nome}: ícone "${v}" não existe. Use um de: ${def.enum.join(", ")}`);
  return v;
}

/** Valida `textos` contra o modelo. Devolve os argumentos limpos para a função do gerador. */
function validar(modelo, textos) {
  if (!textos || typeof textos !== "object" || Array.isArray(textos)) falha("textos: precisa ser um objeto");
  const limpo = {};
  const desconhecidos = Object.keys(textos).filter((k) => !(k in modelo.campos));
  if (desconhecidos.length) falha(`campos desconhecidos: ${desconhecidos.join(", ")}. Aceitos: ${Object.keys(modelo.campos).join(", ")}`);
  for (const [nome, def] of Object.entries(modelo.campos)) {
    const v = textos[nome];
    if (v === undefined || v === null || v === "") {
      if (def.obrigatorio) falha(`${nome}: obrigatório`);
      continue;
    }
    if (def.tipo === "texto") limpo[nome] = validarTexto(nome, v, def);
    else if (def.tipo === "icone") limpo[nome] = validarIcone(nome, v, def);
    else if (def.tipo === "itens") {
      if (!Array.isArray(v) || v.length < def.min || v.length > def.max) falha(`${nome}: lista de ${def.min} a ${def.max} itens`);
      limpo[nome] = v.map((it, i) => {
        if (!it || typeof it !== "object") falha(`${nome}[${i}]: precisa ser {icone, texto}`);
        return [validarIcone(`${nome}[${i}].icone`, it.icone, def.icone), validarTexto(`${nome}[${i}].texto`, it.texto, def.texto)];
      });
    } else if (def.tipo === "sinais") {
      if (!Array.isArray(v) || v.length !== def.min) falha(`${nome}: exatamente ${def.min} itens`);
      limpo[nome] = v.map((it, i) => {
        if (!it || typeof it !== "object") falha(`${nome}[${i}]: precisa ser {icone, titulo, apoio}`);
        return { icone: validarIcone(`${nome}[${i}].icone`, it.icone, def.icone), titulo: validarTexto(`${nome}[${i}].titulo`, it.titulo, def.titulo), apoio: validarTexto(`${nome}[${i}].apoio`, it.apoio, def.apoio) };
      });
    } else if (def.tipo === "objeto") {
      limpo[nome] = validar({ campos: def.campos }, v);
    }
  }
  return limpo;
}

/** Descrição para o n8n/IA preencherem sem adivinhar. */
function descrever() {
  const saida = {};
  for (const [marca, ms] of Object.entries(MODELOS)) {
    saida[marca] = {};
    for (const [nome, m] of Object.entries(ms)) {
      saida[marca][nome] = { descricao: m.descricao, gera: m.multiplo ? "5 imagens (JSON com URLs)" : "1 imagem", campos: JSON.parse(JSON.stringify(m.campos, (k, v) => (k === "fn" ? undefined : v))) };
    }
  }
  return saida;
}

module.exports = { MODELOS, validar, descrever, ErroValidacao };
