import type { ReactNode } from "react";
import { useMemo } from "react";
import { Canvas, Circle, ColorMatrix, FilterMode, Group, Image as SkiaImage, LinearGradient, MipmapMode, Oval, Paint, RadialGradient, Rect, Skia, rect, useImage, vec } from "@shopify/react-native-skia";
import type { SkCanvas, SkPaint } from "@shopify/react-native-skia";
import { StyleSheet, Text, View, useWindowDimensions } from "react-native";
import type { SceneAnimation, SceneAnimationState } from "./GameViewModel";

/* Cena do Vestíbulo, desenhada em Skia — mesma pintura no web e no nativo.

   As medidas são de um palco fixo de 960×384, escalado para a largura
   disponível. Coordenadas fixas mantêm a composição igual em qualquer tela,
   em vez de recalcular tudo por porcentagem.                                */

const W = 960;
const H = 384;
const CEILING_Y = 34;
const CEILING_H = 38;
const WALL_TOP = CEILING_Y + CEILING_H;
/* Antes a parede encontrava o chão numa única linha reta (`GROUND`), como
   se a cena fosse vista de lado, sem ângulo — o "corredor de papelão". Agora
   o chão tem uma SUPERFÍCIE, não uma linha: `GROUND_BACK` é onde ela nasce,
   junto da parede, mais alta na tela porque é mais longe do jogador;
   `GROUND` continua sendo a beirada da frente, onde herói e mobs pisam —
   nada na lógica de combate ou posicionamento muda, só o desenho por trás
   deles ganha profundidade. */
const GROUND_BACK = 266;
const GROUND = 300;
const FLOOR_H = 44;
/* A coluna é adereço do FUNDO (segundo plano): do teto até onde a parede
   encontra o chão, e nada além disso — ela não pisa no chão que herói e
   mob pisam, ela é parte do pano de trás. Herói e mob caminham na frente e
   ABAIXO dela, na faixa de chão entre `GROUND_BACK` e `GROUND`. Uma coluna
   que descesse até `GROUND` ficaria na mesma linha do personagem em vez de
   atrás dele. */
const COLUNA_BASE_Y = GROUND_BACK;
const FRAME = 128;                       // lado do quadro nas folhas de sprite

/* O pack do herói tem quadro 128x64, não 128x128: a escala precisa ser maior
   para o boneco manter a altura na cena, e a largura do quadro passa a ser o
   dobro da altura — sobra transparente dos dois lados, que é normal em folha
   feita para golpe com alcance. */
const HEROI_QW = 128;
const HEROI_QH = 64;
const HERO_SCALE = 1.85;
const MOB_SCALE = 1.05;
const VAO_ENTRE_MOBS = 46;       // vão entre vizinhos da MESMA fileira
const POR_FILEIRA = 4;           // quantos cabem lado a lado antes de empilhar atrás
const RECUO_DA_FILEIRA = 26;     // cada fileira atrás fica um pouco mais longe
const PROFUNDIDADE_DA_FILEIRA = 9;
const PRIMEIRO_MOB_X = 334;      // encostado no herói de verdade, dentro do alcance do golpe
const HEROI_X = 250;
/* O cavaleiro é desenhado à esquerda do centro do seu quadro; sem isto o
   número de dano dele sobe deslocado para a direita. */
const DESVIO_NUMERO_HEROI = -20;
/* A horda entra de FORA do palco (960 de largura): o primeiro mob começa em
   372+660=1032, além da borda direita. Com 300 ela nascia em 672, dentro do
   quadro — a onda seguinte aparecia do nada no meio da cena. */
const ENTRADA_DA_HORDA = 660;
/* A horda só entra depois da metade da marcha. Antes dela o corredor corre
   vazio, com os corpos da onda passada ficando para trás — é o trecho de
   caminhada que dá o ar de cenário sem fim. */
const INICIO_DA_ENTRADA = 0.5;
/* Corpo sai da lista quando já passou bem da borda esquerda. */
const LIMITE_DO_CORPO = -160;

/** Perfil de cada inimigo: ritmo de caminhada e lugar na horda.

    Ignavo é gente, e gente não anda toda no mesmo passo nem em fila indiana.
    O perfil sai de um hash do id, então é sempre o mesmo para o mesmo bicho —
    sortear a cada quadro faria a horda tremer.

    `ritmo` 1 é o passo mais rápido, que era o de todos antes; abaixo disso o
    bicho fica para trás durante a aproximação e chega junto no fim, porque é o
    motor que decide quando a luta começa. `desvioX` e `profundidade` tiram a
    horda da linha reta: eles se amontoam com alguma folga, uns meio passo à
    frente dos outros. */
