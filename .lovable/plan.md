## Objetivo
Aumentar o espaçamento (respiro) entre o botão de navegação (voltar) e o título do roteiro na área de capa, evitando que os elementos fiquem visualmente colados.

## Escopo
- Arquivo: `src/components/screens/PlannerItineraryScreen.tsx`
- Ajuste fino no posicionamento absoluto do bloco de título/metadados sobre a imagem de capa.

## Implementação
1. Identificar o container absoluto que posiciona o título e metadados sobre a imagem de capa (`bottom-14`).
2. Aumentar o valor de `bottom` (ex: para `bottom-16` ou `bottom-20`) para descer o bloco de texto e criar mais espaço vertical entre o botão superior e o título.
3. Alternativamente, se o espaço total da capa for limitado, ajustar o `top` do container de botões para `top-5` ou `top-6`, ou adicionar `pt-2`/`pb-2` no container de botões.
4. Verificar que o gradiente escuro da imagem ainda oferece contraste suficiente para legibilidade do título.
5. Validar visualmente no preview que o título não fique colado ao botão de voltar.

## Critério de aceite
- Na tela do roteiro, o título deve ter um respiro claro e confortável em relação ao botão de voltar (círculo branco no topo esquerdo), sem comprometer a legibilidade sobre a imagem de capa.