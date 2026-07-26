import type { ComponentType } from 'react';
import { StyleSheet } from 'react-native';
import type { LucideProps } from 'lucide-react-native';
import { colors } from '../theme/colors';
import { AnimatedPressable } from './AnimatedPressable';

export function IconButton({
  icon: Icon,
  onPress,
  active,
  label,
}: {
  icon: ComponentType<LucideProps>;
  onPress?: () => void;
  active?: boolean;
  label?: string;
}) {
  return (
    <AnimatedPressable onPress={onPress} style={[styles.button, active ? styles.active : null]}>
      <Icon size={20} color={active ? colors.white : colors.rose500} strokeWidth={2.5} accessibilityLabel={label} />
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.7)',
    borderRadius: 20,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  active: {
    backgroundColor: colors.rose500,
  },
});
