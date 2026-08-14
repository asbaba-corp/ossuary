import { useEffect, useState } from 'react';
import { Platform } from 'react-native';

import { PhoneFrame } from './PhoneFrame';
import { GameScreen } from './game/GameScreen';
import { MechanicsLabScreen } from './MechanicsLabScreen';

const LAB_PATH = '/lab';

function currentWebPath() {
  if (Platform.OS !== 'web' || typeof window === 'undefined') {
    return LAB_PATH;
  }

  return window.location.pathname.replace(/\/+$/, '') || '/';
}

export default function App() {
  const [path, setPath] = useState(currentWebPath);

  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return;
    const onPopState = () => setPath(currentWebPath());
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, [path]);

  return (
    <PhoneFrame>
      {Platform.OS === 'web' && path === LAB_PATH ? <MechanicsLabScreen /> : <GameScreen />}
    </PhoneFrame>
  );
}
