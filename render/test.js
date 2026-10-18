// Testa o serviço de ponta a ponta (sobe o servidor, chama a API, confere os JPG).
process.env.RENDER_TOKEN = "token-de-teste-1234567890";
process.env.PORT = "0";
process.env.FILES_DIR = require("node:os").tmpdir() + "/ezf-render-test";
const assert = require("node:assert");
const { servidor } = require("./server.js");

const jpg = (b) => b[0] === 0xff && b[1] === 0xd8;
servidor.listen(0, "127.0.0.1", async () => {
  const base = `http://127.0.0.1:${servidor.address().port}`;
  const h = { authorization: `Bearer ${process.env.RENDER_TOKEN}`, "content-type": "application/json" };
  const post = (corpo, q = "") => fetch(`${base}/render${q}`, { method: "POST", headers: h, body: JSON.stringify(corpo) });
  try {
    assert.equal((await fetch(`${base}/health`)).status, 200);
    assert.equal((await fetch(`${base}/modelos`)).status, 401, "sem token deve negar");
    const mod = await (await fetch(`${base}/modelos`, { headers: h })).json();
    assert.ok(mod.ezf.miolo_carrossel.campos.icone.enum.includes("celular"));

    let r = await post({ marca: "ezf", modelo: "miolo_carrossel", textos: { icone: "lupa", titulo: "Ninguém acha você no Google.", apoio: "Quem procura perto acha o concorrente." } });
    assert.equal(r.status, 200);
    const o = await r.json();
    assert.equal(o.arquivos.length, 1);
    const img = await fetch(o.arquivos[0].url.replace(/^https?:\/\/[^/]+/, base));
    assert.ok(jpg(Buffer.from(await img.arrayBuffer())), "deve ser JPG");

    r = await post({ marca: "ezf", modelo: "miolo_carrossel", textos: { icone: "boneco", titulo: "x" } });
    assert.equal(r.status, 422);
    assert.match((await r.json()).erro, /ícone "boneco" não existe/);

    r = await post({ marca: "ezf", modelo: "miolo_carrossel", textos: { titulo: "a".repeat(200) } });
    assert.equal(r.status, 422);
    r = await post({ marca: "ezf", modelo: "numero", textos: { numero: "abc", unidade: "dias", titulo: "ok" } });
    assert.equal(r.status, 422);
    r = await post({ marca: "ezf", modelo: "miolo_carrossel", textos: { titulo: "ok", extra: "x" } });
    assert.equal(r.status, 422);
    r = await post({ marca: "xx", modelo: "yy", textos: {} });
    assert.equal(r.status, 422);

    r = await post({ marca: "ezf", modelo: "lista_recebe", textos: { titulo: "O que vem no site.", itens: [{ icone: "janela", texto: "Site rápido" }, { icone: "pin", texto: "Aparece no Google" }, { icone: "cadeado", texto: "Segurança inclusa" }] } }, "?binario=1");
    assert.equal(r.status, 200);
    assert.ok(jpg(Buffer.from(await r.arrayBuffer())));

    r = await post({ marca: "ezf", modelo: "carrossel_escopo", textos: { capa: "{3} erros no seu site.", sinais: [1, 2, 3].map((n) => ({ icone: "celular", titulo: `Erro ${n}`, apoio: "Explicação curta." })) } });
    assert.equal(r.status, 200);
    assert.equal((await r.json()).arquivos.length, 5);
    console.log("ok: todos os testes passaram");
  } catch (e) {
    console.error("FALHOU:", e.message);
    process.exitCode = 1;
  } finally {
    servidor.close();
  }
});
