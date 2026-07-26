import { memo, useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import Animated, { FadeIn, FadeInUp } from 'react-native-reanimated';
import { ChevronLeft, ChevronRight, Layers3 } from 'lucide-react-native';
import type { PortalInfoSection } from '../types';
import { colors } from '../theme/colors';
import { radii } from '../theme/spacing';
import { fontFamily } from '../theme/typography';
import { AnimatedPressable } from './AnimatedPressable';
import { DataTable } from './DataTable';

export const InfoSectionPager = memo(function InfoSectionPager({ sections }: { sections: PortalInfoSection[] }) {
  const { width } = useWindowDimensions();
  const contentWidth = Math.min(Math.max(240, width - 40), 960);
  const fieldsPerPage = width < 560 ? 6 : 10;
  const [sectionIndex, setSectionIndex] = useState(0);
  const [fieldPage, setFieldPage] = useState(0);
  const safeSectionIndex = Math.min(sectionIndex, Math.max(sections.length - 1, 0));
  const section = sections[safeSectionIndex];
  const entries = useMemo(() => Object.entries(section?.fields ?? {}), [section]);
  const fieldPageCount = Math.max(1, Math.ceil(entries.length / fieldsPerPage));
  const safeFieldPage = Math.min(fieldPage, fieldPageCount - 1);
  const visibleEntries = useMemo(
    () => entries.slice(safeFieldPage * fieldsPerPage, safeFieldPage * fieldsPerPage + fieldsPerPage),
    [entries, fieldsPerPage, safeFieldPage],
  );

  useEffect(() => {
    setSectionIndex((current) => Math.min(current, Math.max(sections.length - 1, 0)));
  }, [sections.length]);

  function selectSection(index: number) {
    setSectionIndex(index);
    setFieldPage(0);
  }

  if (!section) return null;

  return (
    <View style={[styles.shell, { width: contentWidth }]}>
      <View style={styles.headingRow}>
        <View style={styles.headingIcon}>
          <Layers3 size={18} color={colors.rose500} strokeWidth={2.7} />
        </View>
        <View style={styles.headingCopy}>
          <Text style={styles.heading}>Information sections</Text>
          <Text style={styles.headingHint}>Only one section is shown at a time to keep the page short.</Text>
        </View>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroller} contentContainerStyle={styles.chipStrip}>
        {sections.map((item, index) => {
          const active = index === safeSectionIndex;
          return (
            <AnimatedPressable key={item.id} onPress={() => selectSection(index)} style={[styles.chip, active ? styles.chipActive : null]}>
              <Text style={[styles.chipText, active ? styles.chipTextActive : null]}>{item.title}</Text>
            </AnimatedPressable>
          );
        })}
      </ScrollView>

      <Animated.View key={`${section.id}-${safeFieldPage}`} entering={FadeIn.duration(220)} style={styles.sectionCard}>
        <View style={styles.sectionHeader}>
          <View>
            <Text style={styles.eyebrow}>SECTION {safeSectionIndex + 1} OF {sections.length}</Text>
            <Text style={styles.sectionTitle}>{section.title}</Text>
          </View>
          <View style={styles.sectionArrows}>
            <PagerButton
              disabled={safeSectionIndex === 0}
              direction="left"
              onPress={() => selectSection(Math.max(0, safeSectionIndex - 1))}
            />
            <PagerButton
              disabled={safeSectionIndex === sections.length - 1}
              direction="right"
              onPress={() => selectSection(Math.min(sections.length - 1, safeSectionIndex + 1))}
            />
          </View>
        </View>

        {visibleEntries.length > 0 ? (
          <View style={styles.infoGrid}>
            {visibleEntries.map(([label, value], index) => (
              <Animated.View key={`${label}-${value}`} entering={FadeInUp.delay(index * 35).duration(240)} style={styles.infoItem}>
                <Text style={styles.infoLabel}>{label}</Text>
                <Text selectable style={styles.infoValue}>{value || '—'}</Text>
              </Animated.View>
            ))}
          </View>
        ) : null}

        {fieldPageCount > 1 ? (
          <View style={styles.fieldPager}>
            <PagerButton disabled={safeFieldPage === 0} direction="left" onPress={() => setFieldPage((page) => Math.max(0, page - 1))} />
            <Text style={styles.pageText}>Details {safeFieldPage + 1} of {fieldPageCount}</Text>
            <PagerButton
              disabled={safeFieldPage === fieldPageCount - 1}
              direction="right"
              onPress={() => setFieldPage((page) => Math.min(fieldPageCount - 1, page + 1))}
            />
          </View>
        ) : null}
      </Animated.View>

      {section.tables?.map((table, index) => <DataTable key={`${section.id}-${table.title}-${index}`} table={table} />)}
    </View>
  );
});

