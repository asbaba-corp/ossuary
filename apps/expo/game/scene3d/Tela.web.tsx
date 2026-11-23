/* No web o Metro TAMBÉM segue o campo `react-native` do pacote e entregava a
   entrada nativa do r3f, que espera o GLView do expo-gl: o canvas aparecia com
   tamanho certo e ficava preto, sem erro nenhum no console — a cena nunca
   montava. O caminho explícito força a entrada de navegador. */
// Os hooks vêm do MESMO arquivo: misturar entradas dá dois contextos do r3f.
// @ts-expect-error -- caminho interno do pacote; os tipos são os da entrada principal
export { Canvas, useFrame, useThree } from "@react-three/fiber/dist/react-three-fiber.esm.js";
