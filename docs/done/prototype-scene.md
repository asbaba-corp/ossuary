# Protótipo de cena — sidescroller com onda

## Objetivo

Ver na tela o core loop do §3.2 do core design funcionando: party caminha → onda entra → para → auto-combate → onda limpa → volta a andar. Alvo é validar ritmo e leitura visual, não arquitetura final.

## Restrição de arte

A referência em `references/` é um screenshot da página do itch.io do **Mix Bone Dungeon Tileset — Skeleton Sprite Pack VOL. II** (NeoPixelBoyCo, US$ 3,99). É arte comercial paga, com preview em marca d'água — não é fonte de asset utilizável.

O protótipo usa **arte placeholder gerada por código** na mesma linguagem visual (parede de caveiras, colunas, tochas, paleta óssea). A camada de render é separada da simulação, então trocar placeholder por tileset comprado é troca de asset.

## Escopo

- Canvas 2D puro, sem dependência externa (roda em qualquer navegador)
- Parallax de 3 camadas: parede de caveiras, colunas com tochas, chão
- Herói com animação de caminhada
- 5 Ignavos por onda, entrando por scroll pela direita
- Auto-combate tick-based, determinístico, com PRNG semeado
- HUD com saldo da run (§5.3): ouro de loot menos ouro de poção
- Poção automática por limiar de HP, queimando ouro

## Fora de escopo

- React Native / Skia — o protótipo é para ver, não é o cliente
- Party de 4 (começa com 1, como o design prevê)
- Equipamento, spells, ossos, progressão de fase

## Verificação

Abrir no navegador e confirmar: o ciclo andar → onda → combate → limpar → andar se repete sem travar, o saldo da run muda a cada onda, e a poção dispara quando o HP cai.

---

## Entregue

`prototype/scene.html` — arquivo único, sem dependências, roda em qualquer navegador.

**Além do escopo previsto**, dois sistemas do core design entraram porque o teste headless mostrou que faltavam:

- **Piso de ouro** (§5.3). O primeiro teste terminou com 33 HP e 7 de ouro: sem ouro não há poção, e o código deixava o herói lutando em 0 HP. O piso impede a poção de furar a reserva.
- **Recuo** (§3.3). Ao esgotar HP sem poção, a party recua para uma fase mais rasa, recupera e retoma — em vez de morrer ou travar.

**Ferramentas de verificação criadas:**

- `?t=SEGUNDOS` adianta a simulação antes do primeiro render. Necessário porque o `--virtual-time-budget` do Chrome headless **não** avança o `requestAnimationFrame` — sem isso, capturas de tela mostram sempre o frame inicial.
- Smoke test headless em Node com stub genérico de canvas 2D: roda ~3 min de jogo e reporta fases visitadas, saldo e HP.

Captura: `"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless --screenshot=out.png "file://…/scene.html?t=11.3"`

## Arte: onde parou e por quê

Cenário 100% desenhado por código, em técnica de gradiente em meia resolução ampliado ×2 sem interpolação. Nada do pack pago foi usado.

Três iterações de correção, todas guiadas por screenshot:

1. **Contorno preto** em volta de cada caveira → removido. Era o principal sinal de cartum; a referência não tem contorno nenhum.
2. **Órbita com canto interno mais alto** → invertido. Esse é o desenho de sobrancelha franzida, e dava cara de personagem a cada crânio.
3. **Parede iluminada por igual** → agora vive na penumbra, revelada só pelas poças de luz dos castiçais.

A terceira foi a que mais rendeu: além de atender o pedido de mais sombrio, dá função real às tochas e disfarça o limite da anatomia procedural.

**Limite conhecido:** proporção de crânio é algo que o olho reconhece e perdoa pouco. O placeholder segura o protótipo, mas o pack de US$ 3,99 resolve melhor — e a troca é de textura, não de código.
