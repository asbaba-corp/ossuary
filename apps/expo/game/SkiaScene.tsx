import { Canvas, Circle, Group, Image as SkiaImage, Line, Rect, rect, useImage } from "@shopify/react-native-skia";
import { StyleSheet, Text, View, useWindowDimensions } from "react-native";
import type { SceneAnimationState } from "./GameViewModel";

const W = 960;
const H = 384;
const CEILING = 34;
const WALL_TOP = 72;
const GROUND = 300;
const FLOOR = 44;
const FRAME = 128;

const heroSheets = {
  idle: { frames: 4, fps: 6 }, walk: { frames: 8, fps: 10 }, attack: { frames: 5, fps: 13 }, hurt: { frames: 4, fps: 14 }, dead: { frames: 6, fps: 11 },
} as const;
const ignavoSheets = {
  idle: { frames: 6, fps: 6 }, walk: { frames: 10, fps: 12 }, attack: { frames: 4, fps: 8 }, hurt: { frames: 4, fps: 14 }, dead: { frames: 5, fps: 11 },
} as const;

type Animation = keyof typeof heroSheets;
type Enemy = { readonly id: string; readonly name: string; readonly hp: number; readonly maxHp: number };

function frame(animation: Animation, time: number, enemy: boolean) {
  const sheet = (enemy ? ignavoSheets : heroSheets)[animation];
  return animation === "attack" || animation === "hurt" || animation === "dead"
    ? Math.min(sheet.frames - 1, Math.floor(Math.max(0, time) * sheet.fps))
    : Math.floor(Math.max(0, time) * sheet.fps) % sheet.frames;
}

function activeSignal(signal: SceneAnimationState[string] | undefined, time: number) {
  if (!signal) return false;
  if (signal.animation === "dead") return true;
  return time - signal.epoch < (signal.animation === "attack" ? 0.5 : 0.3);
}

function SpriteAtlas({ image, animation, time, x, y, scale, enemy }: { image: ReturnType<typeof useImage>; animation: Animation; time: number; x: number; y: number; scale: number; flip?: boolean; enemy?: boolean }) {
  if (!image) return null;
  const frameScale = FRAME * scale;
  const frameIndex = frame(animation, time, Boolean(enemy));
  const frames = (enemy ? ignavoSheets : heroSheets)[animation].frames;
  return <Group clip={rect(x, y, frameScale, frameScale)}><SkiaImage image={image} x={x - frameIndex * frameScale} y={y} width={frameScale * frames} height={frameScale} fit="fill" /></Group>;
}

