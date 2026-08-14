import type { ReactNode } from "react";
import { useMemo } from "react";
import { Canvas, Circle, ColorMatrix, Group, Image as SkiaImage, Oval, Paint, RadialGradient, Rect, Skia, rect, useImage, vec } from "@shopify/react-native-skia";
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
const GROUND = 300;
const FLOOR_H = 44;
const FRAME = 128;                       // lado do quadro nas folhas de sprite

const HERO_SCALE = 1.3;
const MOB_SCALE = 1.05;
const VAO_ENTRE_MOBS = 62;
const PRIMEIRO_MOB_X = 372;      // encostado no alcance do herói, não do outro lado do salão
const HEROI_X = 250;
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

/* ------------------------------------------------------------- animações */

type Animation = "idle" | "walk" | "attack" | "hurt" | "dead";

/** Ritmo de cada animação. A contagem de quadros NÃO vive aqui de propósito:
    é lida da largura real da folha, para config e asset não divergirem. */
const FPS: Record<Animation, number> = { idle: 6, walk: 11, attack: 13, hurt: 14, dead: 11 };
const CICLA: Record<Animation, boolean> = { idle: true, walk: true, attack: false, hurt: false, dead: false };

const DURACAO_SINAL: Record<SceneAnimation, number> = { attack: 0.42, hurt: 0.3, dead: 0.5 };
const FADE_CORPO = 0.4;                  // desvanecer depois da animação de morte
const VIDA_NUMERO = 0.7;                 // quanto um número flutuante dura
const VIDA_CLARAO = 0.32;                // quanto o pisca de acerto dura

