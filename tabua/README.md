# Templates de Instagram da Tábua (direção "Letreiro")

Gera 5 templates (7 peças) em `.psd` com camadas editáveis e um `.png` de prévia de cada um.
Nenhuma peça mostra preço ou plano da Tábua: a precificação ainda vai mudar.

| Template | Peça(s) | O que é |
|---|---|---|
| 1. Comanda | `story_1080x1920` | Pedido chegando: Nº 047, itens, total, carimbo. Zonas seguras de 250 px |
| 2. Antes / depois | `feed_antes_depois_1080x1350` | Comissão de exemplo riscada × R$ 0,00 de comissão |
| 3. Carrossel | `carrossel_capa`, `carrossel_miolo`, `carrossel_final` | Gancho, 3 itens com ícones, tagline + CTA |
| 4. Dica de balcão | `feed_dica_1080x1350` | Número grande, ícone próprio e texto curto |
| 5. Anúncio | `feed_anuncio_1080x1350` | Faixa, título com letreiro, card "10 min" e CTA |

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
- Dois templates que dependem de foto real (prato do dia e depoimento) foram removidos até haver foto e autorização.
