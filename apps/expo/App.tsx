import { StyleSheet, View } from 'react-native';
import { PhoneFrame } from './PhoneFrame';

// Boilerplate: blank page, rendered inside a phone frame on web
// (full-screen on iOS/Android). Game content goes here later.
export default function App() {
  return (
    <PhoneFrame>
      <View style={styles.page} />
    </PhoneFrame>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: '#0e0e12',
  },
});
