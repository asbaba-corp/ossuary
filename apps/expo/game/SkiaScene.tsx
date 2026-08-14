import { useRef } from "react";
import { Canvas, Circle, ColorMatrix, Group, Image as SkiaImage, Oval, Paint, RadialGradient, Rect, rect, useImage, vec } from "@shopify/react-native-skia";
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
const DURACAO_APROXIMACAO = 1.6;  // segundos de marcha até os dois lados se encontrarem
const ENTRADA_DA_HORDA = 300;     // de quanto à direita a horda entra na cena
const AVANCO_DO_HEROI = 46;       // o herói também caminha, senão só a horda se move

/* ------------------------------------------------------------- animações */

type Animation = "idle" | "walk" | "attack" | "hurt" | "dead";

/** Ritmo de cada animação. A contagem de quadros NÃO vive aqui de propósito:
    é lida da largura real da folha, para config e asset não divergirem. */
const FPS: Record<Animation, number> = { idle: 6, walk: 11, attack: 13, hurt: 14, dead: 11 };
const CICLA: Record<Animation, boolean> = { idle: true, walk: true, attack: false, hurt: false, dead: false };

const DURACAO_SINAL: Record<SceneAnimation, number> = { attack: 0.42, hurt: 0.3, dead: 0.5 };
const FADE_CORPO = 0.4;                  // desvanecer depois da animação de morte
const VIDA_NUMERO = 0.9;                 // quanto um número flutuante dura
const VIDA_CLARAO = 0.22;                // quanto o pisca de acerto dura

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

  const desenho = (
    <Group clip={rect(x, y, lado, lado)}>
      <SkiaImage image={image} x={x - indice * lado} y={y} width={lado * total} height={lado} fit="fill" />
      {clarao > 0 && (
        <Group opacity={clarao} layer={<Paint><ColorMatrix matrix={TUDO_BRANCO} /></Paint>}>
          <SkiaImage image={image} x={x - indice * lado} y={y} width={lado * total} height={lado} fit="fill" />
        </Group>
      )}
    </Group>
  );

  // espelha em torno do próprio centro; sem isto o inimigo marchava de costas
  return flip
    ? <Group transform={[{ translateX: 2 * (x + lado / 2) }, { scaleX: -1 }]}>{desenho}</Group>
    : desenho;
}

/* ----------------------------------------------------------------- parede */

/** Caveira do ossuário: calota, maxilar, órbitas fundas e nasal.
    Formas cheias em vez de círculos soltos — círculos liam como bolhas. */
function Caveira({ cx, cy, r, tom }: { cx: number; cy: number; r: number; tom: string }) {
  return (
    <Group>
      <Oval x={cx - r * 0.62} y={cy + r * 0.42} width={r * 1.24} height={r * 0.95} color={tom} />
      <Oval x={cx - r} y={cy - r * 1.05} width={r * 2} height={r * 2} color={tom} />
      <Oval x={cx - r * 0.6} y={cy - r * 0.14} width={r * 0.5} height={r * 0.42} color="#15100e" />
      <Oval x={cx + r * 0.1} y={cy - r * 0.14} width={r * 0.5} height={r * 0.42} color="#15100e" />
      <Oval x={cx - r * 0.1} y={cy + r * 0.3} width={r * 0.2} height={r * 0.28} color="#15100e" />
    </Group>
  );
}

/** Empilhamento determinístico: a mesma parede a cada render, sem sortear. */
const PAREDE = (() => {
  const itens: { cx: number; cy: number; r: number; tom: string }[] = [];
  const tons = ["#584f4a", "#635a54", "#4c4540", "#5d544e"];
  let semente = 7;
  const passo = () => (semente = (semente * 1103515245 + 12345) % 2147483648) / 2147483648;
  for (let linha = 0; WALL_TOP + linha * 23 < GROUND + 24; linha++) {
    const y = WALL_TOP + 12 + linha * 23;
    const desloca = (linha % 2) * 13;
    for (let x = -20; x < W + 360; x += 26) {
      itens.push({
        cx: x + desloca + passo() * 8,
        cy: y + passo() * 7,
        r: 8 + passo() * 3.5,
        tom: tons[Math.floor(passo() * tons.length)] ?? tons[0],
      });
    }
  }
  return itens;
})();

const COLUNAS = [90, 520, 950, 1380];
const CICLO_COLUNA = 1720;

/* ------------------------------------------------------------------ cena */

type Enemy = { readonly id: string; readonly name: string; readonly hp: number; readonly maxHp: number };
type Feedback = { readonly id: string; readonly alvo: string; readonly epoch: number; readonly text: string; readonly color: string };

