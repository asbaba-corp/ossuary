import { StyleSheet, Text, View } from "react-native";
import { Sprite } from "./Sprite";
import type { SceneAnimationState } from "./GameViewModel";

export function SceneRenderer({ time, status }: { time: number; status: string; enemies: readonly { id: string; name: string; hp: number; maxHp: number }[]; animations: SceneAnimationState; partyId?: string; feedback: readonly { id: string; text: string; color: string }[] }) {
  const moving = status === "walking" || status === "retreating";
  return <View style={styles.scene} accessibilityLabel="Cena do Vestíbulo"><View style={styles.wall} /><View style={styles.column} /><View style={[styles.hero, { left: `${25 + Math.sin(time * 2) * 2}%` }]}><Sprite kind="hero" animation={moving ? "walk" : "idle"} time={time} scale={1.3} label="Sem-Nome" /></View><Text style={styles.hint}>Cena Skia disponível no web/development build.</Text></View>;
}

const styles = StyleSheet.create({ scene: { height: 400, width: "100%", overflow: "hidden", position: "relative", backgroundColor: "#0a0b0d", borderColor: "#241b14", borderWidth: 1 }, wall: { position: "absolute", top: 72, left: 0, right: 0, bottom: 44, backgroundColor: "#3a3230" }, column: { position: "absolute", top: 40, bottom: 44, left: "18%", width: 20, backgroundColor: "#524737" }, hero: { position: "absolute", bottom: 44 }, hint: { position: "absolute", left: 10, bottom: 8, color: "#6b5a44", fontSize: 9 } });
