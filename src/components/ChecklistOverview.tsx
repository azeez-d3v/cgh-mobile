import { memo, useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn, FadeInUp } from 'react-native-reanimated';
import { CheckCircle2, ChevronLeft, ChevronRight, CircleDashed, GraduationCap } from 'lucide-react-native';
import type { TableData } from '../types';
import { colors } from '../theme/colors';
import { radii } from '../theme/spacing';
import { fontFamily } from '../theme/typography';
import { AnimatedPressable } from './AnimatedPressable';

type ChecklistFilter = 'remaining' | 'completed' | 'all';
type ChecklistRecord = {
  term: string;
  code: string;
  description: string;
  units: string;
  credit: string;
  remark: string;
  completed: boolean;
  inProgress: boolean;
};

const PAGE_SIZE = 5;

export const ChecklistOverview = memo(function ChecklistOverview({
  table,
  summary,
}: {
  table: TableData;
  summary: Record<string, string>;
}) {
  const records = useMemo(() => normalizeChecklist(table), [table]);
  const terms = useMemo(() => [...new Set(records.map((record) => record.term).filter(Boolean))], [records]);
  const defaultTerm = useMemo(
    () => terms.find((term) => records.some((record) => record.term === term && !record.completed)) ?? terms[0] ?? '',
    [records, terms],
  );
  const [term, setTerm] = useState(defaultTerm);
  const [filter, setFilter] = useState<ChecklistFilter>('remaining');
  const [page, setPage] = useState(0);

  useEffect(() => {
    if (!terms.includes(term)) setTerm(defaultTerm);
  }, [defaultTerm, term, terms]);

  const completedCount = records.filter((record) => record.completed).length;
  const remainingCount = records.length - completedCount;
  const requiredUnits = summaryNumber(summary, /total units required/i);
  const earnedUnits = summaryNumber(summary, /total units taken/i);
  const progress = requiredUnits > 0 ? Math.min(100, Math.round((earnedUnits / requiredUnits) * 100)) : records.length > 0 ? Math.round((completedCount / records.length) * 100) : 0;

  const filtered = useMemo(
    () =>
      records.filter((record) => {
        if (term && record.term !== term) return false;
        if (filter === 'remaining') return !record.completed;
        if (filter === 'completed') return record.completed;
        return true;
      }),
    [filter, records, term],
  );
  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount - 1);
  const visible = filtered.slice(safePage * PAGE_SIZE, safePage * PAGE_SIZE + PAGE_SIZE);

  function selectTerm(value: string) {
    setTerm(value);
    setPage(0);
  }

  function selectFilter(value: ChecklistFilter) {
    setFilter(value);
    setPage(0);
  }

  return (
    <View style={styles.shell}>
      <View style={styles.progressCard}>
        <View style={styles.progressHeader}>
          <View style={styles.progressIcon}>
            <GraduationCap size={21} color={colors.rose500} strokeWidth={2.7} />
          </View>
          <View style={styles.progressCopy}>
            <Text style={styles.progressTitle}>Degree progress</Text>
            <Text style={styles.progressHint}>A simple view of completed and remaining courses.</Text>
          </View>
          <Text style={styles.progressPercent}>{progress}%</Text>
        </View>
        <View style={styles.progressTrack}>
          <Animated.View entering={FadeIn.duration(320)} style={[styles.progressFill, { width: `${progress}%` }]} />
        </View>
        <View style={styles.stats}>
          <Stat value={`${completedCount}`} label="Completed" tone="green" />
          <Stat value={`${remainingCount}`} label="Remaining" tone="rose" />
          <Stat value={requiredUnits ? `${earnedUnits}/${requiredUnits}` : `${records.length}`} label={requiredUnits ? 'Units' : 'Courses'} tone="purple" />
        </View>
      </View>

      <View style={styles.browserCard}>
        <View style={styles.browserHeading}>
          <Text style={styles.browserTitle}>Curriculum courses</Text>
          <Text style={styles.browserHint}>Choose a term, then show only what matters.</Text>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipStrip}>
          {terms.map((value) => {
            const active = value === term;
            return (
              <AnimatedPressable key={value} onPress={() => selectTerm(value)} style={[styles.termChip, active ? styles.termChipActive : null]}>
                <Text style={[styles.termChipText, active ? styles.termChipTextActive : null]}>{shortTerm(value)}</Text>
              </AnimatedPressable>
            );
          })}
        </ScrollView>

        <View style={styles.filterRow}>
          {([
            ['remaining', 'To take'],
            ['completed', 'Completed'],
            ['all', 'All'],
          ] as const).map(([value, label]) => {
            const active = filter === value;
            return (
              <AnimatedPressable key={value} onPress={() => selectFilter(value)} style={[styles.filterChip, active ? styles.filterChipActive : null]}>
                <Text style={[styles.filterText, active ? styles.filterTextActive : null]}>{label}</Text>
              </AnimatedPressable>
            );
          })}
        </View>

        <Animated.View key={`${term}-${filter}-${safePage}`} entering={FadeIn.duration(220)} style={styles.courseList}>
          {visible.length > 0 ? (
            visible.map((record, index) => <CourseRow key={`${record.term}-${record.code}-${index}`} record={record} index={index} />)
          ) : (
            <View style={styles.empty}>
              <CheckCircle2 size={28} color={colors.success} strokeWidth={2.4} />
              <Text style={styles.emptyTitle}>{filter === 'remaining' ? 'Nothing left in this term' : 'No courses in this view'}</Text>
              <Text style={styles.emptyText}>Try another filter or choose a different term.</Text>
            </View>
          )}
        </Animated.View>

        {pageCount > 1 ? (
          <View style={styles.pagination}>
            <PageButton disabled={safePage === 0} direction="left" onPress={() => setPage((value) => Math.max(0, value - 1))} />
            <Text style={styles.pageText}>{safePage + 1} of {pageCount}</Text>
            <PageButton disabled={safePage === pageCount - 1} direction="right" onPress={() => setPage((value) => Math.min(pageCount - 1, value + 1))} />
          </View>
        ) : null}
      </View>
    </View>
  );
});

