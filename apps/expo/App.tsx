import { PhoneFrame } from './PhoneFrame';
import { MechanicsLabScreen } from './MechanicsLabScreen';

// O preview atual é um laboratório isolado; o shell final entra quando o
// loop de jogo e a navegação forem definidos.
export default function App() {
  return (
    <PhoneFrame>
      <MechanicsLabScreen />
    </PhoneFrame>
  );
}
