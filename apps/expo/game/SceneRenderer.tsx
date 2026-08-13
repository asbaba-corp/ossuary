/* A cena é desenhada em Skia, não em Views posicionadas.
   Parallax, poças de luz e partículas não saem de `<View>` com CSS — foi essa
   tentativa que trouxe a cena com "estilo cagado" e presa ao web. Skia roda no
   nativo direto e no web via CanvasKit, então o mesmo arquivo serve às três
   plataformas e o jogo passa a existir fora do navegador.

   Este arquivo existe só para dar um nome estável ao renderer: quem consome é
   o GameScreen, que não deve saber com que tecnologia a cena é pintada. */
export { SkiaScene as SceneRenderer } from "./SkiaScene";
