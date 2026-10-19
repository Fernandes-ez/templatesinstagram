# ezf-render: serviço de imagens para o n8n

Recebe `{marca, modelo, textos}` e devolve o JPG do post (ou as 5 fatias de um carrossel). Roda na mesma VM do n8n, sem custo de API.

Marcas: **ezf** (10 modelos), **Tábua** (11) e **Puka** (10). Fora do serviço, de propósito, os modelos que exigem foto real (Puka `foto`; Tábua `depoimento`, `prato do dia` e `foto com título`). Veja `GET /modelos` para campos e limites de cada um.

## Instalar na VM (jeito rápido)

Na VM, depois de conectar por SSH: `git clone -b claude/gallant-brown-2pj3gi https://github.com/Fernandes-ez/templatesinstagram.git ~/templatesinstagram && bash ~/templatesinstagram/render/instalar-vm.sh`. O script instala Node 22, as dependências das três marcas, cria o serviço systemd, gera o token, roda os testes e mostra o que colocar no n8n. O serviço escuta só dentro da VM (ou na ponte do Docker, se o n8n roda em Docker): **não precisa de domínio nem de porta aberta**, porque o n8n hospeda as imagens no bucket (S3/R2) e o Instagram lê de lá.

## Rodar à mão

```bash
cd ezf && npm install && cd ..
export RENDER_TOKEN="uma-senha-longa-com-16+-caracteres"
export PUBLIC_URL="https://render.seudominio.com.br"   # como o Instagram enxerga esta VM
node render/server.js                                   # escuta em 127.0.0.1:3100
```

Opções: `PORT`, `HOST` (padrão `127.0.0.1`), `FILES_DIR`, `RETENCAO_HORAS` (padrão 48). Há `ezf-render.service` (systemd) e `Dockerfile` (build a partir da raiz do repositório: `docker build -f render/Dockerfile .`).

## API

Todas as rotas, menos `/health` e `/files/*`, pedem `Authorization: Bearer <RENDER_TOKEN>`.

| Rota | Faz |
|---|---|
| `GET /modelos` | Lista modelos, campos, limites de tamanho e os ícones aceitos. Use no prompt da IA. Filtros: `?marca=puka&formato=feed&automatico=1` (formato: `feed`, `story`, `lamina`, `carrossel`; `automatico=1` esconde modelos de conteúdo fixo, como o do cliente Aqua Fit). |
| `POST /render` | Gera o post. Corpo: `{"marca":"ezf","modelo":"miolo_carrossel","textos":{...}}` |
| `POST /render?binario=1` | Igual, mas devolve o JPG direto (só modelos de 1 imagem). |
| `POST /reel` | Reels animado (MP4 1080×1920, 30 fps, H.264 + AAC) com trilha original. Corpo: `{"marca":"ezf","cenas":[{texto,apoio?,etiqueta?}],"cta":"…","musica":"calor\|pulso\|codigo"}`. Devolve o vídeo direto. Para ezf, Puka e Tábua, cada uma no seu estilo; o clipe do Veo (multipart) ainda não. Precisa de `ffmpeg` na VM (o script de instalação instala). |
| `GET /files/<id>.jpg` | Baixa a imagem (URL pública, nome aleatório, apaga após 48 h). |

Resposta do `/render`: `{ marca, modelo, arquivos: [{ordem, url}], avisos, ms }`. O carrossel devolve 5 arquivos, na ordem de publicação.

Erros: `401` token errado, `422` dado inválido com o motivo em `erro` (ícone que não existe, texto grande demais, campo desconhecido, texto que não cabe no modelo), `500` falha interna.

## Como o ícone fica "certinho"

O ícone é um campo com lista fechada (`celular, relogio, loja, pin, mensagem, janela, calendario, lupa, cadeado, grafico, preco, sistema`). Qualquer outro valor devolve `422` com a lista, então nenhum post sai com ícone inventado. No n8n, passe a mesma lista como opções no output parser da IA.

## n8n

`n8n-exemplo.json` tem o nó HTTP Request pronto e exemplos de entrada e saída. Para publicar no Instagram use as URLs de `arquivos[].url` (a API do Instagram só aceita imagem por URL pública).

## Segurança

- Escute só em `127.0.0.1` e exponha apenas `/files/` por um proxy com HTTPS (nginx/Caddy). A API de render não precisa estar na internet: o n8n está na mesma VM.
- O token vai em header; nunca em URL. Troque-o se vazar.
- Os arquivos têm nome aleatório de 128 bits e expiram, mas são públicos para quem tiver o link.

## Reels

- A animação é desenhada quadro a quadro com as fontes e cores da marca e codificada com ffmpeg. A trilha é **original, gerada por código** (`musica.js`), sem amostras de terceiros, então não há problema de licença. Cada marca tem a sua: `calor` (Tábua: bossa leve, 108 bpm, piano elétrico e baixo caminhando), `pulso` (Puka: eletrônico pop, 120 bpm, bumbo em 4 e arpejo brilhante) e `codigo` (ezf: tech minimalista, 92 bpm, sub grave e bips). O campo `musica` escolhe outra, se quiser.
- Um Reels de ~15 s leva em torno de 10 s para renderizar numa máquina de 4 núcleos.
- Zona segura: o texto fica entre 300 e 1500 px de altura, fora da área coberta pela interface do Instagram.

## Limites conhecidos

- Os limites de caracteres são conservadores: com texto no tamanho máximo, todos os modelos cabem (testado). Textos maiores devolvem `422` em vez de uma imagem quebrada.
- Uma imagem por vez (fila), uns 200 ms cada na VM de teste. Suficiente para dezenas de posts por semana.
- O `Dockerfile` não foi testado (sem Docker disponível aqui); o servidor, a API e a validação têm testes (`npm test`).
- Publicar carrossel no Instagram (containers) ainda não foi montado nem testado em conta real.
