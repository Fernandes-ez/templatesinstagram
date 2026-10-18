# Instagram automático: Tábua, Puka e ezf.tech (n8n)

O fluxo antigo era **um workflow de 70 nós**. Agora são **7 workflows pequenos**, cada um com uma função, uma nota de cabeçalho dizendo *o que faz / o que entra / o que sai*, e faixas coloridas separando as fases. A lógica dos nós é a mesma; o que mudou é a organização e como os dados passam de um para o outro.

> **Estado:** os JSON foram gerados a partir do fluxo original e conferidos por script (conexões, referências entre nós, sintaxe dos nós de código), mas **ainda não foram importados numa instância n8n real**. Veja "Primeira importação" abaixo.

## O mapa

```mermaid
flowchart LR
  R[00 Radar semanal<br/>segunda 7h] -.briefing.-> B
  A[01 Orquestrador<br/>todo dia 16h] -->|1 item por marca| B[02 Criar texto da peça<br/>pesquisa · redação · revisão]
  B -->|peça aprovada| C[03 Produzir mídia<br/>template · foto · Reels]
  C -->|peça + mídia pronta| D[04 Aprovar e agendar<br/>revisão visual · Telegram · fila]
  D -->|linha na fila| Q[(Tabela<br/>instagram_posts)]
  Q --> E[06 Publicar no Instagram<br/>a cada 15 min]
  B -->|reprovou 2x| F[05 Registrar reprovação]
  C -->|roteiro Veo recusado| F
  D -->|você reprovou| F
  X[07 Alerta de erro] -. qualquer falha .-> T((Telegram))
```

| # | Workflow | Quando roda | Entra | Sai |
|---|---|---|---|---|
| 00 | **Radar semanal** | segunda 7h | alvos por marca | briefing em `instagram_referencias` |
| 01 | **Orquestrador** | todo dia 16h (ou botão de teste) | relógio | 1 item por marca → 02 |
| 02 | **Criar texto da peça** | chamado pelo 01 | marca, tipo (feed/reel), motor, pilar | **peça aprovada** → 03 |
| 03 | **Produzir mídia** | chamado pelo 02 | a peça | peça + mídia hospedada → 04 |
| 04 | **Aprovar e agendar** | chamado pelo 03 | peça com mídia | linha `agendado` na fila |
| 05 | **Registrar reprovação** | chamado por 02, 03 e 04 | registro da reprovação | linha `reprovado` + aviso |
| 06 | **Publicar no Instagram** | a cada 15 min | fila | post publicado + aviso |
| 07 | **Alerta de erro** | quando outro falha | erro do n8n | aviso no Telegram |

Cada etapa chama a próxima **sem esperar** o fim dela. Assim uma falha ou uma espera (por exemplo, sua aprovação no Telegram) não trava as outras, e cada execução fica curta e fácil de achar na lista de execuções.

## A "peça": o objeto que viaja entre 02, 03 e 04

No fluxo antigo, os nós do fim buscavam dados nos nós do começo (`$('Consolidar post aprovado')`). Isso não funciona entre workflows, então agora tudo vai **dentro de um único objeto**, criado no fim do 02 (nó *Consolidar post aprovado*):

`marca` (objeto com nome, regras, `geral`…) · `tipo` · `motor` · `rota` · `modelo` · `pilar` · `tema` · `legenda` · `alt_text` · `dados_render` · `dados_render_json` · `prompt_imagem` · `prompt_veo` · `cenas_texto` · `fontes_usadas` · `nota_revisao` · `observacoes_revisao` · `reescrito` · `veo_no_mes` · `arquivo` · `pasta` · `midia_url`

O 03 acrescenta `veo_gerado` e `veo_ok` (o que aconteceu com o Veo). O 04 grava na fila e o 06 só lê a tabela.

Reprovação: quem reprova monta um registro com `marca, nome_marca, telegram_chat_id, tipo, modelo, motor, pilar, tema, legenda, midia_url, nota_revisao, status, erro` e chama o 05, que grava e avisa. A regra existe uma vez só.

## Primeira importação (nesta ordem)

1. **Tabelas (Data Tables):** `instagram_posts` (marca, tipo, modelo, motor, pilar, tema, legenda, midia_url, fontes, status, ig_user_id, ig_media_id, erro, nota_revisao, agendado_para) e `instagram_referencias` (marca, semana, briefing, erros, urls_validas, posts_analisados).
2. **Importe os workflows de trás para frente:** 07, 06, 05, 04, 03, 02, 01 (e o 00 quando quiser o radar). Assim cada "Chamar ..." já encontra o destino.
3. **Ligue os "Chamar":** em cada nó **Chamar 0X · ...** (laranja, com nota) escolha o workflow de destino na lista. Estão com `PREENCHER_ID_...`.
   - 01 → chama o 02 · 02 → chama 03 e 05 · 03 → chama 04 e 05 · 04 → chama 05.
4. **Configuração única:** no workflow **01**, nó **Marcas e regras**, troque os `PREENCHER` (chat do Telegram, bucket, URL pública, URL do render, IDs do Instagram). No **06**, troque o chat em **Avisar resultado**. No **07**, o chat do alerta.
5. **Credenciais:** Gemini texto (projeto sem faturamento) · Gemini imagem/vídeo (projeto com faturamento) · Perplexity · Telegram · S3/R2 · Header Auth do render · Meta Graph API.
6. **Fuso:** cada workflow → Configurações → **America/Sao_Paulo**.
7. **Error workflow:** em cada workflow de 01 a 06 → Configurações → **Error workflow** → *07 · Alerta de erro*.
8. **Teste:** no 01, rode **Testar feed (todas as marcas)** e acompanhe a peça passando pelos workflows na lista de execuções. Ative o 06 por último.

## O que ainda não está alinhado (próximo passo)

- **Render:** os nós de render do 03 chamam `{render_url}/post` com o formato antigo (`modelo: titulo|lista|numero|foto`). O serviço novo (`render/`, na raiz do repositório) expõe `POST /render` com `{marca, modelo, textos}` e vários modelos por marca. Falta trocar o *Redator* para escolher entre os modelos de cada marca (`GET /modelos`) e ajustar o nó de render. Enquanto isso o 03 só funciona com o render antigo.
- **Perplexity no 02:** o radar (00) já usa Gemini com busca no Google; o 02 ainda usa Perplexity.
- **Carrossel:** o 06 publica imagem ou Reels; carrossel (vários JPG) ainda não está no publicador.
- **Radar → redator:** o trecho que injeta o briefing do radar no prompt do redator está descrito em `fluxo/00-radar-semanal.md`, mas ainda não foi aplicado ao 02.

## Arquivos

```
n8n/
  README.md                       este mapa
  fluxo/
    00-radar-semanal.json  (.md)  radar de concorrentes e tendências
    01-orquestrador.json
    02-criar-texto-da-peca.json
    03-produzir-midia.json
    04-aprovar-e-agendar.json
    05-registrar-reprovacao.json
    06-publicar-no-instagram.json
    07-alerta-de-erro.json
  referencias-tabua.md            referências de conteúdo da Tábua
```
