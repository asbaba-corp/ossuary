# Porte da cena para o app

## Por que existe

O jogo só existia como `prototype/scene.html`: um arquivo solto, que roda no
navegador e não vira app. A tentativa anterior de trazê-lo para o Expo parou
num meio-termo — a cena era montada com `<View>` posicionada por estilo, o que
não reproduz parallax nem iluminação, e no celular não havia cena alguma.

Este documento cobre o porte de verdade: a cena passa a ser desenhada em Skia,
que roda nas três plataformas, com paridade de comportamento com o protótipo.

## Estado ao começar

Já resolvido em commits anteriores desta branch:

- Merge da `main`, 44 commits de atraso zerados
- Skia ligado: `SceneRenderer` reexporta `SkiaScene`, CanvasKit carregando no
  web via `index.web.ts`
- Bug de domínio: farmar a mesma fase derrubava o tick (id de instância
  determinístico). Coberto por teste de regressão
- Cobertura do core: 77 → 91 testes, incluindo `save` e `economy`, que tinham zero

**A cena, porém, não está funcional.** É um esboço, não uma réplica.

## Defeitos a corrigir

Levantados rodando o app e comparando com o protótipo:

| # | Defeito | Causa |
|---|---|---|
| 1 | Inimigos de costas | `SpriteAtlas` recebe `flip` na assinatura e nunca usa |
| 2 | Herói desfigura e muda de tamanho | Escala do atlas depende da contagem de quadros declarada; divergência entre config e folha distorce |
| 3 | Parede com bolas brancas | 46 círculos cinza como placeholder de caveira |
| 4 | Números de dano congelados | Não sobem nem desvanecem; posição fixa |
| 5 | Barras de vida/mana/exp transbordando | `bar` definido duas vezes no mesmo StyleSheet, com formas incompatíveis |
| 6 | HUD sem paridade | App tem ONDA/OURO/ABATES; o protótipo tem night/wave/gold e Session Analyzer |

## Escopo

1. **Atlas de sprite confiável** — contagem de quadros derivada da largura real
   da imagem, não do config. Espelhamento aplicado de fato.
2. **Cena** — parede de ossuário na penumbra, revelada por poças de luz, como
   no protótipo. Sem placeholder de círculos.
3. **Números flutuantes** — sobem, desvanecem e empilham em vez de sobrepor.
4. **HUD** — night / wave / gold com ícone, e Session Analyzer com session time,
   balance, waste, loot, potions available, poeira e damnations.
5. **Ficha** — barras com altura e recorte próprios; o conflito de estilo sai.

## Fora de escopo

- Aposentar o `prototype/scene.html`. Ele continua como referência visual até a
  paridade ser aceita; remover antes disso é perder o gabarito.
- Build de APK. Depende de conta Expo/EAS e é passo separado.
- Reescrever mecânica: a simulação já vem do `packages/core` e não se toca.

## Verificação

Não basta uma captura: foi o que falhou da última vez. Estático não mostra
animação, escala nem transbordo.

- Sequência de quadros ao longo do tempo, conferindo que o herói mantém tamanho
  entre animações e que os inimigos encaram a party
- Estado com combate ativo, conferindo que os números sobem e somem
- Layout em largura estreita, conferindo que as barras não vazam
- `pnpm typecheck` e a suíte do core verdes


---

## Entregue

| # | Defeito | Como ficou |
|---|---|---|
| 1 | Inimigos de costas | `flip` implementado: espelha em torno do próprio centro |
| 2 | Herói mudando de tamanho | Contagem de quadros lida de `image.width() / FRAME`, não de tabela |
| 3 | Bolas brancas na parede | Ossuário desenhado com caveiras (calota, maxilar, órbitas, nasal) na penumbra |
| 4 | Números congelados | Nascem sobre o alvo, sobem e desvanecem; feedback ganhou `epoch` e `alvo` |
| 5 | Barras transbordando | `bar` estava definido duas vezes no StyleSheet; a segunda vencia |
| 6 | HUD sem paridade | **Não feito** — ver abaixo |

### Decisões

**Contagem de quadros vem do arquivo, não do config.** Era a causa do herói
desfigurar: qualquer divergência entre tabela e folha esticava a imagem
inteira. Lendo a largura real, essa classe de bug deixa de existir.

**Poça de luz com degradê radial.** Um `Circle` de opacidade fixa lia como
disco marrom chapado.

**Parede em penumbra.** Mesma leitura do protótipo: escura por padrão, com as
caveiras se revelando perto dos castiçais.

### O que ficou de fora, e por quê

**Paridade de HUD (#6).** O app tem HUD própria (ONDA / OURO / ABATES); o
protótipo tem night / wave / gold e o Session Analyzer. São duas
implementações independentes, e portar a HUD é trabalho de tamanho
comparável ao da cena. Fica para a PR seguinte, com escopo próprio.

**Verificação visual da última rodada.** As correções de #1 a #5 foram
conferidas numa sequência de quatro quadros ao longo do tempo. O ajuste final
— degradê na luz, caveiras menores, chave única no feedback — **não** foi
capturado: o Chrome parou de gerar imagem depois de muitas instâncias, com o
disco a 98%. Typecheck e os 91 testes do core passam; a conferência visual
desse último passo continua pendente.

### Lição de processo

A rodada anterior foi dada como pronta a partir de **uma captura estática**.
Estático não mostra animação, escala nem transbordo — justamente onde estavam
todos os defeitos. Mudança de renderer se verifica com sequência ao longo do
tempo, não com um quadro.
