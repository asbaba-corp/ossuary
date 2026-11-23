import { Component } from "react";
import type { ReactNode } from "react";
import { Platform } from "react-native";
import { Scene3D } from "./Scene3D";
import { SkiaScene } from "./SkiaScene";
import type { SceneProps } from "./sceneLayout";

/* Quem consome é o GameScreen, que não deve saber com que tecnologia a cena é
   pintada. Desde a 0.29 a cena é 3D (three.js, Scene3D.tsx).

   A cena Skia continua aqui por dois motivos:
   - fallback: se o GL não subir (aparelho sem WebGL, contexto perdido), a cena
     cai na 2D em vez de deixar um buraco preto no meio do jogo;
   - comparação: no web, `?cena=2d` força a cena antiga — é o que gravou o
     vídeo de antes/depois. */

class CaiNa2D extends Component<{ props: SceneProps; children: ReactNode }, { falhou: boolean }> {
  state = { falhou: false };
  static getDerivedStateFromError() { return { falhou: true }; }
  componentDidCatch(erro: unknown) { console.warn("Cena 3D falhou; usando a 2D.", erro); }
  render() { return this.state.falhou ? <SkiaScene {...this.props.props} /> : this.props.children; }
}

const pediu2D = Platform.OS === "web" && typeof location !== "undefined" && /[?&]cena=2d\b/.test(location.search);

export function SceneRenderer(props: SceneProps) {
  if (pediu2D) return <SkiaScene {...props} />;
  return <CaiNa2D props={props}><Scene3D {...props} /></CaiNa2D>;
}