function PagerButton({
  disabled,
  direction,
  onPress,
}: {
  disabled: boolean;
  direction: 'left' | 'right';
  onPress: () => void;
}) {
  const Icon = direction === 'left' ? ChevronLeft : ChevronRight;
  return (
    <AnimatedPressable disabled={disabled} onPress={onPress} style={[styles.arrowButton, disabled ? styles.arrowDisabled : null]}>
      <Icon size={17} color={disabled ? colors.muted : colors.rose500} strokeWidth={3} />
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  shell: {
    alignSelf: 'stretch',
    gap: 12,
    marginTop: 20,
    maxWidth: '100%',
    overflow: 'hidden',
  },
  headingRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
  },
  headingIcon: {
    alignItems: 'center',
    backgroundColor: colors.rose100,
    borderRadius: 18,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  headingCopy: {
    flex: 1,
  },
  heading: {
    color: colors.ink,
    fontFamily: fontFamily.black,
    fontSize: 18,
  },
  headingHint: {
    color: colors.muted,
    fontFamily: fontFamily.medium,
    fontSize: 11,
    lineHeight: 15,
  },
  chipStrip: {
    gap: 8,
    paddingRight: 18,
  },
  chipScroller: {
    maxWidth: '100%',
  },
  chip: {
    backgroundColor: colors.surface,
    borderColor: colors.line,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 13,
    paddingVertical: 9,
  },
  chipActive: {
    backgroundColor: colors.rose500,
    borderColor: colors.rose500,
  },
  chipText: {
    color: colors.inkSoft,
    fontFamily: fontFamily.bold,
    fontSize: 12,
  },
  chipTextActive: {
    color: colors.white,
  },
  sectionCard: {
    backgroundColor: colors.surface,
    borderColor: 'rgba(255,255,255,0.92)',
    borderRadius: radii.lg,
    borderWidth: 1,
    gap: 14,
    maxWidth: '100%',
    padding: 14,
    width: '100%',
  },
  sectionHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  eyebrow: {
    color: colors.rose500,
    fontFamily: fontFamily.black,
    fontSize: 9,
    letterSpacing: 0.8,
  },
  sectionTitle: {
    color: colors.ink,
    fontFamily: fontFamily.black,
    fontSize: 18,
    marginTop: 2,
  },
  sectionArrows: {
    flexDirection: 'row',
    gap: 7,
  },
  arrowButton: {
    alignItems: 'center',
    backgroundColor: colors.rose50,
    borderColor: colors.line,
    borderRadius: 16,
    borderWidth: 1,
    height: 34,
    justifyContent: 'center',
    width: 34,
  },
  arrowDisabled: {
    opacity: 0.42,
  },
  infoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  infoItem: {
    backgroundColor: colors.white,
    borderColor: colors.line,
    borderRadius: radii.md,
    borderWidth: 1,
    flexBasis: '47%',
    flexGrow: 1,
    minWidth: 0,
    padding: 12,
  },
  infoLabel: {
    color: colors.muted,
    fontFamily: fontFamily.black,
    fontSize: 9,
    textTransform: 'uppercase',
  },
  infoValue: {
    color: colors.ink,
    fontFamily: fontFamily.bold,
    fontSize: 13,
    lineHeight: 18,
    marginTop: 5,
  },
  fieldPager: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'center',
  },
  pageText: {
    color: colors.inkSoft,
    fontFamily: fontFamily.black,
    fontSize: 11,
  },
});
