import { Image, StyleSheet, View, type ImageSourcePropType } from "react-native";

type SpriteAnimation = "idle" | "walk" | "attack" | "hurt" | "dead";

const HERO_SHEETS: Record<SpriteAnimation, { source: ImageSourcePropType; frames: number; fps: number; loop: boolean }> = {
  idle: { source: require("../../../sprites/knight-character-sprites-pixel-art/Spritesheet 128/Knight_1/Idle.png"), frames: 4, fps: 6, loop: true },
  walk: { source: require("../../../sprites/knight-character-sprites-pixel-art/Spritesheet 128/Knight_1/Walk.png"), frames: 8, fps: 10, loop: true },
  attack: { source: require("../../../sprites/knight-character-sprites-pixel-art/Spritesheet 128/Knight_1/Attack 1.png"), frames: 5, fps: 13, loop: false },
  hurt: { source: require("../../../sprites/knight-character-sprites-pixel-art/Spritesheet 128/Knight_1/Hurt.png"), frames: 4, fps: 14, loop: false },
  dead: { source: require("../../../sprites/knight-character-sprites-pixel-art/Spritesheet 128/Knight_1/Dead.png"), frames: 6, fps: 11, loop: false },
};

const IGNAVO_SHEETS: Record<SpriteAnimation, { source: ImageSourcePropType; frames: number; fps: number; loop: boolean }> = {
  idle: { source: require("../../../sprites/Free-Urban-Zombie-Sprite-Sheet-Pixel-Art-Pack/Zombie_5/Idle.png"), frames: 6, fps: 6, loop: true },
  walk: { source: require("../../../sprites/Free-Urban-Zombie-Sprite-Sheet-Pixel-Art-Pack/Zombie_5/Walk.png"), frames: 10, fps: 12, loop: true },
  attack: { source: require("../../../sprites/Free-Urban-Zombie-Sprite-Sheet-Pixel-Art-Pack/Zombie_5/Attack.png"), frames: 4, fps: 8, loop: false },
  hurt: { source: require("../../../sprites/Free-Urban-Zombie-Sprite-Sheet-Pixel-Art-Pack/Zombie_5/Hurt.png"), frames: 4, fps: 14, loop: false },
  dead: { source: require("../../../sprites/Free-Urban-Zombie-Sprite-Sheet-Pixel-Art-Pack/Zombie_5/Dead.png"), frames: 5, fps: 11, loop: false },
};

export function Sprite({ kind, animation, time, scale = 0.72, flip = false, loop, label }: {
  readonly kind: "hero" | "ignavo";
  readonly animation: SpriteAnimation;
  readonly time: number;
  readonly scale?: number;
  readonly flip?: boolean;
  readonly loop?: boolean;
  readonly label: string;
}) {
  const sheet = (kind === "hero" ? HERO_SHEETS : IGNAVO_SHEETS)[animation];
  const shouldLoop = loop ?? sheet.loop;
  const frame = shouldLoop
    ? Math.floor(time * sheet.fps) % sheet.frames
    : Math.min(sheet.frames - 1, Math.floor(Math.max(0, time) * sheet.fps));
  const frameSize = 128 * scale;
  return <View accessible accessibilityLabel={label} style={[styles.frame, { width: frameSize, height: frameSize }]}>
    <View style={[styles.frame, { width: frameSize, height: frameSize }, flip && styles.flipped]}>
      <Image source={sheet.source} resizeMode="stretch" style={{ position: "absolute", left: -frame * frameSize, top: 0, width: frameSize * sheet.frames, height: frameSize }} />
    </View>
  </View>;
}

const styles = StyleSheet.create({ frame: { overflow: "hidden", position: "relative" }, flipped: { transform: [{ scaleX: -1 }] }, });
