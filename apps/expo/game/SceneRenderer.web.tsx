import { useEffect, useRef } from "react";
import { StyleSheet, Text, View } from "react-native";
import type { SceneAnimationState } from "./GameViewModel";

const W = 960;
const H = 384;
const CEIL_Y = 34;
const CEIL_H = 38;
const WALL_Y = CEIL_Y + CEIL_H;
const GROUND = 300;
const FLOOR_H = 44;
const HERO_SCALE = 1.3;
const MOB_SCALE = 1.05;
const P = { void: "#0a0b0d", wall: "#3a3230", wallD: "#93807f", wallL: "#bda7a2", ceilD: "#231f1d", ceilM: "#3f372d", ceilL: "#524737", colD: "#524737", colM: "#766042", colL: "#a38353", floorD: "#1a1716", floorM: "#231f1d", floorL: "#3a3431", flame: "#ff9a3c", flameC: "#ffe0a8", blood: "#7a2222" };
type Animation = "idle" | "walk" | "attack" | "hurt" | "dead";
type Enemy = { readonly id: string; readonly name: string; readonly hp: number; readonly maxHp: number };
type Props = { time: number; status: string; enemies: readonly Enemy[]; animations: SceneAnimationState; partyId?: string; feedback: readonly { readonly id: string; readonly text: string; readonly color: string }[] };

const sheets = {
  hero: { idle: ["Idle.png", 4, 6], walk: ["Walk.png", 8, 10], attack: ["Attack 1.png", 5, 13], hurt: ["Hurt.png", 4, 14], dead: ["Dead.png", 6, 11] },
  mob: { idle: ["Idle.png", 6, 6], walk: ["Walk.png", 10, 12], attack: ["Attack.png", 4, 8], hurt: ["Hurt.png", 4, 14], dead: ["Dead.png", 5, 11] },
} as const;
const assetModules = {
  hero: {
    idle: require("../../../sprites/knight-character-sprites-pixel-art/Spritesheet 128/Knight_1/Idle.png"), walk: require("../../../sprites/knight-character-sprites-pixel-art/Spritesheet 128/Knight_1/Walk.png"), attack: require("../../../sprites/knight-character-sprites-pixel-art/Spritesheet 128/Knight_1/Attack 1.png"), hurt: require("../../../sprites/knight-character-sprites-pixel-art/Spritesheet 128/Knight_1/Hurt.png"), dead: require("../../../sprites/knight-character-sprites-pixel-art/Spritesheet 128/Knight_1/Dead.png"),
  },
  mob: {
    idle: require("../../../sprites/Free-Urban-Zombie-Sprite-Sheet-Pixel-Art-Pack/Zombie_5/Idle.png"), walk: require("../../../sprites/Free-Urban-Zombie-Sprite-Sheet-Pixel-Art-Pack/Zombie_5/Walk.png"), attack: require("../../../sprites/Free-Urban-Zombie-Sprite-Sheet-Pixel-Art-Pack/Zombie_5/Attack.png"), hurt: require("../../../sprites/Free-Urban-Zombie-Sprite-Sheet-Pixel-Art-Pack/Zombie_5/Hurt.png"), dead: require("../../../sprites/Free-Urban-Zombie-Sprite-Sheet-Pixel-Art-Pack/Zombie_5/Dead.png"),
  },
} as const;

function frame(animation: Animation, time: number, mob: boolean) {
  const [, frames, fps] = (mob ? sheets.mob : sheets.hero)[animation];
  const index = Math.floor(Math.max(0, time) * fps);
  return animation === "idle" || animation === "walk" ? index % frames : Math.min(index, frames - 1);
}

function active(signal: SceneAnimationState[string] | undefined, time: number) {
  return Boolean(signal && (signal.animation === "dead" || time - signal.epoch < (signal.animation === "attack" ? 0.5 : 0.3)));
}

function image(module: unknown) { const value = new window.Image(); const source = typeof module === "string" ? module : (module as { readonly uri?: string; readonly default?: string } | null)?.uri ?? (module as { readonly default?: string } | null)?.default; if (source) value.src = source; return value; }

