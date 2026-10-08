import { BlurView } from 'expo-blur';
import { useEffect, type RefObject } from 'react';
import type { View } from 'react-native';
import Animated, {
  cancelAnimation, Easing, ReduceMotion, useAnimatedStyle, useSharedValue, withTiming,
} from 'react-native-reanimated';
import { withUniwind } from 'uniwind';

// expo-blur is a third-party component; wrap once to enable className support.
const Blur = withUniwind(BlurView);

/** Keep the native blur target attached; fade the result, not the blur radius. */
export function BlurBackdrop({ visible, target }: {
  visible: boolean; target: RefObject<View | null>;
}) {
  const opacity = useSharedValue(0);
  const animatedStyle = useAnimatedStyle(() => ({ opacity: opacity.get() }));

  useEffect(() => {
    // Continue from the current UI-thread value when opening reverses a closing fade.
    opacity.set(withTiming(visible ? 1 : 0, {
      duration: 300,
      easing: Easing.inOut(Easing.cubic),
      reduceMotion: ReduceMotion.System,
    }));
    return () => cancelAnimation(opacity);
  }, [opacity, visible]);

  return <Animated.View pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants"
    className="absolute inset-0" style={animatedStyle}>
    <Blur testID="blur-backdrop" pointerEvents="none" blurTarget={target}
      blurMethod="dimezisBlurView" intensity={65} tint="light" className="absolute inset-0" />
  </Animated.View>;
}
