import { registerRootComponent } from "expo";
import { LoadSkiaWeb } from "@shopify/react-native-skia/lib/module/web";

/* No web, o Skia roda sobre CanvasKit, que é um WASM que precisa ser carregado
   antes do primeiro render. Sem isto o console cospe `CanvasKit is not defined`
   e todo `useImage` devolve null — a cena aparece vazia, sem erro visível na
   tela, que é o sintoma mais caro de diagnosticar.

   O binário fica em `public/`, servido na raiz pelo Metro.

   No nativo nada disso é necessário: o Skia é compilado junto com o app, e o
   `index.ts` cuida do registro. */
LoadSkiaWeb({ locateFile: (file) => `/${file}` })
  .then(async () => {
    const App = (await import("./App")).default;
    registerRootComponent(App);
  })
  .catch((erro) => {
    console.error("Falha ao carregar o CanvasKit; a cena não vai renderizar.", erro);
  });

/* SONDA TEMPORÁRIA de fluidez — medir de dentro do app, não de fora.
   A primeira sonda vivia numa página pai que carregava o app num iframe e
   media o rAF DELA. A página pai não desenha nada: ela marcava 59fps enquanto
   o canvas do jogo podia estar a 10. Aqui o rAF é o do próprio app. */
if (typeof window !== "undefined" && window.location.search.includes("sonda")) {
  const deltas: number[] = [];
  let anterior = performance.now();
  const inicio = anterior;
  const quadro = (agora: number) => {
    deltas.push(agora - anterior);
    anterior = agora;
    if (agora - inicio < 12000) { requestAnimationFrame(quadro); return; }
    const uteis = deltas.slice(90);                    // descarta a carga
    const ord = [...uteis].sort((a, b) => a - b);
    const p = (q: number) => ord[Math.floor(ord.length * q)] ?? 0;
    const media = uteis.reduce((s, d) => s + d, 0) / uteis.length;
    const linha = `DENTRO_DO_APP fps=${(1000 / media).toFixed(1)} p50=${p(0.5).toFixed(1)}ms `
      + `p95=${p(0.95).toFixed(1)}ms pior=${(ord[ord.length - 1] ?? 0).toFixed(0)}ms `
      + `acima50=${uteis.filter((d) => d > 50).length}/${uteis.length}`;
    void fetch("http://127.0.0.1:9333/r?" + encodeURIComponent(linha), { mode: "no-cors" });
  };
  requestAnimationFrame(quadro);
}
