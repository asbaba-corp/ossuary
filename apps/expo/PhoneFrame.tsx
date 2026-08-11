import type { ReactNode } from 'react';
import { Platform, StyleSheet, View } from 'react-native';

const isWeb = Platform.OS === 'web';

// On native (iOS/Android) the app is full-screen — no frame.
// On web we wrap the screen in a phone bezel so the game reads like a
// device on a desktop browser. Platform.OS is evaluated at module load and
// RN Web tree-shakes the unused branch.
export function PhoneFrame({ children }: { children: ReactNode }) {
  if (!isWeb) {
    return <View style={styles.native}>{children}</View>;
  }
  return (
    <View style={styles.page}>
      <View style={styles.bezel}>
        <View style={styles.notch} />
        <View style={styles.screen}>{children}</View>
      </View>
    </View>
  );
}

const SCREEN_W = 390;
const SCREEN_H = 844;
const RADIUS = 56;

const styles = StyleSheet.create({
  native: {
    flex: 1,
  },
  page: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#17171c',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bezel: {
    width: 'auto',
    height: SCREEN_H,
    maxHeight: '94%',
    aspectRatio: SCREEN_W / SCREEN_H,
    backgroundColor: '#050506',
    borderWidth: 10,
    borderColor: '#2a2a31',
    borderRadius: RADIUS,
    overflow: 'hidden',
    // shadow (ignored on native, applied on web via RN Web)
    shadowColor: '#000',
    shadowOpacity: 0.55,
    shadowRadius: 40,
    shadowOffset: { width: 0, height: 18 },
  },
  notch: {
    position: 'absolute',
    top: 10,
    alignSelf: 'center',
    width: 140,
    height: 26,
    backgroundColor: '#000',
    borderRadius: 16,
    zIndex: 1,
  },
  screen: {
    flex: 1,
    borderTopLeftRadius: RADIUS - 12,
    borderTopRightRadius: RADIUS - 12,
    borderBottomLeftRadius: RADIUS - 12,
    borderBottomRightRadius: RADIUS - 12,
    overflow: 'hidden',
    backgroundColor: '#0e0e12',
  },
});
