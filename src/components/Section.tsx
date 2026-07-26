import type { PropsWithChildren } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme/colors';
import { fontFamily } from '../theme/typography';
import { radii } from '../theme/spacing';

export function Section({ title, children }: PropsWithChildren<{ title: string }>) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

export function EmptyState({ message }: { message: string }) {
  return (
    <View style={styles.empty}>
      <Text style={styles.emptyText}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: 12,
    marginBottom: 22,
  },
  sectionTitle: {
    color: colors.ink,
    fontFamily: fontFamily.black,
    fontSize: 18,
  },
  empty: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: 'rgba(255,255,255,0.9)',
    borderRadius: radii.lg,
    borderWidth: 1,
    padding: 20,
  },
  emptyText: {
    color: colors.inkSoft,
    fontFamily: fontFamily.medium,
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
});
