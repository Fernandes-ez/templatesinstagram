# ezf.tech — templates de Instagram (PSD)

Gera 21 templates editáveis (13 feeds, carrossel panorâmico de 5 slides e 3 stories) com a identidade "Entre chaves".

## Como rodar

```sh
npm install
npm run fonts   # baixa Unbounded, Instrument Sans e JetBrains Mono e gera as instâncias estáticas (requer: py -m pip install fonttools)
npm run build   # gera output/*.psd, output/previews/*.png, output/grade_perfil.png e output/validacao_grade.log
```

**Antes de editar no Photoshop, instale as fontes de `fonts/*.ttf` no Windows** (botão direito → Instalar para todos os usuários). Os PSDs abrem com o preview certo mesmo sem elas, mas para editar o texto o Photoshop precisa das fontes instaladas.

## Trocar cores, fontes e formas

Tudo sai de `brand.config.js`:

- `colors`: `tinta`, `nevoa`, `violeta`, `lilas`, `ambar`, `tintaElevada` (+ tons de texto secundário)
- `fonts`: qual instância usar em cada papel (as chaves vêm de `fonts/fonts.json`)
- `accentOn` / `textOn` / `mutedOn` / `lineOn`: qual cor usar sobre cada fundo
- `paths.chave` e `paths.fio`: os desenhos da chave e do fio embaraçado
- `logo.byBackground`: qual variação do logo vai em cada fundo

Depois de mudar, rode `npm run build` de novo.

## Logo

`node make-logos.js` gera, a partir de `../ezf-marca/logo/fonte-positivo.png`, as variações em PNG transparente: `ezftech-positivo` (Névoa), `ezftech-negativo` (Tinta), `ezftech-mono-nevoa` (Violeta e fotos) e `ezftech-mono-tinta` (Âmbar, Lilás, impressão em 1 cor). O desenho não é refeito: cada pixel é separado em tinta × cobertura e recolorido. As cores de cada variação ficam em `VARIANTS`, no início do script.

## Camadas

Todos os arquivos usam os grupos `Fundo`, `Divisa`, `Imagem (substituir)`, `Grafismos`, `Texto`, `Logo`, `Guias` (de baixo para cima).

- Textos são camadas de texto editáveis. Em títulos com `{palavra}`, as chaves são trechos em JetBrains Mono dentro da mesma camada.
- Para trocar uma imagem: coloque sua foto logo acima de `FOTO_AQUI` e use "Criar máscara de corte" (Alt+clique entre as camadas). Onde já existe um mockup `(substituir)`, apague-o ou esconda-o.
- `Guias/Grade_12_colunas` está oculta. As guias de margem estão nas guias do documento.
- `story_enquete`: a área do sticker de enquete é a camada oculta `Guias/AREA_STICKER` (800×400).
- Formas (chave, fio, nós, divisa, botão) são camadas raster com nomes claros, não vetores editáveis.

## Sistema de variação

Cada template fixa um fundo, um arquétipo e um protagonista. Para criar uma peça nova, escolha uma combinação que ainda não existe e respeite as vizinhas na grade.

| Template | Fundo | Arquétipo | Protagonista |
|---|---|---|---|
| feed_manifesto | Tinta | A · Tipográfico gritado | tipografia `{organiza}` |
| feed_checklist | Névoa | I · Checklist | lista com nós |
| feed_antes_depois | Névoa → Tinta | B · Divisa | fio (embaraçado → reto) |
| feed_numero | Violeta | F · Número gigante | número |
| feed_case_site | Tinta | C · Imagem estourando | arco com mockup |
| feed_palavra | Névoa | L · Palavra solta | palavra |
| feed_conversa | Tinta | H · Conversa | bolhas |
| feed_processo | Névoa | E · Fio com nós | fio reto |
| feed_beneficios | Violeta | D · Chave agrupadora | chave agrupadora |
| feed_mito_fato | Tinta | K · Colunas | chave vertical |
| feed_tela_anotada | Névoa | J · Tela anotada | arco com captura |
| feed_depoimento | Névoa | G · Citação | chave-aspas |
| feed_case_chatbot | Tinta | C · Imagem estourando | círculo com bolhas |
| carrossel_whatsapp_01 (capa) | Violeta | A | tipografia `{CRM}` |
| carrossel_whatsapp_02 | Névoa | I | lista com nós |
| carrossel_whatsapp_03 | Tinta | N · Palavra contínua | "proces|so." (continua no 04) |
| carrossel_whatsapp_04 | Névoa | E | fio com nós + fim da palavra |
| carrossel_whatsapp_05 (final) | Tinta | fechamento | chave `}` + CTA |
| carrossel_improviso_01 (capa) | Violeta | N · Palavra contínua | "impro|viso." (continua no 02) |
| carrossel_improviso_02 | Violeta | N | fim de "improviso." + frase |
| carrossel_improviso_03 | Névoa | N | "proces|so." (continua no 04) |
| carrossel_improviso_04 | Névoa | E | fio com nós + fim da palavra |
| carrossel_improviso_05 (final) | Tinta | fechamento | chave `}` + CTA |
| story_conversa | Tinta | H | bolhas em círculo |
| story_enquete | Névoa | A | tipografia `{resposta}` |
| story_bastidor | Tinta | C | arco com foto |

## Carrosséis panorâmicos e palavra contínua

Os carrosséis são desenhados como uma arte de 5400×1350 fatiada em 5 slides. O fio e as palavras gigantes atravessam a emenda no mesmo ponto, então quem arrasta vê a continuação. Ao passar de um fundo para outro, a palavra e o fio trocam de tinta (Lilás na Tinta, Violeta na Névoa, Névoa no Violeta).

- Cada pedaço é uma camada de texto `Palavra_continua` com a palavra inteira, deslocada para mostrar só a parte daquele slide. **Para trocar a palavra no Photoshop, edite o texto e o tamanho nos dois slides.** O mais seguro é mudar `WORD_*` em `templates.js` e rodar `npm run build`, que mantém a emenda exata.
- Para criar um carrossel novo: defina a palavra em coordenadas da panorâmica (x = nº do slide × 1080 + x local) e chame `panoWord` em cada slide que ela cruza.
- Post único (`feed_palavra`) não tem continuação: ali só metade da última letra vaza pela borda, para a palavra ser lida inteira.

A ordem da grade do perfil e as regras de vizinhança ficam em `templates.js` (`gridOrder`) e em `generate-templates.js` (`violations`). O resultado de cada build fica em `output/validacao_grade.log`.
