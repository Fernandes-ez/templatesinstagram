# 00 · Radar semanal (detalhes)

`03-radar.json`: sub-workflow semanal que pesquisa concorrentes, marcas similares, hashtags e a web para as 3 marcas e entrega um briefing de ideias. **Importe em um workflow separado** do fluxo principal.

## O que faz

1. **Segunda, 7h** (ou pelo gatilho manual) monta a lista de alvos por marca.
2. **Perfis** (Business Discovery): últimos 25 posts de cada concorrente ou marca similar, com formato, legenda, curtidas e comentários.
3. **Hashtags**: posts em destaque de 3 hashtags por marca.
4. **Web** (Gemini com busca no Google): blogs, novidades e tendências do mês, com as fontes citadas.
5. Calcula o **engajamento** por post (interações ÷ seguidores) e o mix de formatos no topo.
6. O Gemini devolve **padrões, ganchos, lacunas e ideias** (com o modelo de post sugerido).
7. Salva em `instagram_referencias` e manda o resumo no Telegram.

## Antes de ativar

1. **Nó "Alvos do radar":** troque os `PREENCHER` (`ig_user_id` de cada marca, perfis a monitorar, hashtags). Alvo que começa com `PREENCHER` é ignorado: o fluxo roda sem quebrar, só com a busca na web.
2. **Data Table `instagram_referencias`**, colunas de texto: `marca`, `semana`, `briefing`, `erros`, `urls_validas`; e de número: `posts_analisados`.
3. **Credenciais** (as mesmas do fluxo principal): Meta Graph API (Instagram), Gemini (texto; a mesma credencial serve à busca na web), Telegram. Troque `PREENCHER_CHAT_ID` no nó do Telegram.
4. Perfis monitorados precisam ser contas **Business ou Creator públicas**. Conta pessoal ou inexistente vem como erro no resumo, não derruba o fluxo.

## Limites conhecidos

- **Hashtags:** a API permite 30 hashtags diferentes por 7 dias por conta. Cada marca usa 3 por semana, então fica bem abaixo.
- **Curtidas ocultas:** perfis que escondem curtidas entram só com comentários (marcado "curtidas ocultas" no texto do analista).
- **Business Discovery não traz Stories**, e a versão da Graph API (`v25.0`) pode mudar: confira os campos se algum perfil voltar vazio.
- **Instagram sem raspagem:** de propósito, só APIs oficiais. Raspagem viola os termos da Meta e arrisca a conta de publicação.

## Como o fluxo principal usa o resultado

No nó "Escolher pilar e pesquisa" do fluxo principal, leia a última linha da marca na tabela e passe o briefing ao redator:

```js
// depois de um nó Data Table "get" em instagram_referencias (filtro marca = marca_id, ordem createdAt DESC, limite 1)
const linha = $('Briefing da semana').first()?.json;
const briefing = linha?.briefing ? JSON.parse(linha.briefing) : null;
const radar = briefing
  ? `RADAR DA SEMANA (só inspiração de ângulo e formato, nunca fato do produto nem texto copiado):\n` +
    `Resumo: ${briefing.resumo}\nLacunas: ${(briefing.lacunas || []).join('; ')}\n` +
    `Ideias: ${(briefing.ideias || []).map((i) => `[${i.formato}/${i.modelo}] ${i.titulo} (${i.angulo})`).join(' | ')}`
  : '(sem radar esta semana)';
```

Adicione `${radar}` ao prompt do "Redator da marca". O redator escolhe uma ideia compatível com o pilar do dia.

## Regras que o analista recebe

- Extrair padrões; **nunca copiar** legenda, frase ou imagem.
- **Não citar concorrente** nas ideias.
- Recurso de concorrente é contexto, **nunca fato da nossa marca** (fatos do produto vêm só do arquivo de status).
- Dado de mercado só com URL de busca.
- Dados vazios viram alerta, não tendência inventada.

> Este JSON foi montado e validado (estrutura, conexões e lógica dos nós de código com dados simulados), mas **não foi importado numa instância n8n real**. Na primeira importação, confira os nós Meta Graph API e "Buscar na web (Gemini + Google)" (o modelo `gemini-2.5-flash` e o formato da resposta podem variar; as URLs das fontes vêm como links de redirecionamento do Google) (parâmetros variam entre versões do n8n) e rode com o gatilho manual.
