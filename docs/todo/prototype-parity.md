# Paridade entre prototype e aplicação

## Objetivo

Usar `prototype/scene.html` e a home Expo lado a lado até a aplicação reproduzir
o comportamento e a composição visual do prototype, substituindo somente as
regras locais pelas mecânicas validadas no core/Lab.

## Ordem de trabalho

1. Corrigir o renderer de spritesheets: frame size, direção, ciclo de animação,
   ataque, dano e morte devem corresponder ao tempo dos eventos do combate.
2. Reproduzir a cena do prototype em um renderer próprio, incluindo parallax,
   parede, chão, colunas, iluminação, partículas e números flutuantes.
3. Migrar o HUD, party cards, ícones SVG, modais e ledger sem trocar a
   composição visual por uma tela genérica.
4. Comparar mecânica por mecânica e adicionar ao core/Lab o que só existe no
   prototype: poções automáticas, saldo por abate, poeira, recuo econômico,
   slots pagos e waves contínuas.
5. Só remover o prototype quando a comparação visual e os cenários de domínio
   passarem.

## Estado atual

O prototype foi restaurado para análise lado a lado. A integração Expo ainda é
um trabalho intermediário; os sprites de mochila não existem como PNG porque o
prototype usa um SVG inline para esse ícone.

## Comparação `prints/old.png` × `prints/new.png`

A primeira comparação confirmou os seguintes desvios e foi incorporada nesta
rodada:

- HUD e botões foram reposicionados para a mesma faixa superior do prototype;
- a cena foi ampliada para a altura da referência e ganhou teto, parede,
  colunas, tochas e chão;
- party voltou a usar quatro colunas de largura equivalente;
- XP, vida e mana passaram a aparecer na ficha, com barras próprias;
- ledger passou a exibir loot, gasto, saldo, abates, poeira e recuos;
- inventário, atributos e bestiário passaram a abrir como modal;
- o recorte/espelhamento dos sprites foi separado para evitar frame deslocado.

Os próximos prints ou GIFs devem ser usados para calibrar escala, posição e
tempo dos frames, especialmente durante ataque, dano e morte.

## Comparação `prints/old.mp4` × `prints/new.mp4`

Os vídeos mostraram que os modais ainda estavam visualmente simplificados:

- o inventário do prototype tem barra de ações, contador, paginação e 48 slots
  organizados em 16 colunas;
- atributos é um modal estreito com duas colunas, separando primários e
  derivados;
- o bestiário é uma grade de cards, com arte à esquerda e descrição/valores à
  direita;
- a ordem inferior é party, ledger e controles.

Esta rodada reproduz essas estruturas no View, mantendo os valores derivados
do ViewModel/core.

Também foram corrigidos os principais sinais visuais da cena: escala dos
sprites conforme o prototype, ataque/dano/morte vinculados aos eventos de
combate e paginação funcional da mochila em três páginas de 48 slots.

## Correção de diagnóstico

A comparação do código revelou que a cena ainda não é uma migração do
renderer: `prototype/scene.html` desenha um canvas de 960×384 com câmera,
parallax, texturas procedurais, iluminação, partículas, assentamento por
`footY` e máquina de estados de animação. A implementação Expo atual usa um
`View` de 400px com posições em porcentagem, símbolos Unicode e recorte de
PNG. Esses dois modelos não produzem a mesma cena.

Próxima decisão de implementação: substituir apenas o renderer `Scene` por um
renderer de jogo baseado na geometria e no ciclo do canvas do prototype,
alimentado pelo estado de combate do core. HUD, party, ledger e modais ficam
como Views/MVVM.

## Renderer Skia em andamento

O `Scene` da home já foi substituído por `SkiaScene`: CanvasKit foi configurado
para web, os sprites são recortados por atlas e a cena usa a base 960×384 do
prototype. Esta etapa também adicionou câmera/parallax inicial, parede de
ossos, cascalho, tochas, luz ambiente e números flutuantes. A calibração final
de posições e textura ainda depende de um novo vídeo capturado no app.

## Correção de inicialização

O primeiro carregamento do Skia web falhava porque o WASM era servido como
HTML pelo caminho incorreto. O CanvasKit agora fica em `apps/expo/public` e é
carregado por `/canvaskit.wasm`; o caminho nativo usa um `SceneRenderer` sem
importar Skia, evitando crash no Expo Go enquanto o development build nativo
não estiver instalado.

O primeiro recorte por `Atlas` também deslocava os inimigos quando combinado
com espelhamento negativo. O recorte foi trocado por `Image` dentro de um
`clip` de frame, equivalente ao `drawImage` do prototype; a posição foi
validada em screenshot automatizado do web.

## Decisão de portabilidade

As aproximações do renderer Skia não são suficientes para paridade. A próxima
implementação deve portar diretamente a ordem e as funções de desenho do
canvas (`frameOf`, `drawSheet`, `column`, `light`, texturas, câmera e
partículas) para TSX/Skia, preservando as constantes do HTML. O CSS dos painéis
deve ser convertido a partir dos mesmos tokens, sem criar uma segunda
composição visual baseada em interpretação.

Nesta conversão, o renderer web passou a usar `HTMLCanvasElement` diretamente,
com as constantes e a ordem de desenho do prototype. Os sprites usam os
assets resolvidos pelo Metro (`require`), e não caminhos `/sprites` que o
servidor Expo não expõe como arquivos públicos. O bootstrap global do Skia foi
removido da entrada porque a cena web agora é o próprio canvas do prototype.