function perfilDoMob(id: string) {
  let h = 2166136261;
  for (let i = 0; i < id.length; i += 1) { h ^= id.charCodeAt(i); h = Math.imul(h, 16777619); }
  const a = ((h >>> 0) % 1000) / 1000;
  const b = ((h >>> 11) % 1000) / 1000;
  const c = ((h >>> 21) % 1000) / 1000;
  return {
    ritmo: 0.55 + a * 0.45,
    desvioX: (b - 0.5) * 30,
    profundidade: (c - 0.5) * 16,   // desloca o pé: dá amontoado com profundidade
  };
}

/* ------------------------------------------------------------- animações */

type Animation = "idle" | "walk" | "attack" | "hurt" | "dead";

/** Ritmo de cada animação. A contagem de quadros NÃO vive aqui de propósito:
    é lida da largura real da folha, para config e asset não divergirem. */
const FPS: Record<Animation, number> = { idle: 6, walk: 11, attack: 13, hurt: 14, dead: 11 };
const CICLA: Record<Animation, boolean> = { idle: true, walk: true, attack: false, hurt: false, dead: false };

const DURACAO_SINAL: Record<SceneAnimation, number> = { attack: 0.42, hurt: 0.3, dead: 0.5 };
/* O corpo ficava só por conta do scroll para sumir — sem marcha (combate,
   Loop numa mesma noite) ele nunca saía de cena, e as ondas foram ficando
   maiores (fileiras, #54), então os corpos empilhavam e pesavam o quadro.
   Agora ele para visível um instante (dá tempo do jogador registrar a
   queda) e desvanece sozinho, sem depender de a câmera andar. */
const ATRASO_CORPO = 1.4;                // segundos parado antes de começar a sumir
const FADE_CORPO = 0.4;                  // desvanecer depois da animação de morte
const VIDA_NUMERO = 0.7;                 // quanto um número flutuante dura
const VIDA_CLARAO = 0.32;                // quanto o pisca de acerto dura

/** Pinta tudo de branco mantendo o alfa: é o que faz o sprite piscar sem
    virar um retângulo. */
/* Pixel art ampliada tem de continuar dura. O filtro padrão interpola, e a
   folha do herói tem quadro de 64px de altura desenhado a mais que o dobro:
   com interpolação o cavaleiro saía embaçado, lido como "perdeu qualidade".
   Nearest mantém o pixel quadrado; sem mipmap porque não há redução. */
const AMOSTRAGEM = { filter: FilterMode.Nearest, mipmap: MipmapMode.None } as const;

const TUDO_BRANCO = [
  0, 0, 0, 0, 1,
  0, 0, 0, 0, 1,
  0, 0, 0, 0, 1,
  0, 0, 0, 1, 0,
];

/* --------------------------------------------------------------- sprites */

type Folhas = Record<Animation, ReturnType<typeof useImage>>;

/** Um quadro da folha, recortado e opcionalmente espelhado.

    A contagem de quadros vem de `image.width() / FRAME`, não de uma tabela.
    Quando vinha da tabela, divergir do arquivo esticava a folha inteira e o
    personagem mudava de tamanho ao trocar de animação. */
function Quadro({ image, animation, t, cx, footY, scale, flip, clarao = 0, qw = FRAME, qh = FRAME, limite }: {
  image: ReturnType<typeof useImage>;
  animation: Animation; t: number; cx: number; footY: number; scale: number;
  flip?: boolean; clarao?: number;
  qw?: number; qh?: number; limite?: number;
}) {
  if (!image) return null;

  /* Grade, não fileira. O primeiro pack tinha quadros quadrados numa linha só;
     o 2D SL Knight vem em blocos de 128x64 espalhados por várias linhas, lidos
     da esquerda para a direita e de cima para baixo. Contar por
     `largura / 128` só funcionava para o primeiro caso.

     `limite` existe porque uma folha pode guardar VÁRIAS animações — o
     `Attacks.png` traz cinco golpes de oito quadros em cinco linhas, e o jogo
     usa um. Sem o limite a animação percorreria os cinco. */
  const colunas = Math.max(1, Math.round(image.width() / qw));
  const linhas = Math.max(1, Math.round(image.height() / qh));
  const total = Math.max(1, Math.min(limite ?? colunas * linhas, colunas * linhas));

  const bruto = Math.floor(Math.max(0, t) * FPS[animation]);
  const indice = CICLA[animation] ? bruto % total : Math.min(bruto, total - 1);
  const coluna = indice % colunas;
  const linha = Math.floor(indice / colunas);

  const largura = qw * scale;
  const altura = qh * scale;
  const x = Math.round(cx - largura / 2);
  const y = Math.round(footY - altura);

  const espelha = (conteudo: ReactNode) => flip
    ? <Group transform={[{ translateX: 2 * (x + largura / 2) }, { scaleX: -1 }]}>{conteudo}</Group>
    : <>{conteudo}</>;

  const recorte = (
    <Group clip={rect(x, y, largura, altura)}>
      <SkiaImage
        image={image}
        x={x - coluna * largura} y={y - linha * altura}
        width={largura * colunas} height={altura * linhas}
        fit="fill" sampling={AMOSTRAGEM}
      />
    </Group>
  );

  /* O clarão é uma SEGUNDA passada do mesmo quadro, pintada de branco por uma
     camada, e a camada fica POR FORA do espelhamento. */
  return (
    <>
      {espelha(recorte)}
      {clarao > 0 && (
        <Group opacity={clarao} layer={<Paint><ColorMatrix matrix={TUDO_BRANCO} /></Paint>}>
          {espelha(recorte)}
        </Group>
      )}
    </>
  );
}

