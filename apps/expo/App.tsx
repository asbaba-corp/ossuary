import { useEffect, useState } from 'react';
import { Platform } from 'react-native';

import { PhoneFrame } from './PhoneFrame';
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
    if (Platform.OS === 'web' && path === '/') {
      window.history.replaceState({}, '', LAB_PATH);
      setPath(LAB_PATH);
    }
  }, [path]);

  if (Platform.OS === 'web' && path !== LAB_PATH) {
    return null;
  }

  return (
    <PhoneFrame>
      <MechanicsLabScreen />
    </PhoneFrame>
  );
}
