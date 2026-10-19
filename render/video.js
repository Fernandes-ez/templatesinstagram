// Junta os quadros desenhados (RGBA cru) com a trilha e gera um MP4 pronto para Reels (H.264 + AAC, 1080×1920, 30 fps).
const { spawn } = require("node:child_process");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { gerarMusica } = require("./musica.js");

function rodar(args, entrada) {
  return new Promise((ok, erro) => {
    const p = spawn("ffmpeg", args, { stdio: ["pipe", "ignore", "pipe"] });
    let log = "";
    p.stderr.on("data", (d) => (log = (log + d).slice(-2000)));
    p.on("error", (e) => erro(new Error(`ffmpeg não encontrado ou falhou ao iniciar: ${e.message}`)));
    p.on("close", (c) => (c === 0 ? ok() : erro(new Error(`ffmpeg saiu com código ${c}: ${log.slice(-500)}`))));
    entrada(p.stdin).catch((e) => {
      p.kill("SIGKILL");
      erro(e);
    });
  });
}

/** @param reel { largura, altura, fps, duracao, quadro(t) } @returns Buffer MP4 */
async function renderizarVideo(reel, { estilo = "suave", seed = 7 } = {}) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "reel-"));
  const wav = path.join(dir, "musica.wav");
  const mp4 = path.join(dir, "reel.mp4");
  try {
    fs.writeFileSync(wav, gerarMusica({ duracao: reel.duracao + 0.2, estilo, seed }));
    const total = Math.ceil(reel.duracao * reel.fps);
    await rodar(
      ["-y", "-f", "rawvideo", "-pix_fmt", "rgba", "-s", `${reel.largura}x${reel.altura}`, "-r", String(reel.fps), "-i", "pipe:0", "-i", wav,
        "-c:v", "libx264", "-preset", "veryfast", "-crf", "19", "-profile:v", "high", "-pix_fmt", "yuv420p", "-r", String(reel.fps),
        "-c:a", "aac", "-b:a", "160k", "-ar", "44100", "-shortest", "-movflags", "+faststart", mp4],
      async (stdin) => {
        for (let i = 0; i < total; i++) {
          const quadro = reel.quadro(i / reel.fps);
          if (!stdin.write(quadro)) await new Promise((r) => stdin.once("drain", r));
        }
        stdin.end();
      },
    );
    return fs.readFileSync(mp4);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

module.exports = { renderizarVideo };
