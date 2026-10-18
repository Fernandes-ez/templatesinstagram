// Testa os modelos da Puka pelo serviço (sobe o servidor, chama /render, confere JPG e fatias).
process.env.RENDER_TOKEN = "token-de-teste-1234567890";
process.env.PORT = "0";
process.env.FILES_DIR = require("node:os").tmpdir() + "/puka-render-test";
const assert = require("node:assert");
const { servidor } = require("./server.js");

const jpg = (b) => b[0] === 0xff && b[1] === 0xd8;
const novidade = { titulo: "A agenda mora no CRM.", itens: [{ icone: "agenda", nome: "Conversa e agenda juntas", texto: "Os horários ficam junto das conversas." }, { icone: "conversa", nome: "Marcou, registrou", texto: "O time vê o histórico." }, { icone: "equipe", nome: "Cada um na sua", texto: "Quem atende vê o que é dele." }] };
const casos = {
  story_conversa: { titulo: "A IA atende primeiro. O time entra na deixa.", cliente: { rotulo: "cliente · 23:10", corpo: "Vocês abrem sábado?" }, ia: { rotulo: "IA · 23:10", corpo: "Abrimos sábado das 8h às 14h. Quer agendar?" }, pessoa: { rotulo: "Marina · 08:00", corpo: "Bom dia! Te espero às 9h." }, botao: "Teste grátis no link da bio" },
  frase: { contexto: "22:30 · clínica · WhatsApp", pergunta: "Vocês atendem sábado?", resposta: "A IA respondeu em segundos. A equipe confirmou de manhã." },
  antes_depois: { sem: { horario: "09:15", texto: "O cliente escreveu à noite. A resposta veio no outro dia." }, com: { horario: "22:40", texto: "O cliente escreveu às 22:40. A IA respondeu às 22:40." } },
  numero: { numero: "14", unidade: "dias pra testar.", apoio: "Sem cartão de crédito." },
  lista: { titulo: "Perdendo lead no WhatsApp?", itens: [{ nome: "Mensagem à noite", texto: "A resposta só chega de manhã." }, { nome: "Ninguém responde", texto: "A conversa fica sem dono." }, { nome: "Pergunta repetida", texto: "Cada pessoa recomeça do zero." }] },
  tela: { titulo: "Conversa com histórico." },
  enquete: { pergunta: "Quanto tempo seu cliente espera uma resposta?", opcoes: [{ texto: "Menos de 5 minutos" }, { texto: "Até 1 hora" }, { texto: "No dia seguinte" }] },
  novidade,
  em_breve: { ...novidade, titulo: "Conversa parada? O time sabe." },
  carrossel_noite_dia: { mensagem_cliente: "Vocês abrem sábado?", titulo_ia: "A IA responde.", ia: { corpo: "Abrimos sábado, das 8h às 14h." }, texto_manha: "A Marina viu a conversa e assumiu.", titulo_time: "O time entra com o histórico.", pessoa: { corpo: "Bom dia! Te espero às 9h." } },
  carrossel_conversa: { titulo_capa: "Como a conversa passa de mão.", cliente: { corpo: "Vocês abrem sábado?" }, titulo_ia: "A IA responde na hora.", ia: { corpo: "Abrimos sábado das 8h às 14h." }, titulo_passagem: "Quando precisa, passa a vez.", titulo_time: "O time entra com o histórico.", pessoa: { corpo: "Bom dia! Te espero às 9h." }, cliente_final: { corpo: "Combinado!" }, titulo_final: "A IA dá a deixa. Seu time entra em cena." },
};

servidor.listen(0, "127.0.0.1", async () => {
  const base = `http://127.0.0.1:${servidor.address().port}`;
  const h = { authorization: `Bearer ${process.env.RENDER_TOKEN}`, "content-type": "application/json" };
  const post = (corpo) => fetch(`${base}/render`, { method: "POST", headers: h, body: JSON.stringify(corpo) });
  const baixar = async (url) => Buffer.from(await (await fetch(url.replace(/^https?:\/\/[^/]+/, base))).arrayBuffer());
  try {
    const mod = await (await fetch(`${base}/modelos`, { headers: h })).json();
    for (const nome of Object.keys(casos)) assert.ok(mod.puka[nome], `modelo ${nome} deve estar em /modelos`);
    assert.ok(!mod.puka.foto, "foto não deve ser exposta");

    for (const [modelo, textos] of Object.entries(casos)) {
      const r = await post({ marca: "puka", modelo, textos });
      const corpo = await r.json();
      assert.equal(r.status, 200, `${modelo}: ${JSON.stringify(corpo)}`);
      assert.equal(corpo.arquivos.length, modelo.startsWith("carrossel") ? (modelo === "carrossel_noite_dia" ? 4 : 5) : 1, `${modelo}: nº de arquivos`);
      for (const a of corpo.arquivos) assert.ok(jpg(await baixar(a.url)), `${modelo}: deve ser JPG`);
      assert.deepEqual(corpo.avisos, [], `${modelo}: sem avisos`);
    }

    // sem textos: usa os defaults de sempre
    let r = await post({ marca: "puka", modelo: "frase", textos: { pergunta: "Oi?" } });
    assert.equal(r.status, 200);

    r = await post({ marca: "puka", modelo: "novidade", textos: { ...novidade, itens: novidade.itens.map((i) => ({ ...i, icone: "boneco" })) } });
    assert.equal(r.status, 422);
    assert.match((await r.json()).erro, /ícone "boneco" não existe/);

    r = await post({ marca: "puka", modelo: "frase", textos: { pergunta: "a ".repeat(60) } });
    assert.equal(r.status, 422);
    r = await post({ marca: "puka", modelo: "numero", textos: { numero: "abc" } });
    assert.equal(r.status, 422);
    r = await post({ marca: "puka", modelo: "antes_depois", textos: { sem: { horario: "8h" } } });
    assert.equal(r.status, 422);
    // palavra gigante que não quebra: o gerador acusa e o serviço devolve 422, não uma imagem quebrada
    r = await post({ marca: "puka", modelo: "carrossel_noite_dia", textos: { titulo_ia: "Mensalidade" } });
    assert.equal(r.status, 422);
    assert.match((await r.json()).erro, /não cabe/);
    r = await post({ marca: "puka", modelo: "foto", textos: {} });
    assert.equal(r.status, 422);
    console.log("ok: todos os testes da Puka passaram");
  } catch (e) {
    console.error("FALHOU:", e.message);
    process.exitCode = 1;
  } finally {
    servidor.close();
  }
});
