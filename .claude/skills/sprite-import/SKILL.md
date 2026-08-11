---
name: sprite-import
description: Importa um spritesheet da pasta sprites/ e atribui a um personagem do jogo (herói, mob, boss). Use quando o usuário pedir para trocar/atribuir sprite de um personagem, importar um pack novo, ou mencionar sprites, spritesheet, animação de personagem, idle/walk/attack.
---

# Importar spritesheet e atribuir a um personagem

Packs de sprite vêm com dimensões, contagens de quadro e enquadramento
imprevisíveis. **Meça, não presuma** — errar a contagem faz a animação pular,
e errar a linha dos pés faz o personagem flutuar.

## 1. Antes de tudo: a licença

A pasta `sprites/` está no `.gitignore` de propósito. Packs gratuitos (CraftPix
e similares) costumam permitir usar a arte no jogo e **proibir redistribuir os
arquivos** — repositório público conta como redistribuição.

```bash
rtk proxy cat sprites/<pack>/License.txt 2>/dev/null
rtk proxy git check-ignore -v sprites/    # tem que estar ignorado
```

Se o pack não estiver ignorado, pare e avise antes de qualquer commit.
Nunca embuta os PNGs como data URI num arquivo versionado: é o mesmo problema
por outro caminho.

## 2. Encontrar as folhas uniformes

Muitos packs trazem duas versões: recortada (quadros de larguras diferentes) e
uniforme (grade fixa, normalmente numa pasta tipo `Spritesheet 128`).
**Use sempre a uniforme** — a recortada não fatia por divisão simples.

```bash
rtk proxy find sprites/<pack> -name '*.png' | head -30
```

## 3. Medir

```bash
rtk python3 -c "
from PIL import Image
import glob, os
D = 'sprites/<pack>/<pasta>'
for f in sorted(glob.glob(D + '/*.png')):
    im = Image.open(f); w, h = im.size
    print(f'{os.path.basename(f):20} {w:5}x{h:3}  quadros={w//h}  resto={w%h}')
"
```

- `resto` diferente de zero significa que o quadro **não** é quadrado, ou que a
  folha não é uniforme. Investigue antes de seguir.
- `quadros` é o valor que vai em `frames`.

Agora a linha dos pés, dentro do primeiro quadro:

```bash
rtk python3 -c "
from PIL import Image
im = Image.open('sprites/<pack>/<pasta>/Idle.png')
F = im.size[1]
print('bbox do conteúdo no quadro 0:', im.crop((0,0,F,F)).getbbox())
"
```

O quarto valor do bbox é o `footY`. Se o conteúdo termina no fim do quadro,
`footY` é o próprio tamanho do quadro.

## 4. Conferir para que lado o personagem olha

```bash
rtk python3 -c "
from PIL import Image
im = Image.open('sprites/<pack>/<pasta>/Idle.png')
F = im.size[1]
im.crop((0,0,F,F)).resize((F*3,F*3), Image.NEAREST).save('/tmp/frame0.png')
"
```

Leia `/tmp/frame0.png`. O jogo assume que o personagem olha para a **direita**.
Se olhar para a esquerda, inverta a lógica de `flip` em `drawSheet` para esse
personagem — não espelhe os arquivos.

## 5. Registrar no bloco SPRITES

Em `prototype/scene.html`, procure `==================== SPRITE SHEETS`:

```js
const SPRITES = {
  hero: {
    base: "../sprites/<pack>/<pasta>",
    frame: 128,        // lado do quadro, em pixels
    scale: 1.3,        // ajuste para a altura desejada em tela
    footY: 128,        // linha dos pés dentro do quadro
    faces: "right",
    anims: {
      idle:   { file: "Idle.png",     frames: 4, fps: 6 },
      walk:   { file: "Walk.png",     frames: 8, fps: 10 },
      attack: { file: "Attack 1.png", frames: 5, fps: 13, loop: false }
    }
  }
};
```

Regras do bloco:

- **`idle`, `walk` e `attack` são obrigatórios.** O restante é opcional.
- `loop: false` só na de ataque: ela precisa terminar, não repetir.
- `fps` da animação de ataque deve caber na cadência do personagem — com
  `frames / fps` maior que o intervalo entre golpes, a animação nunca fecha.
- Arquivo com espaço no nome funciona: o carregador aplica `encodeURIComponent`.

Para um personagem novo (mob, boss), acrescente outra chave em `SPRITES` e
chame `drawSheet` no ponto de desenho dele, com o mesmo padrão de fallback:

```js
const usou = SPRITES.<chave>.ready &&
  drawSheet(SPRITES.<chave>, estadoAtual, tempoDaAnim, centroX, GROUND, olhandoParaEsquerda);
if (!usou) { /* desenho procedural existente */ }
```

**Nunca remova o fallback procedural.** Quem clonar o repositório não terá a
pasta `sprites/`, e o artifact publicado não consegue carregar arquivo externo.

## 6. Verificar vendo

`file://` não deixa o canvas usar imagem local — sirva por HTTP:

```bash
python3 -m http.server 8765 &
CH="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
for T in 3 6.5 11.3; do    # andando · parado · combate
  "$CH" --headless --disable-gpu --virtual-time-budget=6000 \
    --window-size=1040,520 --screenshot="/tmp/sprite_$T.png" \
    "http://localhost:8765/prototype/scene.html?t=$T"
done
```

Abra as três imagens e confirme, nesta ordem:

1. O personagem **aparece** (se não, o fallback assumiu — veja o console)
2. Os pés tocam o chão, sem flutuar nem afundar
3. O tamanho conversa com os inimigos ao redor
4. Andando, a animação cicla sem tranco
5. No combate, o golpe dispara e termina

Confirme também que o fallback continua vivo, carregando por `file://`:
o protótipo deve mostrar a arte procedural em vez de um personagem invisível.

## 7. Fechar

Varra as docs conforme o `AGENTS.md` e registre no corpo da PR qual pack foi
usado, de onde veio e sob qual licença — sem isso ninguém consegue auditar a
procedência da arte depois.
