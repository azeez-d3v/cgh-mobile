import type { PropsWithChildren } from 'react';
import { Pressable, StyleProp, ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';

const AnimatedPressableBase = Animated.createAnimatedComponent(Pressable);

export function AnimatedPressable({
  children,
  onPress,
  style,
  disabled,
}: PropsWithChildren<{ onPress?: () => void; style?: StyleProp<ViewStyle>; disabled?: boolean }>) {
  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }));

  return (
    <AnimatedPressableBase
      disabled={disabled}
      onPress={onPress}
      onPressIn={() => {
        scale.value = withSpring(0.975, { damping: 16, stiffness: 260 });
        opacity.value = withTiming(0.84, { duration: 100 });
      }}
      onPressOut={() => {
        scale.value = withSpring(1, { damping: 16, stiffness: 260 });
        opacity.value = withTiming(1, { duration: 140 });
      }}
      style={[style, animatedStyle]}
    >
      {children}
    </AnimatedPressableBase>
  );
}