/* ----------------------------------------------------------------- parede */

/* Paleta do ossuário, a mesma do protótipo: crânio em três tons (aceso, meio,
   fundo) sobre parede quente escura, órbitas quase pretas. Chapar tudo num tom
   só era o que fazia a parede ler como bolhas claras em vez de osso. */
const TONS = [
  { lit: "#8e8079", mid: "#5f544f", dim: "#2f2827" },
  { lit: "#9c8d84", mid: "#695d57", dim: "#352d2b" },
  { lit: "#82746e", mid: "#564b47", dim: "#2a2423" },
  { lit: "#96877f", mid: "#635751", dim: "#312a28" },
] as const;

const PAREDE_FUNDO = "#3a3230";
const ORBITA = "#100d0d";
const FENDA = "#26201f";

/** Mistura duas cores hex. Serve ao recuo: quanto mais fundo o crânio está na
    pilha, mais ele tende à cor da parede — é isso que dá profundidade sem
    precisar desenhar sombra para cada um. */
function mistura(a: string, b: string, k: number) {
  const ler = (c: string) => [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16));
  const [ar, ag, ab] = ler(a);
  const [br, bg, bb] = ler(b);
  const canal = (x: number, y: number) => Math.round(x + (y - x) * k).toString(16).padStart(2, "0");
  return `#${canal(ar!, br!)}${canal(ag!, bg!)}${canal(ab!, bb!)}`;
}

type Tom = { lit: string; mid: string; dim: string };
const recua = (tom: Tom, k: number): Tom => ({
  lit: mistura(tom.lit, PAREDE_FUNDO, k),
  mid: mistura(tom.mid, PAREDE_FUNDO, k),
  dim: mistura(tom.dim, PAREDE_FUNDO, k),
});

/** Desenha um crânio direto no canvas.

    Deixou de ser componente React de propósito. Como componente, cada crânio
    virava ~10 nós `<Oval>`, e a parede inteira passava de dez mil nós
    reconciliados a cada quadro — com o relógio da cena avançando 20 vezes por
    segundo, era isso que travava o jogo. A parede não muda: ela só desliza.
    Então é desenhada uma vez e reaproveitada.

    A forma segue o protótipo: caixa mais ALTA que larga, maxilar recuado,
    prateleira supraciliar, afunilamento sob as órbitas e órbitas quase pretas.
    `nuca` desenha o crânio virado: sutura, sem rosto — sem ele a parede vira
    uma grade de caras encarando o jogador. */
function desenhaCaveira(canvas: SkCanvas, tinta: SkPaint, c: ItemParede) {
  const { cx, cy, r, tom, nuca } = c;
  const oval = (x: number, y: number, w: number, h: number, cor: string, alfa = 1) => {
    tinta.setColor(Skia.Color(cor));
    tinta.setAlphaf(alfa);
    canvas.drawOval(rect(x, y, w, h), tinta);
  };

  oval(cx - r * 1.22, cy - r * 0.96, r * 2.44, r * 2.52, FENDA, 0.62);   // vão atrás
  if (!nuca) oval(cx - r * 0.52, cy + r * 0.3, r * 1.04, r * 0.8, tom.dim);
  oval(cx - r * 0.82, cy - r * 1.18, r * 1.64, r * 2.16, tom.mid);        // calota
  oval(cx - r * 0.62, cy - r * 1.0, r * 0.86, r * 1.0, tom.lit, 0.5);     // luz de cima à esquerda

  if (nuca) {
    oval(cx - r * 0.05, cy - r * 0.62, r * 0.1, r * 1.44, tom.dim, 0.5);  // sutura
    return;
  }
  oval(cx - r * 0.66, cy - r * 0.46, r * 1.32, r * 0.3, tom.dim, 0.75);   // supraciliar
  oval(cx - r * 0.57, cy - r * 0.25, r * 0.48, r * 0.42, ORBITA);
  oval(cx + r * 0.09, cy - r * 0.25, r * 0.48, r * 0.42, ORBITA);
  oval(cx - r * 0.09, cy + r * 0.24, r * 0.18, r * 0.3, ORBITA, 0.85);
  oval(cx - r * 1.04, cy + r * 0.18, r * 0.56, r * 0.72, FENDA, 0.8);     // afunilamento
  oval(cx + r * 0.48, cy + r * 0.18, r * 0.56, r * 0.72, FENDA, 0.8);
}

type ItemParede = { cx: number; cy: number; r: number; tom: Tom; nuca: boolean };

