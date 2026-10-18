// Validação compartilhada: converte `textos` do n8n em argumentos limpos para as funções dos geradores.
const t = (max, extra = {}) => ({ tipo: "texto", max, ...extra });
const icone = (lista, extra = {}) => ({ tipo: "icone", enum: lista, ...extra });

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
    } else if (def.tipo === "lista") {
      if (!Array.isArray(v) || v.length < def.min || v.length > def.max) falha(`${nome}: lista de ${def.min} a ${def.max} itens`);
      limpo[nome] = v.map((it, i) => {
        try {
          return validar({ campos: def.campos }, it);
        } catch (e) {
          if (e instanceof ErroValidacao) falha(`${nome}[${i}].${e.message}`);
          throw e;
        }
      });
    } else if (def.tipo === "objeto") {
      limpo[nome] = validar({ campos: def.campos }, v);
    }
  }
  return limpo;
}

module.exports = { t, icone, validar, ErroValidacao };
