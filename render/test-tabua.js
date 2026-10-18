// Testa os modelos da Tábua pelo serviço (sobe o servidor, chama a API, confere os JPG).
process.env.RENDER_TOKEN = "token-de-teste-1234567890";
process.env.PORT = "0";
process.env.FILES_DIR = require("node:os").tmpdir() + "/ezf-render-test-tabua";
const assert = require("node:assert");
const { servidor } = require("./server.js");

const jpg = (b) => b[0] === 0xff && b[1] === 0xd8;
const item = (icone, titulo, texto) => ({ icone, titulo, texto });

const CASOS = {
  anuncio: { faixa: "Sem comissão por pedido", titulo: "Do letreiro pro celular.", cta: "Crie seu cardápio grátis" },
  dica: { titulo: "Fechou mais cedo?", icone: "relogio", apoio: "Um toque no painel e o cardápio avisa que a casa fechou." },
  carrossel_capa: { titulo: "Vendeu 100. Recebeu 73.", pagina: "1/3" },
  carrossel_miolo: { titulo: "Três coisas, zero comissão.", itens: [item("cardapio", "Preço pelo celular", "Um toque e o item sai do cardápio."), item("mesa-qr", "Pedido na mesa", "O cliente pede pelo QR."), item("conversa", "Pedido no WhatsApp", "Chega pronto pra anotar.")] },
  carrossel_final: { titulo: "A freguesia é sua. O lucro também.", cta: "Link na bio" },
  antes_depois: { titulo: "Sem comissão por pedido. Nenhuma.", percentual: "30" },
  story_comanda: { titulo: "O cliente pediu. A Tábua anotou.", numero: "Nº 051", itens: [{ nome: "2x Pastel de carne", valor: "36,00" }, { nome: "1x Caldo de cana", valor: "9,50" }, { nome: "1x Porção de aipim", valor: "28,00" }] },
  tela_cardapio: { titulo: "Cardápio com a cara da casa.", itens: [{ nome: "Prato feito", detalhe: "Arroz, feijão, bife e salada", valor: "32,00" }, { nome: "Suco natural", detalhe: "Copo 400 ml", valor: "9,00" }, { nome: "Pudim", detalhe: "Fatia individual", valor: "12,50" }] },
  enquete: { titulo: "Quem pede mais no seu restaurante?", opcaoA: { icone: "mesa-qr", rotulo: "Pedido na mesa pelo QR" }, opcaoB: { icone: "entrega", rotulo: "Pedido no delivery" } },
  novidade: { estado: "em_breve", titulo: "Acabou? O cardápio avisa sozinho.", itens: [item("cardapio", "Esgotado automático", "Zerou o estoque, o item sai do ar."), item("relogio", "Alerta de mínimo", "Você vê o que está acabando."), item("comanda", "Histórico", "Cada movimento fica registrado.")] },
  carrossel_continuo: { capa: { titulo: "O pedido faz o caminho." }, paradas: ["mesa-qr", "comanda", "cozinha", "relogio"].map((ic, i) => ({ icone: ic, titulo: `Parada ${i + 1}`, apoio: "Explicação curta da parada." })), final: { titulo: "A freguesia é sua." } },
};

servidor.listen(0, "127.0.0.1", async () => {
  const base = `http://127.0.0.1:${servidor.address().port}`;
  const h = { authorization: `Bearer ${process.env.RENDER_TOKEN}`, "content-type": "application/json" };
  const post = (corpo, q = "") => fetch(`${base}/render${q}`, { method: "POST", headers: h, body: JSON.stringify(corpo) });
  const baixar = async (url) => Buffer.from(await (await fetch(url.replace(/^https?:\/\/[^/]+/, base))).arrayBuffer());
  try {
    const mod = await (await fetch(`${base}/modelos`, { headers: h })).json();
    assert.deepEqual(Object.keys(mod.tabua).sort(), Object.keys(CASOS).sort(), "todos os modelos expostos têm caso de teste");

    for (const [modelo, textos] of Object.entries(CASOS)) {
      const r = await post({ marca: "tabua", modelo, textos });
      const corpo = await r.json();
      assert.equal(r.status, 200, `${modelo}: ${JSON.stringify(corpo)}`);
      assert.deepEqual(corpo.avisos, [], `${modelo} devolveu avisos`);
      const esperado = modelo === "carrossel_continuo" ? 6 : 1;
      assert.equal(corpo.arquivos.length, esperado, `${modelo}: número de arquivos`);
      for (const a of corpo.arquivos) assert.ok(jpg(await baixar(a.url)), `${modelo}: ${a.arquivo} deve ser JPG`);
    }

    let r = await post({ marca: "tabua", modelo: "dica", textos: { titulo: "ok", icone: "foguete" } });
    assert.equal(r.status, 422);
    assert.match((await r.json()).erro, /ícone "foguete" não existe/);

    r = await post({ marca: "tabua", modelo: "dica", textos: { titulo: "x".repeat(200) } });
    assert.equal(r.status, 422, "texto maior que o limite");

    // texto dentro do limite de caracteres, mas que não cabe visualmente: 422 em vez de imagem quebrada
    r = await post({ marca: "tabua", modelo: "story_comanda", textos: { ...CASOS.story_comanda, itens: [{ nome: "W".repeat(26), valor: "1,00" }, ...CASOS.story_comanda.itens.slice(1)] } });
    assert.equal(r.status, 422);
    assert.match((await r.json()).erro, /não cabe/);

    r = await post({ marca: "tabua", modelo: "novidade", textos: { ...CASOS.novidade, estado: "lancado" } });
    assert.equal(r.status, 422, "estado precisa ser um dos três");
    r = await post({ marca: "tabua", modelo: "novidade", textos: { titulo: CASOS.novidade.titulo, itens: CASOS.novidade.itens } });
    assert.equal(r.status, 422, "estado é obrigatório");
    r = await post({ marca: "tabua", modelo: "tela_cardapio", textos: { ...CASOS.tela_cardapio, itens: CASOS.tela_cardapio.itens.map((i) => ({ ...i, valor: "abc" })) } });
    assert.equal(r.status, 422);
    r = await post({ marca: "tabua", modelo: "anuncio", textos: { titulo: "ok", faixa: "uma faixa com cinco palavras demais" } });
    assert.equal(r.status, 422, "faixa com mais de 4 palavras");

    console.log("ok: todos os testes da Tábua passaram");
  } catch (e) {
    console.error("FALHOU:", e.message);
    process.exitCode = 1;
  } finally {
    servidor.close();
  }
});
