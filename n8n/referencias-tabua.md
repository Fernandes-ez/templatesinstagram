# Referências do Tábua para o radar

Levantado por busca na web. **Os @ do Instagram não foram confirmados** (a busca não indexa perfis), exceto onde indicado. Para cada candidato, abra o perfil, confirme que é o oficial e que é conta **Business/Creator** (só essas aparecem na Business Discovery).

## Já no radar (confirmados por você)
| Perfil | Grupo |
|---|---|
| `goomer_br` | direto (cardápio digital) |
| `cardapio.web` | direto |
| `olaclickbrasil` | direto |
| `instadelivery.com.br` | direto |
| `menudinobr` | **adjacente**: plataforma de delivery, outro segmento; só referência de linguagem com o dono de restaurante |

Anota AI, Neemo e Abrahão: sem perfil encontrado, ficam fora.

## Concorrentes diretos (cardápio digital e pedido próprio): procurar o @
| Empresa | O que a busca mostrou | Fonte |
|---|---|---|
| **Anota AI** | Citada como uma das soluções mais completas do segmento | [GironEWS](https://gironews.com/food-service/melhores-plataformas-de-cardapio-digital-para-restaurante-no-brasil/) |
| **Neemo** | Cardápio digital de SP, diz atender 5 mil restaurantes, foco em vender sem comissão de marketplace | [Saipos](https://saipos.com/neemo) |
| **Olaclick** | Cardápio digital e PDV, promete cardápio sem comissão, diz ter +40 mil restaurantes (números da própria empresa) | [Olaclick](https://olaclick.com/en/digital-menu-restaurants/) |
| **InstaDelivery** | Cardápio digital com plano gratuito; reportagem de 2022, confirmar se ainda opera igual | [Startups.com.br](https://startups.com.br/noticias/cardapio-digital-instadelivery-planeja-expansao-internacional-em-2023) |
| **Abrahão** | Foi comprada pela Goomer (a data diverge: 2023 numa fonte, 2025 em outra) | [Baguete](https://www.baguete.com.br/noticias/goomer-compra-maior-concorrente) |
| **Menudino** | Nada encontrado na busca; confirme se existe e se usa esse nome | n/d |

## Marcas similares (outro produto, mesmo público: dono de restaurante)
| Empresa | Por que vale | Fonte |
|---|---|---|
| **Saipos** | Sistema de gestão e PDV (diz +11 mil restaurantes). Tem blog forte de conteúdo para restaurantes, incluindo dicas de Instagram | [Saipos](https://saipos.com/marketing-para-restaurante/dicas-para-instagram-de-restaurantes) |
| **iFood (Cardápio Digital)** | Concorrente indireto, referência de linguagem para o dono de restaurante. Preços da fonte são de 2021, não usar | [Mercado & Consumo](https://mercadoeconsumo.com.br/2021/08/29/novo-cardapio-digital-do-ifood-promete-beneficios-para-donos-de-restaurantes/) |
| **Sebrae** (regionais) | Conteúdo educativo de Instagram e gestão para pequenos negócios | [Sebrae PR](https://sebraepr.com.br/comunidade/artigo/3-dicas-para-deixar-o-instagram-da-sua-marca-mais-relevante) |
| **Stone** | Conteúdo para restaurantes ligado a pagamento | [Stone](https://conteudo.stone.com.br/como-fazer-o-seu-restaurante-se-destacar-no-instagram/) |
| **Abrasel** | A busca não trouxe conteúdo de Instagram dela; confirmar o perfil oficial manualmente | n/d |

## Pautas que a pesquisa já sugere (para o radar confirmar com dados)
- A Goomer fala em "Cardápio Digital 2.0" para 2026 e em compra de concorrente: movimento do mercado, **contexto interno, não afirmação nossa** ([Central do Varejo](https://centraldovarejo.com.br/digitalizacao-do-foodservice-leva-goomer-a-r-4-bilhoes-em-gmv-em-2025/)).
- Conteúdo de Instagram para restaurante gira em torno de dicas de gastronomia, enquetes de prato, promoções sazonais e stories curtos de bastidor: casa com os modelos **Enquete** e **Dica de balcão**.
- Estatísticas de blogs de fornecedores ("72% dos pedidos de delivery passam pelo WhatsApp", "+35% de receita") **não têm fonte verificável**: não usar em post.

## Como validar o @ antes de rodar
No Graph API Explorer, com o token da conta Business do Tábua, consulte `GET /{ig_user_id}?fields=business_discovery.username(NOME){username,followers_count}`. Se voltar erro, o perfil é pessoal, não existe ou o @ está errado.
