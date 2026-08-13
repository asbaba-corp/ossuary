# Bestiário do Mundo 0

Expõe ao jogador as criaturas do Vestíbulo, até então descritas apenas em
`world_0_vestibule.md` — um doc de design que o jogador nunca vê.

## Entregue

Pop-up **Bestiário** em `prototype/scene.html`, acionado por um ícone no HUD ao
lado de Atributos, pela tecla `B` ou por `?tab=best`. Lista as cinco criaturas
do Mundo 0 mais o guardião Caronte, cada uma com nome, epíteto, papel, figura,
dano, drops e o que testa no jogador.

## Decisões

**Dano é placeholder.** Nenhum valor por espécie existia: o design doc descrevia
papéis qualitativamente e a simulação usa uma fórmula única para todos os mobs
(`2 + rng*3 + onda*0.32`, cadência 1,15 s). Os números foram derivados dos papéis
e estão marcados como ilustrativos na própria UI, seguindo a convenção já usada
em "arte placeholder" e "preços ilustrativos". Foram registrados também em
`world_0_vestibule.md` para que doc e código não divirjam.

**Figuras são procedurais.** Só o Ignavo tinha sprite. Moscardo, Gorja,
Encalhado, Marcado e Caronte ganharam arte pixelada nova (14×17, mesmo estilo e
paleta do `MOB` existente), desenhada no próprio `scene.html`. O Marcado
reaproveita a silhueta do Ignavo com a queimadura do remo nas costas, que é
literalmente o que o design descreve. Sem dependência de arquivo externo: o
protótipo continua funcionando por `file://`.

**Conteúdo é dado.** A tabela `BESTIARY` guarda as entradas; a montagem das
fichas acontece uma vez, fora do loop de render — nada ali depende do estado da
simulação.

## Diferenças em relação ao plano

Nenhuma.

## Verificação

Aberto no navegador. Confirmado: o ícone aparece no HUD; as seis fichas montam
com figura desenhada (canvas com pixels não vazios); `B` abre e alterna; `Escape`
fecha; `C` troca para Atributos sem deixar dois pop-ups abertos; sem erros no
console.

`?tab=best` não pôde ser observado no painel de preview, que descarta a query
string. As duas metades do caminho foram verificadas isoladamente: `best` está
em `TABS` e `setTab("best")` funciona.
