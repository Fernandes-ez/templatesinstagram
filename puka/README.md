# Templates de Instagram da Puka (direção "A Deixa")

Gera 9 templates (10 peças + carrossel contínuo de 4 lâminas) em **JPG** prontos para publicar (1080×1350 ou 1080×1920, em `output/jpg/`) e um PNG de prévia de cada um. O PSD é opcional: `npm run generate:psd` gera também os `.psd` com camadas editáveis, para quem quiser mexer à mão no Photoshop. O n8n não usa PSD. Segue o manual da marca (`puka-manual.html`, repositório `pukacrm-landing`): uma deixa por peça, escala só pequena ou gigante, linha de passagem, hastes como estrutura, nada de balão verde de WhatsApp.

| # | Template | Peças | O que é |
|---|---|---|---|
| 1 | Conversa | `story_conversa` | Cliente, IA, linha de passagem e a pessoa entrando. Fundo Coxia, zonas seguras do story |
| 2 | Frase | `feed_frase` | A pergunta do cliente, a resposta com horário e o símbolo gigante sangrando |
| 3 | Antes / depois | `feed_antes_depois` | 08:02 × 23:47, dividido pela linha de passagem |
| 4 | Número | `feed_numero` | Número gigante, haste de ponta a ponta e uma deixa pequena |
| 5 | Lista | `feed_lista` | Três itens com haste como marcador |
| 6 | Tela do produto | `feed_tela` | Captura real da conversa, com haste ao lado |
| 7 | Enquete | `feed_enquete` | Pergunta com respostas A, B e C |
| 8 | Foto | `feed_foto` | Máscara "corte da deixa": a foto termina na curva do k |
| 9 | Novidade / Em breve | `feed_novidade_agenda`, `feed_novidade_copilot_em_breve` | Etiqueta, título e 3 itens com ícone da marca |
| 10 | Carrossel contínuo "A noite vira dia" | `carrossel_noite_dia_4320x1350` (panorama) + 4 fatias em `output/carrossel_noite_dia/` | Coxia (23:47) até a curva do k gigante, Roteiro (08:02) depois. A borda da noite segue a deixa; a lacuna e o bloco de Ribalta fazem a passagem, e a manhã espia na borda da lâmina 2 |

## Rodar

```bash
cd puka
npm install
npm run generate        # output/jpg/*.jpg para publicar e output/previews/*.png para conferir
npm run generate:psd    # opcional: também gera os .psd, só para edição manual
```

`marca/` é uma cópia do pacote da marca (logos, ícones, padrão, fontes). Cores e caminhos ficam em `brand.config.js`; o texto de cada peça, em `generate-templates.js`.

## O que é exemplo (confirme antes de publicar)

- **A conversa da Marina e o "23:47 / 08:02"** são simulação, marcada na própria peça. Não é cliente real.
- **"14 dias pra testar, sem cartão"** vem do fluxo n8n antigo. Confirme que a oferta continua valendo.
- **Novidades de Agenda e do aviso de conversa parada** têm texto de exemplo: o status desses recursos não está confirmado em nenhum repositório. Só publique depois de confirmar o que está no ar.
- **Foto:** `feed_foto` só fica pronto com uma foto real, com autorização.
- **Tela do produto:** a captura é da conta de teste do Enzo (`marca/telas/conversa.png`). Troque por uma conta de demonstração limpa quando quiser.
- Nenhum preço de plano aparece em peça alguma.

## Regras do manual aplicadas

- Haste reta, sem cantos arredondados. Deixa só em Ribalta (ou Ribalta Acesa no escuro), uma por peça, entrando pela direita.
- IA em Ponto, pessoa em Ribalta, nunca o contrário. Texto pequeno em Ribalta Funda.
- A lacuna nunca fecha e fica sempre à vista, longe das emendas das lâminas.
- Sem sobreposição: nada fica atrás de texto.