export function SkiaScene({ time, status, enemies, animations, hits, partyId, feedback }: {
  time: number; status: string; enemies: readonly Enemy[];
  animations: SceneAnimationState; hits?: Readonly<Record<string, number>>;
  partyId?: string; feedback: readonly Feedback[];
}) {
  /** Intensidade do pisca de acerto, 1 no instante do golpe e 0 ao fim. */
  const claraoDe = (id?: string) => {
    const quando = id ? hits?.[id] : undefined;
    if (quando === undefined) return 0;
    return Math.max(0, 1 - (time - quando) / VIDA_CLARAO) * 0.85;
  };
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
  const camera = andando ? time * 34 : 0;

  /* Encontro, não teletransporte.
     Antes o herói e os mobs ficavam em x fixo e só o fundo corria: a marcha
     terminava e a horda simplesmente ESTAVA ali, do nada, já no alcance. O que
     o jogo quer mostrar é os dois lados fechando a distância — o herói avança
     um pouco, a horda entra pela direita, e eles se encontram no ponto em que
     o combate começa.

     O progresso é medido a partir do instante em que a marcha começou, não do
     relógio absoluto: `time` nunca zera, então usá-lo direto faria a horda
     nascer já no lugar a partir da segunda onda. */
  const inicioMarcha = useRef(0);
  const statusAnterior = useRef(status);
  if (statusAnterior.current !== status) {
    if (andando) inicioMarcha.current = time;
    statusAnterior.current = status;
  }
  const progresso = andando
    ? Math.min(1, Math.max(0, (time - inicioMarcha.current) / DURACAO_APROXIMACAO))
    : 1;
  const suave = 1 - (1 - progresso) ** 2;   // desacelera ao chegar, não freia seco
  const recuoHorda = (1 - suave) * ENTRADA_DA_HORDA;
  const recuoHeroi = (1 - suave) * AVANCO_DO_HEROI;

  const sinalVivo = (id?: string) => {
    const s = id ? animations[id] : undefined;
    return s && time - s.epoch < DURACAO_SINAL[s.animation] ? s : undefined;
  };

  const sinalHeroi = sinalVivo(partyId);
  const animHeroi: Animation = sinalHeroi?.animation ?? (andando ? "walk" : "idle");
  const tHeroi = sinalHeroi ? time - sinalHeroi.epoch : time;

  const posicaoMob = (i: number) => PRIMEIRO_MOB_X + i * VAO_ENTRE_MOBS + recuoHorda;
  const heroiX = HEROI_X - recuoHeroi;

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
            <Rect x={-40} y={WALL_TOP} width={W + 400} height={GROUND - WALL_TOP} color="#2b2421" />
            {PAREDE.map((c, i) => <Caveira key={i} cx={c.cx} cy={c.cy} r={c.r} tom={c.tom} />)}
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
          {enemies.map((inimigo, i) => {
            const sinal = animations[inimigo.id];
            const morto = sinal?.animation === "dead";
            const desdeMorte = morto ? time - sinal.epoch - DURACAO_SINAL.dead : 0;
            if (morto && desdeMorte > FADE_CORPO) return null;      // corpo já sumiu
            const opacidade = morto && desdeMorte > 0 ? Math.max(0, 1 - desdeMorte / FADE_CORPO) : 1;

            const vivo = sinalVivo(inimigo.id);
            const anim: Animation = morto ? "dead" : vivo?.animation ?? (andando ? "walk" : "idle");
            const t = vivo || morto ? time - (sinal?.epoch ?? 0) : time + i * 0.17;
            const x = posicaoMob(i);
            const topo = GROUND - FRAME * MOB_SCALE * 0.62;

            return (
              <Group key={inimigo.id} opacity={opacidade}>
                <Oval x={x - 22} y={GROUND - 6} width={44} height={7} color="#000000" opacity={0.4} />
                <Quadro image={mob[anim]} animation={anim} t={t} cx={x} footY={GROUND} scale={MOB_SCALE} flip clarao={morto ? 0 : claraoDe(inimigo.id)} />
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
          const indice = enemies.findIndex((inimigo) => inimigo.id === item.alvo);
          const mundoX = indice >= 0 ? posicaoMob(indice) : heroiX;
          /* Sobe rápido e desacelera, em vez de deslizar linear a 34px/s: com
             a vida de 0,9s aquilo percorria 30px no total e lia como parado.
             O ease-out dá o "pop" que o olho reconhece como golpe. */
          const avanco = 1 - (1 - idade / VIDA_NUMERO) ** 2;
          const mundoY = GROUND - FRAME * MOB_SCALE * 0.78 - avanco * 78;
          return (
            <Text
              key={item.id}
              style={[styles.numero, {
                color: item.color,
                left: mundoX * escala - 26,
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
