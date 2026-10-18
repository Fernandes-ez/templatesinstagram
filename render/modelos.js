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