/** Empilhamento determinístico: a mesma parede a cada render, sem sortear.

    Duas camadas. A de trás é menor, mais densa e muito recuada — é ela que dá
    o fundo de ossos sem forma definida; a da frente traz os crânios legíveis.
    Uma camada só, todos do mesmo tamanho, lia como padrão de papel de parede. */
const PAREDE = (() => {
  const itens: ItemParede[] = [];
  let semente = 7;
  const passo = () => (semente = (semente * 1103515245 + 12345) % 2147483648) / 2147483648;

  const camada = (passoY: number, passoX: number, rBase: number, recuo: number, chanceNuca: number) => {
    for (let linha = 0; WALL_TOP + linha * passoY < GROUND_BACK + 26; linha++) {
      const y = WALL_TOP + 10 + linha * passoY;
      const desloca = (linha % 2) * (passoX / 2);
      for (let x = -24; x < W + 380; x += passoX) {
        itens.push({
          cx: x + desloca + passo() * 7,
          cy: y + passo() * 6,
          r: rBase + passo() * (rBase * 0.35),
          tom: recua(TONS[Math.floor(passo() * TONS.length)] ?? TONS[0]!, recuo),
          nuca: passo() < chanceNuca,
        });
      }
    }
  };

  camada(24, 27, 6.6, 0.62, 0.5);   // fundo: quase sem rosto, quase cor de parede
  camada(32, 35, 9.8, 0.14, 0.32);  // frente: os crânios que se leem
  return itens;
})();

const PAREDE_L = W + 400;
const PAREDE_A = GROUND_BACK - WALL_TOP;

const COLUNAS = [90, 520, 950, 1380];
const CICLO_COLUNA = 1720;

/** Lajes de pedra irregulares para o chão — dungeon, não tábua corrida.
    Régua horizontal repetida lia como piso de madeira; pedra pede uma
    grade quebrada, com junta de argamassa e leve variação de tom por laje.

    Cada fileira tem `slots` de largura FIXA e igual (`CHAO_TILE_L / slots`)
    — é o que garante ladrilhagem perfeita, sem costura, ao repetir a
    unidade lado a lado. A pedra em si é menor que o slot (a folga vira
    junta) e balança de tamanho e tom só DENTRO do próprio slot — nunca
    cruza a borda dele. */
type Pedra = { x: number; y: number; w: number; h: number; tom: string };
const CHAO_TILE_L = 480;
const TONS_PEDRA = ["#332c22", "#26211a", "#3a3222", "#221d17", "#2c2519", "#302a1e"];
const PEDRAS = (() => {
  let semente = 41;
  const passo = () => (semente = (semente * 1103515245 + 12345) % 2147483648) / 2147483648;
  const itens: Pedra[] = [];
  /* Do fundo (junto da parede) para a frente: fileiras mais altas perto do
     jogador — o mesmo truque que já fazia as réguas venderem profundidade,
     só que agora É a própria pedra que se afasta, não uma linha por cima. */
  const fileiras = [
    { h: 16, slots: 10 },
    { h: 18, slots: 8 },
    { h: 20, slots: 7 },
    { h: 24, slots: 6 },
  ];
  let y = GROUND_BACK;
  for (const fileira of fileiras) {
    const passoX = CHAO_TILE_L / fileira.slots;
    for (let i = 0; i < fileira.slots; i++) {
      const junta = 2;
      const folgaW = passo() * 5 - 2.5;
      const folgaH = passo() * 3 - 1.5;
      itens.push({
        x: i * passoX + junta / 2,
        y: y + junta / 2,
        w: passoX - junta + folgaW,
        h: fileira.h - junta + folgaH,
        tom: TONS_PEDRA[Math.floor(passo() * TONS_PEDRA.length)] ?? TONS_PEDRA[0]!,
      });
    }
    y += fileira.h;
  }
  return itens;
})();

/* ------------------------------------------------------------------ cena */

type Enemy = { readonly id: string; readonly name: string; readonly hp: number; readonly maxHp: number };
type Feedback = { readonly id: string; readonly alvo: string; readonly epoch: number; readonly text: string; readonly color: string; readonly dx?: number; readonly dy?: number };

