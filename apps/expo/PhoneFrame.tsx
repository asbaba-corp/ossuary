import type { ReactNode } from 'react';
import { Platform, StyleSheet, View } from 'react-native';

const isWeb = Platform.OS === 'web';

// Native keeps the app shell explicit. The browser renders the lab at full
// width so desktop debugging is not constrained by a fake handset.
export function PhoneFrame({ children }: { children: ReactNode }) {
  if (isWeb) return <>{children}</>;
  return <View style={styles.native}>{children}</View>;
}

const styles = StyleSheet.create({
  native: {
    flex: 1,
  },
});
