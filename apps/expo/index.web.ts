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
