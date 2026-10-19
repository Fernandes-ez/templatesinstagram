// Testa a rota /reel (animação da ezf): MP4 válido, 422 para dados ruins.
process.env.RENDER_TOKEN = "token-de-teste-1234567890";
process.env.FILES_DIR = require("node:os").tmpdir() + "/ezf-render-test";
const assert = require("node:assert");
const { spawnSync } = require("node:child_process");
const fs = require("node:fs");
const { servidor } = require("./server.js");

servidor.listen(0, "127.0.0.1", async () => {
  const base = `http://127.0.0.1:${servidor.address().port}`;
  const h = { authorization: `Bearer ${process.env.RENDER_TOKEN}`, "content-type": "application/json" };
  const post = (corpo) => fetch(`${base}/reel`, { method: "POST", headers: h, body: JSON.stringify(corpo) });
  const cenas = [{ texto: "Seu site {perde} cliente?", etiqueta: "// sinal 1" }, { texto: "Abre devagar no celular.", apoio: "Passou de 3 segundos, o cliente fecha." }, { texto: "Ninguém acha o contato.", apoio: "WhatsApp na primeira tela." }];
  try {
    const r = await post({ marca: "ezf", cenas, cta: "Me chama no WhatsApp", musica: "codigo" });
    assert.equal(r.status, 200);
    assert.equal(r.headers.get("content-type"), "video/mp4");
    const buf = Buffer.from(await r.arrayBuffer());
    const f = require("node:os").tmpdir() + "/reel-teste.mp4";
    fs.writeFileSync(f, buf);
    const p = spawnSync("ffprobe", ["-v", "error", "-show_entries", "stream=codec_name,width,height", "-of", "csv=p=0", f], { encoding: "utf8" }).stdout;
    assert.match(p, /h264,1080,1920/); assert.match(p, /aac/);
    for (const marca of ["puka", "tabua"]) {
      const m = await post({ marca, cenas, cta: "Teste grátis" });
      assert.equal(m.status, 200, `${marca}: ${m.status}`);
      const b = Buffer.from(await m.arrayBuffer());
      fs.writeFileSync(require("node:os").tmpdir() + `/reel-${marca}.mp4`, b);
      assert.ok(b.length > 100000, `${marca}: vídeo pequeno demais`);
    }
    let x = await post({ marca: "outra", cenas });
    assert.equal(x.status, 422); assert.match((await x.json()).erro, /Reels ainda não existe/);
    x = await post({ marca: "ezf", cenas: [{ texto: "só uma" }] });
    assert.equal(x.status, 422);
    x = await post({ marca: "ezf", cenas: [{ texto: "a".repeat(120) }, { texto: "b" }] });
    assert.equal(x.status, 422);
    x = await post({ marca: "ezf", cenas, musica: "rock" });
    assert.equal(x.status, 422);
    x = await fetch(`${base}/reel`, { method: "POST", headers: { ...h, "content-type": "multipart/form-data; boundary=x" }, body: "x" });
    assert.equal(x.status, 422); assert.match((await x.json()).erro, /Veo/);
    x = await fetch(`${base}/reel`, { method: "POST", body: "{}" });
    assert.equal(x.status, 401);
    console.log("ok: todos os testes de Reels passaram");
  } catch (e) {
    console.error("FALHOU:", e.message);
    process.exitCode = 1;
  } finally {
    servidor.close();
  }
});
