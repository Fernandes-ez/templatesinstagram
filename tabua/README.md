# Templates de Instagram da Tábua (direção "Letreiro")

Gera 10 templates (20 peças) em `.psd` com camadas editáveis e um `.png` de prévia de cada um.
Nenhuma peça mostra preço ou plano da Tábua: a precificação ainda vai mudar.

| Template | Peça(s) | O que é |
|---|---|---|
| 1. Comanda | `story_1080x1920` | Pedido chegando: Nº 047, itens, total, carimbo. Zonas seguras de 250 px |
| 2. Antes / depois | `feed_antes_depois_1080x1350` | Comissão de exemplo riscada × R$ 0,00 de comissão |
| 3. Carrossel | `carrossel_capa`, `carrossel_miolo`, `carrossel_final` | Gancho, 3 itens com ícones, tagline + CTA |
| 4. Dica de balcão | `feed_dica_1080x1350` | Número grande, ícone próprio e texto curto |
| 5. Anúncio | `feed_anuncio_1080x1350` | Faixa, título com letreiro, card "10 min" e CTA |
| 6. Tela do produto | `feed_tela_cardapio_1080x1350` | Cardápio de exemplo (restaurante fictício) em placa |
| 7. Enquete | `feed_enquete_1080x1350` | Pergunta com duas respostas (A e B) para os comentários |
| 8. Foto + título | `feed_foto_titulo_1080x1350` | Foto real do balcão em placa e frase curta (precisa de foto) |
| 9. Novidade / Em breve | `feed_novidade_*` (retirada agendada, balcão, estoque) | Faixa, título, placa com 3 itens e carimbo "NOVO" ou "EM BREVE". Textos em `NOVIDADES` |
| 10. Carrossel contínuo | `carrossel_continuo_6480x1350.psd` + 6 fatias em `output/carrossel_continuo/` | Uma arte única fatiada em 6 lâminas: o azulejo, o fio tracejado e as placas com ícone atravessam as emendas |

O que o produto já entrega e o que pode (ou não) virar post está em [CONTEUDO.md](CONTEUDO.md).

## Rodar

```bash
cd tabua
npm install
npm run generate   # output/*.psd, output/previews/*.png, output/assets/*.png
```

`marca/` é uma cópia do pacote da marca do repositório `tabuaapp` (fontes Anybody e Atkinson, logos, azulejo, ícones). Se a marca mudar lá, copie de novo.
Cores, fontes e caminhos ficam em `brand.config.js`; o texto de cada peça, em `generate-templates.js`.

## Ainda falta

- Os textos "27%" e "cem reais" são **exemplo declarado** na própria peça. Se for afirmar a taxa de um marketplace, precisa de fonte.
- Gerar JPG direto (sem PSD) para o n8n: a lógica de desenho em canvas já existe e pode virar o serviço de render.
- `feed_foto_titulo` só fica pronto com uma foto real (camada `FOTO_AQUI`). Prato do dia e depoimento foram removidos até haver foto e autorização de cliente.
- A tela do cardápio usa o "Bar do Zé", restaurante fictício do próprio site, e está marcada "Cardápio de exemplo". Trocar por capturas reais quando houver.

## Carrossel contínuo

É uma arte só de 6480×1350 (6 × 1080). As guias do PSD marcam as emendas. As fatias `carrossel_continuo_01.png` a `_06.png` já saem prontas no tamanho do Instagram (1080×1350). Para trocar o texto de uma parada, edite o vetor `paradas` em `carrosselContinuo()` e rode `npm run generate`: a posição das placas nas emendas é recalculada. Se mudar o número de lâminas, ajuste `N`.
