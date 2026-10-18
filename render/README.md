# ezf-render: serviço de imagens para o n8n

Recebe `{marca, modelo, textos}` e devolve o JPG do post (ou as 5 fatias de um carrossel). Roda na mesma VM do n8n, sem custo de API.

Marcas: **ezf** (10 modelos), **Tábua** (11) e **Puka** (10). Fora do serviço, de propósito, os modelos que exigem foto real (Puka `foto`; Tábua `depoimento`, `prato do dia` e `foto com título`). Veja `GET /modelos` para campos e limites de cada um.

## Rodar

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
| `GET /modelos` | Lista modelos, campos, limites de tamanho e os ícones aceitos. Use no prompt da IA. |
| `POST /render` | Gera o post. Corpo: `{"marca":"ezf","modelo":"miolo_carrossel","textos":{...}}` |
| `POST /render?binario=1` | Igual, mas devolve o JPG direto (só modelos de 1 imagem). |
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

## Limites conhecidos

- Os limites de caracteres são conservadores: com texto no tamanho máximo, todos os modelos cabem (testado). Textos maiores devolvem `422` em vez de uma imagem quebrada.
- Uma imagem por vez (fila), uns 200 ms cada na VM de teste. Suficiente para dezenas de posts por semana.
- O `Dockerfile` não foi testado (sem Docker disponível aqui); o servidor, a API e a validação têm testes (`npm test`).
- Publicar carrossel no Instagram (containers) ainda não foi montado nem testado em conta real.
