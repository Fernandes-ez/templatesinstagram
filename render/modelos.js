// Registro dos modelos por marca. Cada arquivo modelos-<marca>.js exporta { nome_do_modelo: { fn, multiplo?, descricao, campos } }.
const { validar, ErroValidacao } = require("./validacao.js");

const MODELOS = {};
for (const marca of ["ezf", "puka", "tabua"]) {
  try {
    MODELOS[marca] = require(`./modelos-${marca}.js`);
  } catch (e) {
    if (e.code !== "MODULE_NOT_FOUND" || !String(e.message).includes(`modelos-${marca}`)) throw e;
  }
}

/** Onde o modelo se publica: feed (imagem única), story, lamina (parte de carrossel) ou carrossel (várias imagens). */
function formato(nome, m) {
  if (/_carrossel$/.test(nome) || /^carrossel_(capa|miolo|final)$/.test(nome)) return "lamina";
  if (m.multiplo || /^carrossel/.test(nome)) return "carrossel";
  if (/^story/.test(nome)) return "story";
  return "feed";
}

/** Descrição para o n8n/IA preencherem sem adivinhar. Filtros opcionais: { marca, formato }. */
function descrever({ marca: so, formato: fmt, automatico } = {}) {
  const saida = {};
  for (const [marca, ms] of Object.entries(MODELOS)) {
    if (so && so !== marca) continue;
    saida[marca] = {};
    for (const [nome, m] of Object.entries(ms)) {
      if (fmt && formato(nome, m) !== fmt) continue;
      if (automatico && m.automatico === false) continue; // modelos com conteúdo fixo (ex.: um cliente específico) não entram na escolha automática
      saida[marca][nome] = { formato: formato(nome, m), descricao: m.descricao, gera: m.multiplo ? "5 imagens (JSON com URLs)" : "1 imagem", campos: JSON.parse(JSON.stringify(m.campos, (k, v) => (k === "fn" ? undefined : v))) };
    }
  }
  return saida;
}

module.exports = { MODELOS, validar, descrever, ErroValidacao };