function CourseRow({ record, index }: { record: ChecklistRecord; index: number }) {
  const Icon = record.completed ? CheckCircle2 : CircleDashed;
  const statusLabel = record.completed ? 'Completed' : record.inProgress ? 'In progress' : 'To take';
  return (
    <Animated.View entering={FadeInUp.delay(index * 40).duration(260)} style={styles.courseRow}>
      <View style={[styles.statusIcon, record.completed ? styles.statusIconDone : null]}>
        <Icon size={17} color={record.completed ? colors.success : colors.rose500} strokeWidth={2.6} />
      </View>
      <View style={styles.courseCopy}>
        <View style={styles.courseTitleRow}>
          <Text style={styles.courseCode}>{record.code || 'Course'}</Text>
          <Text style={[styles.statusBadge, record.completed ? styles.statusBadgeDone : record.inProgress ? styles.statusBadgeProgress : null]}>{statusLabel}</Text>
        </View>
        <Text style={styles.courseName} numberOfLines={2}>{record.description || 'Course description unavailable'}</Text>
        <Text style={styles.courseMeta}>{record.units || '—'} units{record.credit ? ` • ${record.credit} earned` : ''}</Text>
      </View>
    </Animated.View>
  );
}

function Stat({ value, label, tone }: { value: string; label: string; tone: 'green' | 'rose' | 'purple' }) {
  return (
    <View style={[styles.stat, tone === 'green' ? styles.statGreen : tone === 'purple' ? styles.statPurple : null]}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function PageButton({ disabled, direction, onPress }: { disabled: boolean; direction: 'left' | 'right'; onPress: () => void }) {
  const Icon = direction === 'left' ? ChevronLeft : ChevronRight;
  return (
    <AnimatedPressable disabled={disabled} onPress={onPress} style={[styles.pageButton, disabled ? styles.pageButtonDisabled : null]}>
      <Icon size={17} color={disabled ? colors.muted : colors.rose500} strokeWidth={3} />
    </AnimatedPressable>
  );
}

function normalizeChecklist(table: TableData): ChecklistRecord[] {
  const index = (pattern: RegExp) => table.headers.findIndex((header) => pattern.test(header));
  const term = index(/^term$/i);
  const code = index(/subject code/i);
  const description = index(/subject (?:desc|title|name)/i);
  const units = index(/total unit/i);
  const credit = index(/credit earned/i);
  const remark = index(/remark/i);

  return table.rows.map((row) => {
    const creditValue = cell(row, credit);
    const remarkValue = cell(row, remark);
    const unitValue = cell(row, units);
    const explicitlyInProgress = /current|enrolled|ongoing|in progress/i.test(remarkValue);
    const completed =
      !explicitlyInProgress &&
      (/passed|complete|credited/i.test(remarkValue) ||
        (!remarkValue && parseNumber(creditValue) > 0 && parseNumber(creditValue) >= parseNumber(unitValue)));
    return {
      term: cell(row, term),
      code: cell(row, code),
      description: cell(row, description),
      units: cleanUnits(unitValue),
      credit: cleanUnits(creditValue),
      remark: remarkValue,
      completed,
      inProgress: explicitlyInProgress,
    };
  });
}

function cell(row: string[], index: number) {
  return index >= 0 ? (row[index] ?? '').trim() : '';
}

function cleanUnits(value: string) {
  return value.replace(/\s*\(Unit\)\s*/gi, '').trim();
}

function parseNumber(value: string) {
  return Number.parseFloat(value.replace(/[^0-9.-]/g, '')) || 0;
}

function summaryNumber(summary: Record<string, string>, pattern: RegExp) {
  const match = Object.entries(summary).find(([key, value]) => pattern.test(key) && parseNumber(value) > 0);
  return match ? parseNumber(match[1]) : 0;
}

function shortTerm(value: string) {
  return value.replace(/(\d)(?:st|nd|rd|th)/gi, '$1').replace(/Semester/gi, 'Sem');
}

const styles = StyleSheet.create({
  shell: {
    gap: 12,
  },
  progressCard: {
    backgroundColor: colors.surface,
    borderColor: 'rgba(255,255,255,0.92)',
    borderRadius: radii.lg,
    borderWidth: 1,
    gap: 13,
    padding: 14,
  },
  progressHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
  },
  progressIcon: {
    alignItems: 'center',
    backgroundColor: colors.rose100,
    borderRadius: 19,
    height: 38,
    justifyContent: 'center',
    width: 38,
  },
  progressCopy: {
    flex: 1,
  },
  progressTitle: {
    color: colors.ink,
    fontFamily: fontFamily.black,
    fontSize: 17,
  },
  progressHint: {
    color: colors.muted,
    fontFamily: fontFamily.medium,
    fontSize: 10,
    lineHeight: 14,
  },
  progressPercent: {
    color: colors.rose500,
    fontFamily: fontFamily.black,
    fontSize: 19,
  },
  progressTrack: {
    backgroundColor: colors.rose100,
    borderRadius: 999,
    height: 8,
    overflow: 'hidden',
  },
  progressFill: {
    backgroundColor: colors.rose500,
    borderRadius: 999,
    height: '100%',
  },
  stats: {
    flexDirection: 'row',
    gap: 8,
  },
  stat: {
    backgroundColor: colors.rose100,
    borderRadius: radii.md,
    flex: 1,
    padding: 10,
  },
  statGreen: {
    backgroundColor: colors.mint,
  },
  statPurple: {
    backgroundColor: colors.lavenderSoft,
  },
  statValue: {
    color: colors.ink,
    fontFamily: fontFamily.black,
    fontSize: 15,
  },
  statLabel: {
    color: colors.inkSoft,
    fontFamily: fontFamily.bold,
    fontSize: 9,
    marginTop: 2,
  },
  browserCard: {
    backgroundColor: colors.surface,
    borderColor: 'rgba(255,255,255,0.92)',
    borderRadius: radii.lg,
    borderWidth: 1,
    gap: 12,
    overflow: 'hidden',
    paddingVertical: 14,
  },
  browserHeading: {
    paddingHorizontal: 14,
  },
  browserTitle: {
    color: colors.ink,
    fontFamily: fontFamily.black,
    fontSize: 17,
  },
  browserHint: {
    color: colors.muted,
    fontFamily: fontFamily.medium,
    fontSize: 10,
    marginTop: 2,
  },
  chipStrip: {
    gap: 7,
    paddingHorizontal: 14,
  },
  termChip: {
    backgroundColor: colors.rose50,
    borderColor: colors.line,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  termChipActive: {
    backgroundColor: colors.rose500,
    borderColor: colors.rose500,
  },
  termChipText: {
    color: colors.inkSoft,
    fontFamily: fontFamily.bold,
    fontSize: 10,
  },
  termChipTextActive: {
    color: colors.white,
  },
  filterRow: {
    flexDirection: 'row',
    gap: 7,
    paddingHorizontal: 14,
  },
  filterChip: {
    alignItems: 'center',
    backgroundColor: colors.white,
    borderColor: colors.line,
    borderRadius: 12,
    borderWidth: 1,
    flex: 1,
    paddingHorizontal: 8,
    paddingVertical: 8,
  },
  filterChipActive: {
    backgroundColor: colors.rose100,
    borderColor: colors.rose300,
  },
  filterText: {
    color: colors.muted,
    fontFamily: fontFamily.bold,
    fontSize: 10,
  },
  filterTextActive: {
    color: colors.rose500,
  },
  courseList: {
    gap: 8,
    paddingHorizontal: 14,
  },
  courseRow: {
    alignItems: 'flex-start',
    backgroundColor: colors.white,
    borderColor: colors.line,
    borderRadius: radii.md,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 10,
    padding: 11,
  },
  statusIcon: {
    alignItems: 'center',
    backgroundColor: colors.rose100,
    borderRadius: 16,
    height: 32,
    justifyContent: 'center',
    width: 32,
  },
  statusIconDone: {
    backgroundColor: colors.mint,
  },
  courseCopy: {
    flex: 1,
    minWidth: 0,
  },
  courseTitleRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'space-between',
  },
  courseCode: {
    color: colors.ink,
    flex: 1,
    fontFamily: fontFamily.black,
    fontSize: 12,
  },
  statusBadge: {
    backgroundColor: colors.rose100,
    borderRadius: 999,
    color: colors.rose500,
    fontFamily: fontFamily.black,
    fontSize: 8,
    overflow: 'hidden',
    paddingHorizontal: 7,
    paddingVertical: 4,
    textTransform: 'uppercase',
  },
  statusBadgeDone: {
    backgroundColor: colors.mint,
    color: colors.success,
  },
  statusBadgeProgress: {
    backgroundColor: colors.lavenderSoft,
    color: colors.inkSoft,
  },
  courseName: {
    color: colors.inkSoft,
    fontFamily: fontFamily.bold,
    fontSize: 11,
    lineHeight: 15,
    marginTop: 3,
  },
  courseMeta: {
    color: colors.muted,
    fontFamily: fontFamily.medium,
    fontSize: 9,
    marginTop: 4,
  },
  empty: {
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 18,
    paddingVertical: 24,
  },
  emptyTitle: {
    color: colors.ink,
    fontFamily: fontFamily.black,
    fontSize: 13,
  },
  emptyText: {
    color: colors.muted,
    fontFamily: fontFamily.medium,
    fontSize: 10,
  },
  pagination: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'center',
    paddingHorizontal: 14,
  },
  pageButton: {
    alignItems: 'center',
    backgroundColor: colors.rose50,
    borderRadius: 16,
    height: 32,
    justifyContent: 'center',
    width: 32,
  },
  pageButtonDisabled: {
    opacity: 0.42,
  },
  pageText: {
    color: colors.inkSoft,
    fontFamily: fontFamily.black,
    fontSize: 11,
  },
});
