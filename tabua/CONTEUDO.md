# O que o Tábua entrega e o que pode virar post

Levantado do repositório `tabuaapp` (branch `feat/tabua-plataforma` e branches `feat/fase-*`) e do roteiro das fases 6 a 10.
**Preço e planos ficam de fora de todo post** (a precificação vai mudar). Não anunciar nada marcado "só com aprovação".

## 1. Já existe no código (pode virar post, confirme que está no ar para os clientes)

| Recurso | Fase | Como aparece no produto | Modelo de post |
|---|---|---|---|
| Cardápio com QR geral e por mesa, PDF para gráfica | base | Cardápio público, display de mesa | anúncio, dica |
| Esgotado num toque, mudar preço no meio do almoço | base | Editor de cardápio | dica ("Acabou o frango?") |
| Pedido pelo WhatsApp (carrinho vira mensagem) | base | Cardápio | carrossel miolo |
| Pedido pelo sistema: mesa (QR), retirada, delivery por raio no mapa | base | Cardápio e painel | carrossel, tela do produto |
| Acompanhamento do pedido em tempo real | base | Página `/pedido/[token]` | comanda (story) |
| Painel ao vivo, tela da cozinha, comanda 80 mm, chamar garçom | base | Painel | comanda, dica |
| Cupons e cartão fidelidade (carimbos viram cupom) | base | Cardápio e conta do cliente | dica, novidade |
| Pix no pedido (conta do restaurante) | base | Checkout | comanda ("CONFIRMADO · PIX") |
| Tempo de preparo e modo movimentado | 2 | "Retirada em X–Y min"; +15/+30 min em um toque | dica, novidade |
| **Retirada agendada** (desligada por padrão) | 2 | Cliente escolhe horário, com capacidade por horário | `feed_novidade_retirada_agendada` |
| Base de clientes e consentimento | 4 | Tela Clientes, métricas, LGPD | dica ("conheça sua freguesia") |
| **PDV de balcão** (módulo): pagamento dividido, troco, desconto de gerente, CPF na nota | 5 | `/painel/pdv` | `feed_novidade_balcao` |
| **Impressão automática** da comanda na cozinha | 5a | Estação no Chrome | novidade, dica |

## 2. Pronto no código, mas liberado a poucos (cuidado ao anunciar)

- **Cartão de crédito online** (4b): travado em `CARTAO_ONLINE_TENANTS`, só o restaurante de teste; a "prova real" de R$ 1,00 ainda falta. Só crédito à vista. **Não anunciar até liberar.**
- **Agendamento, fidelidade, contas de cliente:** atrás de configuração ou flag. Dizer sempre "você liga quando quiser".

## 3. Planejado (fases 6 a 10): só com aprovação, sempre como "em breve"

| Fase | Recurso | Linguagem permitida | Modelo |
|---|---|---|---|
| 6 | Estoque (módulo): esgotado automático, mínimo, entrada/perda, depois ficha técnica | "Em breve" | `feed_novidade_estoque_em_breve` |
| 7 | Avisos do pedido (push e e-mail): "pronto por volta das 12:40", "pronto para retirada" | "Em breve" | novidade |
| 8 | Campanhas por e-mail (sumidos, aniversariantes) com cupom | "Em breve" | novidade |
| 9 | NFC-e | **Não anunciar**: só homologação, depende do contador e da autorização do dono | nenhum |
| 10 | WhatsApp conectado ao próprio número do restaurante | **Não anunciar** antes da aprovação da Meta | nenhum |

## 4. Não dizer (ainda)

- Preços, planos, "R$ 59", "30 dias grátis", "preço travado": a precificação vai mudar.
- "Atendente de IA": só existe como add-on inativo e sem preço.
- Qualquer promessa de nota fiscal ou de WhatsApp automático.
- Taxa de marketplace como fato ("27%"): só como exemplo declarado.
- Débito online, parcelamento, carteiras digitais: fora do escopo do produto.

## 5. Como cada recurso entra no calendário

Regra do plano de conteúdo: nenhum modelo repete em menos de 3 semanas e 1 em cada 3 posts precisa de material real (captura do painel, foto de restaurante). Os recursos acima dão ~15 assuntos; com os 11 modelos atuais cobrem cerca de 5 semanas sem repetir.

## 6. Mudanças que o fluxo n8n precisa (campo `fatos` da Tábua)

- Trocar a lista atual: remover preço e "30 dias grátis"; acrescentar agendamento, PDV, impressão automática, modo movimentado e a base de clientes.
- Manter "Atendente de IA" fora da lista até existir.
- Acrescentar o campo de status por recurso (`no_ar`, `liberado_a_poucos`, `em_breve`) e só deixar o redator citar o que está `no_ar`.
