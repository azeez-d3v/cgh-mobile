import { memo } from 'react';
import type { ComponentType } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { BookOpen, CalendarDays, CheckSquare, ChevronRight, CreditCard, ListChecks, ReceiptText, UserRound } from 'lucide-react-native';
import type { LucideProps } from 'lucide-react-native';
import type { PortalModuleConfig, PortalModuleKey } from '../types';
import { colors } from '../theme/colors';
import { radii } from '../theme/spacing';
import { fontFamily } from '../theme/typography';
import { AnimatedPressable } from './AnimatedPressable';

export const ModuleCard = memo(function ModuleCard({ module, onPress, index = 0 }: { module: PortalModuleConfig; onPress: (key: PortalModuleConfig['key']) => void; index?: number }) {
  const Icon = moduleIcon(module.key);
  return (
    <AnimatedPressable onPress={() => onPress(module.key)} style={styles.card}>
      <View style={[styles.iconBubble, iconAccent(module.key)]}>
        <Icon size={23} color={colors.rose500} strokeWidth={2.5} />
      </View>
      <View style={styles.copy}>
        <Text style={styles.title}>{module.label}</Text>
        <Text style={styles.description}>{module.description}</Text>
      </View>
      <View style={styles.chevronBubble}>
        <ChevronRight size={19} color={colors.rose500} strokeWidth={3} />
      </View>
    </AnimatedPressable>
  );
});

function moduleIcon(key: PortalModuleKey): ComponentType<LucideProps> {
  switch (key) {
    case 'personalInfo':
      return UserRound;
    case 'subjects':
      return BookOpen;
    case 'schedule':
      return CalendarDays;
    case 'ledger':
      return ReceiptText;
    case 'dues':
      return CreditCard;
    case 'checklist':
      return ListChecks;
    default:
      return CheckSquare;
  }
}

function iconAccent(key: PortalModuleKey) {
  switch (key) {
    case 'ledger':
    case 'dues':
      return styles.creamBubble;
    case 'schedule':
      return styles.lavenderBubble;
    case 'checklist':
      return styles.mintBubble;
    default:
      return styles.roseBubble;
  }
}

const styles = StyleSheet.create({
  card: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: 'rgba(255,255,255,0.92)',
    borderRadius: radii.lg,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 14,
    padding: 15,
    shadowColor: colors.rose400,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.1,
    shadowRadius: 22,
    elevation: 3,
  },
  iconBubble: {
    alignItems: 'center',
    borderRadius: 18,
    height: 52,
    justifyContent: 'center',
    width: 52,
  },
  roseBubble: {
    backgroundColor: colors.rose100,
  },
  creamBubble: {
    backgroundColor: colors.cream,
  },
  lavenderBubble: {
    backgroundColor: colors.lavenderSoft,
  },
  mintBubble: {
    backgroundColor: colors.mint,
  },
  copy: {
    flex: 1,
    gap: 4,
  },
  title: {
    color: colors.ink,
    fontFamily: fontFamily.black,
    fontSize: 16,
  },
  description: {
    color: colors.inkSoft,
    fontFamily: fontFamily.regular,
    fontSize: 13,
    lineHeight: 18,
  },
  chevronBubble: {
    alignItems: 'center',
    backgroundColor: colors.rose50,
    borderRadius: 18,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
});
