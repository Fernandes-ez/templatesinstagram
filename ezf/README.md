# ezf.tech: templates do Instagram

Gerador dos posts da ezf.tech a partir do manual (`marca/manual/ezf-manual.html`, v0.4). Saída em JPG.

```
npm install
npm run generate
```

| Arquivo | Uso |
|---|---|
| `output/jpg/capa_carrossel.jpg` | Capa do carrossel educativo (`{3}` em destaque, campo de chaves) |
| `output/jpg/miolo_carrossel.jpg` | Lâmina de conteúdo: um ícone, uma ideia |
| `output/jpg/final_carrossel.jpg` | Última lâmina: ação no WhatsApp |
| `output/jpg/lista_recebe.jpg` | Lista "o que você recebe", um ícone por item |
| `output/jpg/numero.jpg` | Número grande com ícone (o 15 dias é exemplo, confirmar) |
| `output/jpg/pergunta_cliente.jpg` | Pergunta real de cliente como capa |
| `output/jpg/trabalho_entregue.jpg` | Site entregue (Aqua Fit); só com autorização do cliente |
| `output/jpg/antes_depois.jpg` | Antes e depois em duas linhas |
| `output/jpg/story_pergunta.jpg` | Story 1080×1920 com zonas seguras de 250 px |
| `output/carrossel_escopo/01..05.jpg` | Carrossel em escopo: `{` abre na lâmina 1 e `}` fecha na 5 |

Cada função de `generate-templates.js` recebe os textos como parâmetros (`capaCarrossel({ titulo })`, etc.); é por elas que o n8n/serviço de render vai trocar o conteúdo. Marcação de destaque: `{palavra}`.

Pendências: foto do Enzo (template de foto ainda não feito), prints de outros clientes, logo em SVG.