/** Pinta tudo de branco mantendo o alfa: é o que faz o sprite piscar sem
    virar um retângulo. */
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
function Quadro({ image, animation, t, cx, footY, scale, flip, clarao = 0 }: {
  image: ReturnType<typeof useImage>;
  animation: Animation; t: number; cx: number; footY: number; scale: number; flip?: boolean; clarao?: number;
}) {
  if (!image) return null;
  const total = Math.max(1, Math.round(image.width() / FRAME));
  const bruto = Math.floor(Math.max(0, t) * FPS[animation]);
  const indice = CICLA[animation] ? bruto % total : Math.min(bruto, total - 1);

  const lado = FRAME * scale;
  const x = Math.round(cx - lado / 2);
  const y = Math.round(footY - lado);

  /* Espelha em torno do próprio centro; sem isto o inimigo marchava de costas. */
  const espelha = (conteudo: ReactNode) => flip
    ? <Group transform={[{ translateX: 2 * (x + lado / 2) }, { scaleX: -1 }]}>{conteudo}</Group>
    : <>{conteudo}</>;

  const recorte = (
    <Group clip={rect(x, y, lado, lado)}>
      <SkiaImage image={image} x={x - indice * lado} y={y} width={lado * total} height={lado} fit="fill" />
    </Group>
  );

  /* O clarão é uma SEGUNDA passada do mesmo quadro, pintada de branco por uma
     camada. A camada fica POR FORA do espelhamento de propósito: quando ela
     ficava dentro do grupo com `scaleX: -1`, o clarão não aparecia — o herói,
     que não espelha, piscava, e os inimigos, que espelham, nunca. Era essa a
     diferença entre os dois, e não a fiação dos ids. */
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
    for (let linha = 0; WALL_TOP + linha * passoY < GROUND + 26; linha++) {
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
const PAREDE_A = GROUND - WALL_TOP;

const COLUNAS = [90, 520, 950, 1380];
const CICLO_COLUNA = 1720;

/* ------------------------------------------------------------------ cena */

type Enemy = { readonly id: string; readonly name: string; readonly hp: number; readonly maxHp: number };
type Feedback = { readonly id: string; readonly alvo: string; readonly epoch: number; readonly text: string; readonly color: string; readonly dx?: number; readonly dy?: number };

export function SkiaScene({ time, status, enemies, animations, hits, partyId, feedback, marcha = 1, camera = 0, corpses = [] }: {
  time: number; status: string; enemies: readonly Enemy[]; marcha?: number; camera?: number;
  corpses?: readonly { readonly id: string; readonly indice: number; readonly epoch: number; readonly camera: number }[];
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

  const heroIdle = useImage(require("../../../sprites/knight-character-sprites-pixel-art/Spritesheet 128/Knight_1/Idle.png"));
  const heroWalk = useImage(require("../../../sprites/knight-character-sprites-pixel-art/Spritesheet 128/Knight_1/Walk.png"));
  const heroAttack = useImage(require("../../../sprites/knight-character-sprites-pixel-art/Spritesheet 128/Knight_1/Attack 1.png"));
  const heroHurt = useImage(require("../../../sprites/knight-character-sprites-pixel-art/Spritesheet 128/Knight_1/Hurt.png"));
  const heroDead = useImage(require("../../../sprites/knight-character-sprites-pixel-art/Spritesheet 128/Knight_1/Dead.png"));
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
  const recuoHorda = (1 - suave) * ENTRADA_DA_HORDA;

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
  const slotMob = (i: number) => PRIMEIRO_MOB_X + i * VAO_ENTRE_MOBS;
  /** Onde um inimegio VIVO está agora, contando a entrada em curso. */
  const posicaoMob = (i: number) => slotMob(i) + recuoHorda;
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
          <Rect x={0} y={WALL_TOP} width={W} height={GROUND - WALL_TOP} color="#0a0806" opacity={0.80} />
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

          {/* colunas e castiçais */}
          {COLUNAS.map((wx) => {
            const x = wx - ((camera * 0.55) % CICLO_COLUNA);
            return (
              <Group key={`col-${wx}`}>
                <Rect x={x} y={CEILING_Y + 6} width={18} height={GROUND - CEILING_Y - 6} color="#3f362a" />
                <Rect x={x + 3} y={CEILING_Y + 6} width={5} height={GROUND - CEILING_Y - 6} color="#6d5a3c" />
                <Rect x={x - 6} y={CEILING_Y + 1} width={30} height={9} color="#7d6746" />
                <Rect x={x - 6} y={GROUND - 14} width={30} height={14} color="#6d5a3c" />
                <Circle cx={x + 9} cy={150} r={4} color="#ffe0a8" />
              </Group>
            );
          })}

          {/* chão */}
          <Rect x={0} y={GROUND} width={W} height={FLOOR_H} color="#1b1715" />
          <Rect x={0} y={GROUND} width={W} height={2} color="#0a0806" />
          <Rect x={0} y={GROUND + FLOOR_H} width={W} height={H - GROUND - FLOOR_H} color="#0a0b0d" />

          {/* inimigos: encaram a party, então vão espelhados */}
          {corpses.map((corpo) => {
            /* Fica onde caiu e o mundo o deixa para trás. A animação de morte
               roda uma vez e o último quadro PERMANECE: o corpo não desvanece,
               some por sair de cena. */
            /* Do SLOT, não de `posicaoMob`: esta última soma o recuo da horda
               que está entrando, e com isso os corpos eram empurrados para a
               frente junto com ela — o jogador via cadáveres adiante, de
               monstros que ainda nem tinha enfrentado. O corpo não anda: o
               mundo é que passa por ele. */
            const x = slotMob(corpo.indice) - (camera - corpo.camera);
            if (x < LIMITE_DO_CORPO || x > W + 420) return null;
            return (
              <Group key={`corpo:${corpo.id}`}>
                <Oval x={x - 24} y={GROUND - 5} width={48} height={6} color="#000000" opacity={0.32} />
                <Quadro image={mob.dead} animation="dead" t={time - corpo.epoch} cx={x} footY={GROUND}
                  scale={MOB_SCALE} flip clarao={claraoDe(corpo.id)} />
              </Group>
            );
          })}

          {(status === "combat" || suave > 0) && enemies.map((inimigo, i) => {
            const sinal = animations[inimigo.id];
            /* O morto sai daqui assim que entra na lista de corpos, que é
               quem o desenha daí em diante — inclusive depois de a onda
               fechar, que é justamente quando esta lista deixa de existir. */
            const morto = animations[inimigo.id]?.animation === "dead";
            if (morto) return null;
            const opacidade = 1;

            const vivo = sinalVivo(inimigo.id);
            const anim: Animation = morto ? "dead" : vivo?.animation ?? (andando || suave < 1 ? "walk" : "idle");
            const t = vivo || morto ? time - (sinal?.epoch ?? 0) : time + i * 0.17;
            const x = posicaoMob(i);
            const topo = GROUND - FRAME * MOB_SCALE * 0.62;

            return (
              <Group key={inimigo.id} opacity={opacidade}>
                <Oval x={x - 22} y={GROUND - 6} width={44} height={7} color="#000000" opacity={0.4} />
                <Quadro image={mob[anim]} animation={anim} t={t} cx={x} footY={GROUND} scale={MOB_SCALE} flip clarao={claraoDe(inimigo.id)} />
                {!morto && (
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
          <Quadro image={hero[animHeroi]} animation={animHeroi} t={tHeroi} cx={heroiX} footY={GROUND} scale={HERO_SCALE} clarao={claraoDe(partyId)} />
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
          const mundoX = indice >= 0 ? posicaoMob(indice) : heroiX;
          /* Sobe rápido e desacelera, em vez de deslizar linear a 34px/s: com
             a vida de 0,9s aquilo percorria 30px no total e lia como parado.
             O ease-out dá o "pop" que o olho reconhece como golpe. */
          const avanco = 1 - (1 - idade / VIDA_NUMERO) ** 2;
          /* A altura sai da escala de QUEM levou o golpe. Usar sempre a do
             mob punha o número no meio do peito do herói, que é maior. */
          const escalaAlvo = indice >= 0 ? MOB_SCALE : HERO_SCALE;
          const mundoY = GROUND - FRAME * escalaAlvo * 0.84 - avanco * 78 + (item.dy ?? 0);
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
