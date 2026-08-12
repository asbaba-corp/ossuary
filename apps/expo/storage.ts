import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import type { SaveStore, SerializedSave } from '@ossuary/core';

const SAVE_KEY = 'ossuary:game-state:v1';

/**
 * Persistent client storage. Web uses the browser's localStorage; native
 * platforms use AsyncStorage, whose mobile implementation survives app
 * restarts and does not require a database connection.
 */
export class ExpoSaveStore implements SaveStore {
  public constructor(private readonly key = SAVE_KEY) {}

  async load(): Promise<SerializedSave | null> {
    const raw = Platform.OS === 'web'
      ? globalThis.localStorage?.getItem(this.key) ?? null
      : await AsyncStorage.getItem(this.key);
    return raw ? JSON.parse(raw) as SerializedSave : null;
  }

  async save(save: SerializedSave): Promise<void> {
    const raw = JSON.stringify(save);
    if (Platform.OS === 'web') {
      globalThis.localStorage?.setItem(this.key, raw);
      return;
    }
    await AsyncStorage.setItem(this.key, raw);
  }

  async clear(): Promise<void> {
    if (Platform.OS === 'web') {
      globalThis.localStorage?.removeItem(this.key);
      return;
    }
    await AsyncStorage.removeItem(this.key);
  }
}