export function SceneRenderer({ time, status, enemies, animations, partyId, feedback }: Props) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    canvas.width = W; canvas.height = H;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.imageSmoothingEnabled = false;
    const hero = Object.fromEntries(Object.entries(assetModules.hero).map(([key, module]) => [key, image(module)])) as Record<Animation, HTMLImageElement>;
    const mob = Object.fromEntries(Object.entries(assetModules.mob).map(([key, module]) => [key, image(module)])) as Record<Animation, HTMLImageElement>;
    const draw = () => {
      const moving = status === "walking" || status === "retreating";
      const camera = moving ? Math.max(0, time * 30 - 250) : 0;
      ctx.fillStyle = P.void; ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = P.ceilD; ctx.fillRect(0, CEIL_Y, W, CEIL_H);
      for (let x = -30 - (camera * 0.4 % 72); x < W + 72; x += 72) { ctx.fillStyle = P.ceilM; ctx.fillRect(x, CEIL_Y + 7, 54, 2); ctx.fillStyle = P.ceilL; ctx.fillRect(x + 9, CEIL_Y + 18, 38, 2); }
      ctx.fillStyle = P.wall; ctx.fillRect(0, WALL_Y, W, GROUND - WALL_Y);
      for (let i = 0; i < 92; i++) { const x = ((i * 83 + camera * 0.25) % (W + 100)) - 50; const y = WALL_Y + ((i * 47) % (GROUND - WALL_Y)); const r = 3 + (i % 5) * 1.8; ctx.fillStyle = i % 4 === 0 ? "rgba(189,167,162,.35)" : "rgba(147,128,127,.18)"; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = "rgba(60,49,48,.65)"; ctx.fillRect(x - 2, y - 1, 1.5, 2); ctx.fillRect(x + 1, y - 1, 1.5, 2); }
      ctx.fillStyle = "rgba(8,7,9,.48)"; ctx.fillRect(0, WALL_Y, W, GROUND - WALL_Y);
      ctx.fillStyle = P.floorD; ctx.fillRect(0, GROUND, W, FLOOR_H); ctx.fillStyle = P.floorL; ctx.fillRect(0, GROUND, W, 2);
      for (let i = 0; i < 90; i++) { ctx.fillStyle = i % 3 ? "rgba(140,136,132,.18)" : "rgba(58,52,49,.8)"; ctx.fillRect((i * 137) % W, GROUND + 7 + (i * 17) % 30, 1 + i % 3, 1 + i % 2); }
      ctx.fillStyle = P.void; ctx.fillRect(0, GROUND + FLOOR_H, W, H - GROUND - FLOOR_H);
      const torch = (worldX: number) => { const x = Math.round(worldX - camera * 0.55); ctx.fillStyle = P.colD; ctx.fillRect(x - 9, CEIL_Y + 6, 18, GROUND - CEIL_Y - 6); ctx.fillStyle = P.colM; ctx.fillRect(x - 5, CEIL_Y + 6, 8, GROUND - CEIL_Y - 6); ctx.fillStyle = P.colL; ctx.fillRect(x - 4, CEIL_Y + 6, 3, GROUND - CEIL_Y - 6); ctx.fillStyle = P.colM; ctx.fillRect(x - 15, CEIL_Y, 30, 8); ctx.fillStyle = P.flame; ctx.fillRect(x - 2, 143, 4, 8); ctx.fillStyle = P.flameC; ctx.fillRect(x - 1, 144, 2, 4); const light = ctx.createRadialGradient(x, 148, 4, x, 148, 105); light.addColorStop(0, "rgba(255,170,80,.18)"); light.addColorStop(1, "rgba(255,120,40,0)"); ctx.fillStyle = light; ctx.fillRect(x - 105, 43, 210, 210); };
      torch(90); torch(520); torch(950);
      const drawSheet = (source: HTMLImageElement, animation: Animation, t: number, cx: number, scale: number, flip: boolean, isMob: boolean) => { if (!source.complete || !source.naturalWidth) return; const f = frame(animation, t, isMob); const [, frames] = (isMob ? sheets.mob : sheets.hero)[animation]; const size = 128 * scale; const x = Math.round(cx - size / 2); const y = Math.round(GROUND - size); ctx.save(); ctx.translate(flip ? x + size : x, y); if (flip) ctx.scale(-1, 1); ctx.drawImage(source, f * 128, 0, 128, 128, 0, 0, size, size); ctx.restore(); };
      const heroSignal = partyId ? animations[partyId] : undefined; const heroActive = active(heroSignal, time); const heroAnimation: Animation = heroActive && heroSignal ? heroSignal.animation : moving ? "walk" : "idle"; const heroTime = heroActive && heroSignal ? time - heroSignal.epoch : time; drawSheet(hero[heroAnimation], heroAnimation, heroTime, moving ? 250 + Math.sin(time * 2) * 10 : 275, HERO_SCALE, status === "retreating", false);
      const list = enemies.length ? enemies : moving ? [0, 1, 2].map((index) => ({ id: `ghost-${index}`, name: "Ignavo", hp: 1, maxHp: 1 })) : [];
      list.forEach((enemy, index) => { const signal = animations[enemy.id]; const isActive = active(signal, time); const animation: Animation = isActive && signal ? signal.animation : moving ? "walk" : "idle"; const t = isActive && signal ? time - signal.epoch : time + index * .13; const x = 510 + index * 88 - (moving ? Math.min(100, time * 30) : 0); drawSheet(mob[animation], animation, t, x, MOB_SCALE, true, true); if (enemy.hp < enemy.maxHp) { ctx.fillStyle = "#1b1410"; ctx.fillRect(x - 25, GROUND - 9, 50, 4); ctx.fillStyle = P.blood; ctx.fillRect(x - 25, GROUND - 9, 50 * enemy.hp / Math.max(1, enemy.maxHp), 4); } });
      feedback.forEach((item, index) => { const x = 450 + (index % 4) * 115; const y = 148 - (index % 3) * 18; ctx.font = '600 13px ui-monospace, monospace'; ctx.textAlign = "center"; ctx.fillStyle = "rgba(0,0,0,.85)"; ctx.fillText(item.text, x + 1, y + 1); ctx.fillStyle = item.color; ctx.fillText(item.text, x, y); });
    };
    Object.values({ ...hero, ...mob }).forEach((entry) => entry.addEventListener("load", draw)); draw();
    return () => Object.values({ ...hero, ...mob }).forEach((entry) => entry.removeEventListener("load", draw));
  }, [time, status, enemies, animations, partyId, feedback]);
  return <View style={styles.host}><canvas ref={ref} style={styles.canvas} aria-label="Cena do Vestíbulo" /><Text style={styles.hint}>{status === "combat" ? "A party parou. O combate resolve sozinho." : status === "retreating" ? "Recuando para uma margem mais rasa." : "A marcha continua…"}</Text></View>;
}

const styles = StyleSheet.create({ host: { width: "100%", aspectRatio: W / H, position: "relative", overflow: "hidden", backgroundColor: P.void, borderColor: "#241b14", borderWidth: 1 }, canvas: { width: "100%", height: "100%", display: "block", imageRendering: "pixelated" } as never, hint: { position: "absolute", left: 10, bottom: 8, color: "#6b5a44", fontSize: 9 } });