export function SkiaScene({ time, status, enemies, animations, partyId, feedback }: { time: number; status: string; enemies: readonly Enemy[]; animations: SceneAnimationState; partyId?: string; feedback: readonly { readonly id: string; readonly text: string; readonly color: string }[] }) {
  const { width: windowWidth } = useWindowDimensions();
  const width = Math.min(Math.max(320, windowWidth - 36), 1060);
  const scale = width / W;
  const height = H * scale;
  const heroIdle = useImage(require("../../../sprites/knight-character-sprites-pixel-art/Spritesheet 128/Knight_1/Idle.png"));
  const heroWalk = useImage(require("../../../sprites/knight-character-sprites-pixel-art/Spritesheet 128/Knight_1/Walk.png"));
  const heroAttack = useImage(require("../../../sprites/knight-character-sprites-pixel-art/Spritesheet 128/Knight_1/Attack 1.png"));
  const heroHurt = useImage(require("../../../sprites/knight-character-sprites-pixel-art/Spritesheet 128/Knight_1/Hurt.png"));
  const heroDead = useImage(require("../../../sprites/knight-character-sprites-pixel-art/Spritesheet 128/Knight_1/Dead.png"));
  const ignavoIdle = useImage(require("../../../sprites/Free-Urban-Zombie-Sprite-Sheet-Pixel-Art-Pack/Zombie_5/Idle.png"));
  const ignavoWalk = useImage(require("../../../sprites/Free-Urban-Zombie-Sprite-Sheet-Pixel-Art-Pack/Zombie_5/Walk.png"));
  const ignavoAttack = useImage(require("../../../sprites/Free-Urban-Zombie-Sprite-Sheet-Pixel-Art-Pack/Zombie_5/Attack.png"));
  const ignavoHurt = useImage(require("../../../sprites/Free-Urban-Zombie-Sprite-Sheet-Pixel-Art-Pack/Zombie_5/Hurt.png"));
  const ignavoDead = useImage(require("../../../sprites/Free-Urban-Zombie-Sprite-Sheet-Pixel-Art-Pack/Zombie_5/Dead.png"));
  const heroSignal = partyId ? animations[partyId] : undefined;
  const moving = status === "walking" || status === "retreating";
  const camera = moving ? Math.max(0, time * 30 - 250) : 0;
  const heroActive = activeSignal(heroSignal, time);
  const heroAnimation: Animation = heroActive && heroSignal ? heroSignal.animation : moving ? "walk" : "idle";
  const heroTime = heroActive && heroSignal ? Math.max(0, time - heroSignal.epoch) : time;
  const heroImage = { idle: heroIdle, walk: heroWalk, attack: heroAttack, hurt: heroHurt, dead: heroDead }[heroAnimation];
  const ghostEnemies = enemies.length > 0 ? enemies : status === "walking" ? [0, 1, 2].map((index) => ({ id: `ghost-${index}`, name: "Ignavo", hp: 1, maxHp: 1 })) : [];

  return <View style={[styles.host, { width, height }]} accessibilityLabel="Cena do Vestíbulo">
    <Canvas style={{ width, height }}>
      <Rect x={0} y={0} width={W} height={H} color="#0a0b0d" transform={[{ scale }]} />
      <Group transform={[{ scale }]}>
        <Rect x={0} y={CEILING} width={W} height={38} color="#231f1d" />
        <Group transform={[{ translateX: -camera * 0.25 }]}>
          <Rect x={-camera * 0.25} y={WALL_TOP} width={W + 240} height={GROUND - WALL_TOP} color="#3a3230" />
          {Array.from({ length: 46 }, (_, index) => { const x = 15 + (index * 79) % (W + 240); const y = 90 + (index * 43) % 185; return <Group key={`bone-${index}`} opacity={index % 4 === 0 ? 0.45 : 0.23}><Circle cx={x} cy={y} r={5 + (index % 4) * 2} color={index % 3 === 0 ? "#b3a09b" : "#8b7a79"} /><Circle cx={x - 2} cy={y - 1} r={1.4} color="#3c3130" /><Circle cx={x + 2} cy={y - 1} r={1.4} color="#3c3130" /></Group>; })}
        </Group>
        <Rect x={0} y={WALL_TOP} width={W} height={GROUND - WALL_TOP} color="#0a0b0d" opacity={0.42} />
        <Rect x={0} y={GROUND} width={W} height={FLOOR} color="#1a1716" />
        <Rect x={0} y={GROUND + FLOOR} width={W} height={H - GROUND - FLOOR} color="#0a0b0d" />
        {Array.from({ length: 70 }, (_, index) => <Rect key={`grit-${index}`} x={(index * 137) % W} y={GROUND + 8 + (index * 17) % 30} width={1 + index % 3} height={1 + index % 2} color={index % 3 === 0 ? "#8c8884" : "#3a3431"} opacity={0.28} />)}
        {[90, 520, 950].map((worldX) => { const x = worldX - camera * 0.55; return <Group key={worldX}><Rect x={x - 10} y={40} width={20} height={260} color="#524737" /><Rect x={x - 16} y={34} width={32} height={8} color="#a38353" /><Rect x={x - 16} y={292} width={32} height={8} color="#766042" /><Circle cx={x} cy={150} r={96} color="#ff9a3c" opacity={0.055} /><Circle cx={x} cy={145} r={4} color="#ffe0a8" /></Group>; })}
        <Line p1={{ x: 0, y: GROUND }} p2={{ x: W, y: GROUND }} color="#3a3431" strokeWidth={3} />
        <SpriteAtlas image={heroImage} animation={heroAnimation} time={heroTime} x={(moving ? 250 + Math.sin(time * 2) * 10 : 275) - 64 * 1.3} y={GROUND - FRAME * 1.3} scale={1.3} />
        {ghostEnemies.map((enemy, index) => { const signal = animations[enemy.id]; const signalActive = activeSignal(signal, time); const animation: Animation = signalActive && signal ? signal.animation : moving ? "walk" : "idle"; const enemyTime = signalActive && signal ? Math.max(0, time - signal.epoch) : time + index * 0.13; const images = { idle: ignavoIdle, walk: ignavoWalk, attack: ignavoAttack, hurt: ignavoHurt, dead: ignavoDead }; const x = 510 + index * 88 - (moving ? Math.min(100, time * 30) : 0); return <Group key={enemy.id}><SpriteAtlas image={images[animation]} animation={animation} time={enemyTime} x={x - 64 * 1.05} y={GROUND - FRAME * 1.05} scale={1.05} enemy /><Rect x={x - 25} y={GROUND + 8} width={50} height={4} color="#1b1410" /><Rect x={x - 25} y={GROUND + 8} width={50 * Math.max(0, enemy.hp / Math.max(1, enemy.maxHp))} height={4} color="#7a2222" /></Group>; })}
      </Group>
    </Canvas>
    <View pointerEvents="none" style={styles.feedback}>{feedback.map((item, index) => <Text key={item.id} style={[styles.feedbackText, { color: item.color, left: width * (0.45 + (index % 4) * 0.12), top: height * (0.28 - (index % 3) * 0.05) }]}>{item.text}</Text>)}</View>
    <Text style={styles.sceneHint}>{status === "combat" ? "A party parou. O combate resolve sozinho." : status === "retreating" ? "Recuando para uma margem mais rasa." : "A marcha continua…"}</Text>
  </View>;
}

const styles = StyleSheet.create({ host: { overflow: "hidden", backgroundColor: "#0a0b0d", borderColor: "#241b14", borderWidth: 1, position: "relative" }, feedback: { position: "absolute", left: 0, right: 0, top: 0, bottom: 0 }, feedbackText: { position: "absolute", fontSize: 15, fontWeight: "700", textShadowColor: "#0a0705", textShadowRadius: 2 }, sceneHint: { position: "absolute", left: 10, bottom: 8, color: "#6b5a44", fontSize: 9 } });