export function SkiaScene({ time, status, enemies, animations, hits, partyId, feedback, marcha = 1, camera = 0, corpses = [] }: {
  time: number; status: string; enemies: readonly Enemy[]; marcha?: number; camera?: number;
  corpses?: readonly { readonly id: string; readonly combatantId: string; readonly indice: number; readonly epoch: number; readonly camera: number }[];
  animations: SceneAnimationState; hits?: Readonly<Record<string, number>>;
  partyId?: string; feedback: readonly Feedback[];
}) {
  /** Intensidade do pisca de acerto, 1 no instante do golpe e 0 ao fim.

      O golpe que MATA também pisca — antes ele era o único que não piscava.
      `clarao={morto ? 0 : ...}` zerava o clarão assim que a morte era
      registrada, e como o Ignavo cai em um ou dois golpes, a maioria dos
      acertos é letal: na prática o jogador quase nunca via um inimigo piscar.
      É o golpe mais importante de todos para dar retorno. */
  const claraoDe = (id?: string) => {
    const quando = id ? hits?.[id] : undefined;
    if (quando === undefined) return 0;
    return Math.max(0, 1 - (time - quando) / VIDA_CLARAO);
  };
  /* A parede é RASTERIZADA uma vez, para uma imagem, e depois só transladada.
     Duas etapas foram necessárias, e a primeira não bastou:

     1. como árvore de componentes, cada crânio virava ~10 nós `<Oval>` e a
        parede passava de dez mil nós reconciliados a cada quadro;
     2. gravada como `Picture`, a reconciliação sumiu, mas o Skia continuava
        rasterizando as dez mil elipses todo quadro — medido em 20,7 fps, com
        quadro mediano de 50ms. Continuava travado.

     Como imagem é um quad texturizado por quadro. A parede não muda nunca:
     ela só desliza. */
  const paredeGravada = useMemo(() => {
    /* `Make` (CPU) e não `MakeOffscreen` (GPU): a textura é desenhada uma vez
       na carga e nunca mais, então não há o que ganhar com a GPU aqui, e a
       superfície de CPU é a que existe nas três plataformas. */
    const superficie = Skia.Surface.Make(PAREDE_L, PAREDE_A) ?? Skia.Surface.MakeOffscreen(PAREDE_L, PAREDE_A);
    if (!superficie) {
      console.warn("Sem superfície para rasterizar a parede; a cena cai no fundo chapado.");
      return null;
    }
    const canvas = superficie.getCanvas();
    const tinta = Skia.Paint();
    tinta.setAntiAlias(true);
    tinta.setColor(Skia.Color("#1e1a18"));
    canvas.drawRect(rect(0, 0, PAREDE_L, PAREDE_A), tinta);
    // a pilha é montada em coordenadas de cena; a textura começa no zero
    canvas.translate(40, -WALL_TOP);
    for (const c of PAREDE) desenhaCaveira(canvas, tinta, c);
    return superficie.makeImageSnapshot();
  }, []);

  const { width: janela } = useWindowDimensions();
  const width = Math.min(Math.max(320, janela - 36), 1060);
  const escala = width / W;
  const height = H * escala;

  /* Herói: pack 2D SL Knight, blocos de 128x64 em grade (ver `_Info.txt` do
     pack). `Attacks.png` guarda cinco golpes de oito quadros, um por linha;
     usamos o primeiro, daí o limite de 8. */
  const heroIdle = useImage(require("../../../sprites/2D_SL_Knight_v1.0/Idle.png"));
  const heroWalk = useImage(require("../../../sprites/2D_SL_Knight_v1.0/Run.png"));
  const heroAttack = useImage(require("../../../sprites/2D_SL_Knight_v1.0/Attacks.png"));
  const heroHurt = useImage(require("../../../sprites/2D_SL_Knight_v1.0/Hurt.png"));
  const heroDead = useImage(require("../../../sprites/2D_SL_Knight_v1.0/Death.png"));
  const mobIdle = useImage(require("../../../sprites/Free-Urban-Zombie-Sprite-Sheet-Pixel-Art-Pack/Zombie_5/Idle.png"));
  const mobWalk = useImage(require("../../../sprites/Free-Urban-Zombie-Sprite-Sheet-Pixel-Art-Pack/Zombie_5/Walk.png"));
  const mobAttack = useImage(require("../../../sprites/Free-Urban-Zombie-Sprite-Sheet-Pixel-Art-Pack/Zombie_5/Attack.png"));
  const mobHurt = useImage(require("../../../sprites/Free-Urban-Zombie-Sprite-Sheet-Pixel-Art-Pack/Zombie_5/Hurt.png"));
  const mobDead = useImage(require("../../../sprites/Free-Urban-Zombie-Sprite-Sheet-Pixel-Art-Pack/Zombie_5/Dead.png"));

  const hero: Folhas = { idle: heroIdle, walk: heroWalk, attack: heroAttack, hurt: heroHurt, dead: heroDead };
  const mob: Folhas = { idle: mobIdle, walk: mobWalk, attack: mobAttack, hurt: mobHurt, dead: mobDead };

  const andando = status === "walking" || status === "retreating";

  /* Encontro, não teletransporte.
     Antes o herói e a horda ficavam em x fixo e só o fundo corria: a marcha
     acabava e a horda simplesmente ESTAVA ali, já no alcance. Agora os dois
     lados fecham a distância, e o progresso vem do `distanceToWave` do motor
     — o mesmo número que decide quando a luta começa —, então a horda encosta
     no quadro exato em que o combate abre, sem chegar cedo e esperar parada. */
  /* Aproximação LINEAR. O ease-out `1-(1-t)²` parte com o dobro da velocidade
     média e freia em cima do herói: a horda disparava para dentro do quadro e
     depois arrastava. Um morto-vivo não acelera nem desacelera — anda. */
  const bruto = Math.min(1, Math.max(0, marcha));
  const suave = bruto <= INICIO_DA_ENTRADA
    ? 0
    : (bruto - INICIO_DA_ENTRADA) / (1 - INICIO_DA_ENTRADA);

  /* O HERÓI NÃO SE MOVE NO PALCO — quem se move é o mundo.
     Ele tinha um avanço próprio que ia a zero ao fim da marcha; quando a onda
     acabava e a marcha recomeçava, esse avanço voltava ao início e o boneco
     SALTAVA para trás. Era esse o teleporte a cada onda.
     A sensação de caminhada já vem do fundo correndo e da horda entrando pela
     direita, que é como o protótipo faz: câmera presa no herói. */

  const sinalVivo = (id?: string) => {
    const s = id ? animations[id] : undefined;
    return s && time - s.epoch < DURACAO_SINAL[s.animation] ? s : undefined;
  };

  const sinalHeroi = sinalVivo(partyId);
  const animHeroi: Animation = sinalHeroi?.animation ?? (andando ? "walk" : "idle");
  const tHeroi = sinalHeroi ? time - sinalHeroi.epoch : time;

  /** Onde um inimigo PARA para lutar. Sem o recuo de entrada. */
  /* A horda ocupa fileiras, não uma fila.
     Com dezoito bichos, `i * vão` esticava a onda por mais de uma tela e
     virava desfile. Agora quatro brigam lado a lado e o resto se empilha
     atrás, cada fileira um pouco mais recuada e mais funda — que é como uma
     multidão de fato se comporta contra um alvo só. */
  const fileiraDe = (i: number) => Math.floor(i / POR_FILEIRA);
  const slotMob = (i: number) =>
    PRIMEIRO_MOB_X + (i % POR_FILEIRA) * VAO_ENTRE_MOBS + fileiraDe(i) * RECUO_DA_FILEIRA;
  /** Onde um inimigo VIVO está agora: o passo dele mais o desvio na horda.

      `suave ** (1/ritmo)` deixa o mais lento para trás no meio do caminho e o
      traz junto no fim — é o motor que decide quando a luta começa. */
  const posicaoMob = (i: number, id?: string) => {
    const perfil = id ? perfilDoMob(id) : { ritmo: 1, desvioX: 0, profundidade: 0 };
    const andado = suave <= 0 ? 0 : suave ** (1 / perfil.ritmo);
    return slotMob(i) + perfil.desvioX + (1 - andado) * ENTRADA_DA_HORDA;
  };
  const heroiX = HEROI_X;

  return (
    <View style={[styles.host, { width, height }]} accessibilityLabel="Cena do Vestíbulo">
      <Canvas style={{ width, height }}>
        <Rect x={0} y={0} width={width} height={height} color="#0a0b0d" />
        <Group transform={[{ scale: escala }]}>

          {/* teto de pedra */}
          <Rect x={0} y={CEILING_Y} width={W} height={CEILING_H} color="#221d1a" />
          <Rect x={0} y={CEILING_Y + CEILING_H - 2} width={W} height={2} color="#0d0a09" />

          {/* ossuário, com parallax lento */}
          <Group transform={[{ translateX: -((camera * 0.25) % 340) }]}>
            {paredeGravada
              ? <SkiaImage image={paredeGravada} x={-40} y={WALL_TOP} width={PAREDE_L} height={PAREDE_A} fit="fill" />
              : <Rect x={-40} y={WALL_TOP} width={PAREDE_L} height={PAREDE_A} color="#1e1a18" />}
          </Group>

          {/* a parede vive na penumbra; a luz vem dos castiçais */}
          <Rect x={0} y={WALL_TOP} width={W} height={GROUND_BACK - WALL_TOP} color="#0a0806" opacity={0.80} />
          {/* poça de luz com degradê: disco chapado lia como mancha marrom */}
          {COLUNAS.map((wx) => {
            const cx = wx - ((camera * 0.55) % CICLO_COLUNA) + 9;
            return (
              <Circle key={`luz-${wx}`} cx={cx} cy={162} r={160}>
                <RadialGradient
                  c={vec(cx, 150)}
                  r={160}
                  colors={["rgba(255,170,80,0.30)", "rgba(255,140,60,0.10)", "rgba(255,140,60,0)"]}
                  positions={[0, 0.45, 1]}
                />
              </Circle>
            );
          })}

          {/* chão: base contínua (argamassa/junta) de GROUND_BACK até o fim
              da beirada da frente, com o mesmo degradê de antes — mais claro
              junto da parede, onde a luz dos castiçais bate. */}
          <Rect x={0} y={GROUND_BACK} width={W} height={GROUND + FLOOR_H - GROUND_BACK}>
            <LinearGradient
              start={vec(0, GROUND_BACK)}
              end={vec(0, GROUND + FLOOR_H)}
              colors={["#241e19", "#1c1713", "#141110"]}
              positions={[0, 0.55, 1]}
            />
          </Rect>
          {/* linha bem sutil no horizonte — onde a parede encontra o chão */}
          <Rect x={0} y={GROUND_BACK} width={W} height={1} color="#3a2f1f" opacity={0.4} />

          {/* lajes de pedra por cima da base: réguas horizontais lisas liam
              como tábua corrida (piso de madeira); pedra pede grade
              quebrada, com junta entre lajes e tom variando laje a laje. O
              chão é onde o herói pisa, não pano de fundo — rola junto com a
              câmera na velocidade cheia, não em parallax. */}
          {(() => {
            const deslocamento = camera % CHAO_TILE_L;
            return [-1, 0, 1, 2].map((copia) => (
              <Group key={`chao-copia-${copia}`} transform={[{ translateX: copia * CHAO_TILE_L - deslocamento }]}>
                {PEDRAS.map((p, i) => (
                  <Rect key={i} x={p.x} y={p.y} width={p.w} height={p.h} color={p.tom} opacity={0.82} />
                ))}
              </Group>
            ));
          })()}

          <Rect x={0} y={GROUND + FLOOR_H} width={W} height={H - GROUND - FLOOR_H} color="#0a0b0d" />

          {/* colunas: segundo plano — adereço do cenário, não interage com
              herói nem mob. A base para em GROUND_BACK, onde a parede
              encontra o chão — a coluna é do tamanho do fundo, não do
              chão. Herói e mob caminham na faixa abaixo dela. */}
          {COLUNAS.map((wx) => {
            const x = wx - ((camera * 0.55) % CICLO_COLUNA);
            return (
              <Group key={`col-${wx}`}>
                <Rect x={x} y={CEILING_Y + 6} width={18} height={COLUNA_BASE_Y - CEILING_Y - 6} color="#3f362a" />
                <Rect x={x + 3} y={CEILING_Y + 6} width={5} height={COLUNA_BASE_Y - CEILING_Y - 6} color="#6d5a3c" />
                <Rect x={x - 6} y={CEILING_Y + 1} width={30} height={9} color="#7d6746" />
                <Oval x={x - 10} y={COLUNA_BASE_Y - 4} width={38} height={9} color="#000000" opacity={0.35} />
                <Rect x={x - 6} y={COLUNA_BASE_Y - 14} width={30} height={14} color="#6d5a3c" />
                <Circle cx={x + 9} cy={150} r={4} color="#ffe0a8" />
              </Group>
            );
          })}

          {/* inimigos: encaram a party, então vão espelhados */}
          {corpses.map((corpo) => {
            const idade = time - corpo.epoch;
            /* Some pela idade, não só por sair de cena — combate e farm numa
               mesma noite não fazem a câmera andar, e sem isto o corpo ficava
               para sempre. */
            if (idade > ATRASO_CORPO + FADE_CORPO) return null;
            /* Do SLOT, não de `posicaoMob`: esta última soma o recuo da horda
               que está entrando, e com isso os corpos eram empurrados para a
               frente junto com ela — o jogador via cadáveres adiante, de
               monstros que ainda nem tinha enfrentado. O corpo não anda: o
               mundo é que passa por ele. */
            const x = slotMob(corpo.indice) - (camera - corpo.camera);
            if (x < LIMITE_DO_CORPO || x > W + 420) return null;
            const opacidade = idade <= ATRASO_CORPO ? 1 : Math.max(0, 1 - (idade - ATRASO_CORPO) / FADE_CORPO);
            return (
              <Group key={`corpo:${corpo.id}`} opacity={opacidade}>
                <Oval x={x - 24} y={GROUND - 5} width={48} height={6} color="#000000" opacity={0.32} />
                <Quadro image={mob.dead} animation="dead" t={time - corpo.epoch} cx={x} footY={GROUND}
                  scale={MOB_SCALE} flip clarao={claraoDe(corpo.combatantId)} />
              </Group>
            );
          })}

          {(status === "combat" || suave > 0) && enemies
            .map((inimigo, i) => ({ inimigo, i, perfil: perfilDoMob(inimigo.id) }))
            /* quem está mais à frente desenha por último e cobre os de trás;
               sem isto o amontoado vira recorte plano */
            .sort((a, b) =>
              (a.perfil.profundidade + fileiraDe(a.i) * PROFUNDIDADE_DA_FILEIRA)
              - (b.perfil.profundidade + fileiraDe(b.i) * PROFUNDIDADE_DA_FILEIRA))
            .map(({ inimigo, i, perfil }) => {
              /* O morto sai daqui assim que entra na lista de corpos, que é
                 quem o desenha daí em diante. */
              if (animations[inimigo.id]?.animation === "dead") return null;

              const sinal = animations[inimigo.id];
              const vivo = sinalVivo(inimigo.id);
              const anim: Animation = vivo?.animation ?? (andando || suave < 1 ? "walk" : "idle");
              const quadro = vivo ? time - (sinal?.epoch ?? 0) : time + i * 0.17;
              const x = posicaoMob(i, inimigo.id);
              const chao = GROUND + perfil.profundidade + fileiraDe(i) * PROFUNDIDADE_DA_FILEIRA;
              const topo = chao - FRAME * MOB_SCALE * 0.62;

              return (
                <Group key={inimigo.id}>
                  <Oval x={x - 22} y={chao - 6} width={44} height={7} color="#000000" opacity={0.4} />
                  <Quadro image={mob[anim]} animation={anim} t={quadro} cx={x} footY={chao} scale={MOB_SCALE} flip clarao={claraoDe(inimigo.id)} />
                  {/* Barra só em quem já foi ferido. Com a horda amontoada,
                      dezoito barras cheias viravam um emaranhado vermelho que
                      escondia os bichos e não dizia nada — todas iguais. Assim
                      a barra vira sinal: quem tem, está sangrando. */}
                  {inimigo.hp < inimigo.maxHp && (
                    <Group>
                      <Rect x={x - 22} y={topo} width={44} height={4} color="#1b1410" />
                      <Rect x={x - 22} y={topo} width={44 * Math.max(0, Math.min(1, inimigo.hp / Math.max(1, inimigo.maxHp)))} height={4} color="#7a2222" />
                    </Group>
                  )}
                </Group>
              );
            })}

          {/* herói */}
          <Oval x={heroiX - 26} y={GROUND - 6} width={52} height={8} color="#000000" opacity={0.45} />
          <Quadro image={hero[animHeroi]} animation={animHeroi} t={tHeroi} cx={heroiX} footY={GROUND} scale={HERO_SCALE}
            qw={HEROI_QW} qh={HEROI_QH} limite={animHeroi === "attack" ? 8 : undefined} clarao={claraoDe(partyId)} />
        </Group>
      </Canvas>

      {/* números flutuantes: nascem sobre quem levou o golpe, sobem e apagam */}
      <View pointerEvents="none" style={StyleSheet.absoluteFill}>
        {feedback.map((item) => {
          const idade = time - item.epoch;
          if (idade < 0 || idade > VIDA_NUMERO) return null;
          /* Alvo que não está mais na cena — mob de uma onda já encerrada —
             não tem onde nascer. Antes ele caía no `heroiX`, e o jogador via
             números de dano de OUTRA gente subindo desalinhados em cima do
             próprio boneco durante a marcha. Só o herói desenha no herói. */
          const indice = enemies.findIndex((inimigo) => inimigo.id === item.alvo);
          const noHeroi = item.alvo === partyId;
          if (indice < 0 && !noHeroi) return null;
          const mundoX = indice >= 0 ? posicaoMob(indice, item.alvo) : heroiX + DESVIO_NUMERO_HEROI;
          /* Sobe rápido e desacelera, em vez de deslizar linear a 34px/s: com
             a vida de 0,9s aquilo percorria 30px no total e lia como parado.
             O ease-out dá o "pop" que o olho reconhece como golpe. */
          const avanco = 1 - (1 - idade / VIDA_NUMERO) ** 2;
          /* A altura sai da escala de QUEM levou o golpe. Usar sempre a do
             mob punha o número no meio do peito do herói, que é maior. */
          /* O herói é mais alto que o mob e o cavaleiro não ocupa o centro do
             quadro de 128: o número nascia acima e à direita da cabeça dele.
             Por isso cada lado tem seu próprio par de coeficientes em vez de
             dividirem um só. */
          const alturaRelativa = indice >= 0 ? MOB_SCALE * 0.84 : HERO_SCALE * 0.70;
          const mundoY = GROUND - FRAME * alturaRelativa - avanco * 78 + (item.dy ?? 0);
          return (
            <Text
              key={item.id}
              style={[styles.numero, {
                color: item.color,
                left: (mundoX + (item.dx ?? 0)) * escala - 26,
                top: mundoY * escala,
                opacity: Math.max(0, 1 - idade / VIDA_NUMERO),
              }]}
            >
              {item.text}
            </Text>
          );
        })}
      </View>

      <Text style={styles.rodape}>
        {status === "combat" ? "A party parou. O combate resolve sozinho."
          : status === "retreating" ? "Recuando para uma margem mais rasa."
          : "A marcha continua…"}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  host: { overflow: "hidden", backgroundColor: "#0a0b0d", borderColor: "#241b14", borderWidth: 1, position: "relative" },
  numero: { position: "absolute", width: 52, textAlign: "center", fontSize: 14, fontWeight: "700", textShadowColor: "#0a0705", textShadowRadius: 3 },
  rodape: { position: "absolute", left: 10, bottom: 8, color: "#6b5a44", fontSize: 9 },
});
