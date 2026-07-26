import { memo, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import Animated, { FadeIn, FadeInUp } from 'react-native-reanimated';
import {
  BookOpen,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  ReceiptText,
  WalletCards,
} from 'lucide-react-native';
import type { PortalModuleData, TableData } from '../types';
import { colors } from '../theme/colors';
import { radii } from '../theme/spacing';
import { fontFamily } from '../theme/typography';
import { AnimatedPressable } from './AnimatedPressable';

type LedgerFilter = 'all' | 'charges' | 'payments';

const PAGE_SIZE = 5;

export const AcademicRecordsOverview = memo(function AcademicRecordsOverview({ data }: { data: PortalModuleData }) {
  const table = data.tables[0];
  if (!table) return null;

  switch (data.key) {
    case 'subjects':
      return <SubjectsOverview table={table} summary={data.summary} />;
    case 'schedule':
      return <ScheduleOverview table={table} summary={data.summary} subtitle={data.subtitle} />;
    case 'ledger':
      return <LedgerOverview table={table} />;
    case 'dues':
      return <DuesOverview table={table} summary={data.summary} />;
    default:
      return null;
  }
});

function SubjectsOverview({ table, summary }: { table: TableData; summary: Record<string, string> }) {
  const { width } = useWindowDimensions();
  const columns = useMemo(() => columnsFor(table), [table]);
  const totalUnits = summaryValue(summary, /total units load taken/i) || sumColumn(table, columns.totalUnits);
  const maxUnits = summaryValue(summary, /maximum units for this semester/i);
  const term = summaryValue(summary, /enrolled sy.?term/i);

  return (
    <View style={styles.shell}>
      <OverviewCard
        icon={BookOpen}
        title="Enrollment overview"
        hint="Your current subjects at a glance."
        stats={[
          [`${table.rows.length}`, 'Subjects', 'green'],
          [displayNumber(totalUnits), 'Units', 'rose'],
          [displayNumber(maxUnits), 'Maximum', 'purple'],
        ]}
        meta={friendlyTerm(term)}
      />

      <RecordCard title="Current subjects" hint="Course, units and assigned faculty.">
        <View style={[styles.recordList, width >= 720 ? styles.recordListWide : null]}>
          {table.rows.map((row, index) => (
            <Animated.View
              key={`${cell(row, columns.code)}-${index}`}
              entering={FadeInUp.delay(index * 45).duration(280)}
              style={[styles.subjectCard, width >= 720 ? styles.recordWide : null]}
            >
              <View style={styles.recordIcon}>
                <BookOpen size={18} color={colors.rose500} strokeWidth={2.7} />
              </View>
              <View style={styles.recordCopy}>
                <Text style={styles.codeBadge}>{cell(row, columns.code) || 'Subject'}</Text>
                <Text style={styles.recordTitle}>{cell(row, columns.title) || 'Subject title unavailable'}</Text>
                <Text style={styles.recordMeta} numberOfLines={2}>{cell(row, columns.faculty) || 'Faculty not yet assigned'}</Text>
                <View style={styles.detailPills}>
                  <DetailPill label={`${cleanUnits(cell(row, columns.totalUnits)) || '—'} total units`} />
                  <DetailPill label={`${cleanUnits(cell(row, columns.lecLab)) || '—'} lec/lab`} tone="purple" />
                </View>
              </View>
            </Animated.View>
          ))}
        </View>
      </RecordCard>
    </View>
  );
}

function ScheduleOverview({
  table,
  summary,
  subtitle,
}: {
  table: TableData;
  summary: Record<string, string>;
  subtitle?: string;
}) {
  const { width } = useWindowDimensions();
  const columns = useMemo(() => columnsFor(table), [table]);
  const totalUnits = summaryValue(summary, /total load units/i) || sumColumn(table, columns.totalUnits);

  return (
    <View style={styles.shell}>
      <OverviewCard
        icon={CalendarDays}
        title="Schedule overview"
        hint="Class time, room and instructor in one place."
        stats={[
          [`${table.rows.length}`, 'Classes', 'green'],
          [displayNumber(totalUnits), 'Units', 'rose'],
          [`${new Set(table.rows.map((row) => cell(row, columns.schedule)).filter(Boolean)).size}`, 'Time blocks', 'purple'],
        ]}
        meta={friendlyScheduleSubtitle(subtitle)}
      />

      <RecordCard title="Class schedule" hint="Only the current enrolled load is shown.">
        <View style={[styles.recordList, width >= 720 ? styles.recordListWide : null]}>
          {table.rows.map((row, index) => (
            <Animated.View
              key={`${cell(row, columns.code)}-${index}`}
              entering={FadeInUp.delay(index * 45).duration(280)}
              style={[styles.scheduleCard, width >= 720 ? styles.recordWide : null]}
            >
              <View style={styles.scheduleTop}>
                <View style={styles.recordIcon}>
                  <CalendarDays size={18} color={colors.rose500} strokeWidth={2.7} />
                </View>
                <View style={styles.recordCopy}>
                  <Text style={styles.codeBadge}>{cell(row, columns.code) || 'Class'}</Text>
                  <Text style={styles.recordTitle}>{cell(row, columns.title) || 'Subject name unavailable'}</Text>
                </View>
              </View>
              <View style={styles.scheduleBlock}>
                <Text style={styles.scheduleTime}>{cell(row, columns.schedule) || 'Schedule to be announced'}</Text>
                <Text style={styles.scheduleRoom}>{cell(row, columns.sectionRoom) || 'Section / room TBA'}</Text>
              </View>
              <View style={styles.scheduleFooter}>
                <Text style={styles.recordMeta} numberOfLines={2}>{cell(row, columns.faculty) || 'Faculty not yet assigned'}</Text>
                <Text style={styles.unitsText}>{cleanUnits(cell(row, columns.totalUnits)) || '—'} units</Text>
              </View>
            </Animated.View>
          ))}
        </View>
      </RecordCard>
    </View>
  );
}

function LedgerOverview({ table }: { table: TableData }) {
  const { width } = useWindowDimensions();
  const columns = useMemo(() => columnsFor(table), [table]);
  const [filter, setFilter] = useState<LedgerFilter>('all');
  const [page, setPage] = useState(0);
  const entries = useMemo(
    () =>
      table.rows.map((row) => ({
        row,
        debit: parseNumber(cell(row, columns.debit)),
        credit: parseNumber(cell(row, columns.credit)),
      })),
    [columns.credit, columns.debit, table.rows],
  );
  const totalDebit = entries.reduce((total, entry) => total + entry.debit, 0);
  const totalCredit = entries.reduce((total, entry) => total + entry.credit, 0);
  const lastBalance = [...table.rows].reverse().map((row) => cell(row, columns.balance)).find(Boolean) ?? '0';
  const filtered = entries.filter((entry) => filter === 'all' || (filter === 'charges' ? entry.debit > 0 : entry.credit > 0));
  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount - 1);
  const visible = filtered.slice(safePage * PAGE_SIZE, safePage * PAGE_SIZE + PAGE_SIZE);

  function selectFilter(value: LedgerFilter) {
    setFilter(value);
    setPage(0);
  }

  return (
    <View style={styles.shell}>
      <OverviewCard
        icon={WalletCards}
        title="Account overview"
        hint="A simpler view of charges, payments and balance."
        stats={[
          [money(lastBalance), 'Balance', 'rose'],
          [money(totalDebit), 'Charges', 'purple'],
          [money(totalCredit), 'Payments', 'green'],
        ]}
        meta={`${table.rows.length} account entries`}
      />

      <RecordCard title="Account activity" hint="Newest portal entries with running balance.">
        <View style={styles.filterRow}>
          {([
            ['all', 'All'],
            ['charges', 'Charges'],
            ['payments', 'Payments'],
          ] as const).map(([value, label]) => (
            <FilterChip key={value} label={label} active={filter === value} onPress={() => selectFilter(value)} />
          ))}
        </View>

        <Animated.View key={`${filter}-${safePage}`} entering={FadeIn.duration(220)} style={[styles.recordList, width >= 720 ? styles.recordListWide : null]}>
          {visible.length > 0 ? (
            visible.map((entry, index) => {
              const row = entry.row;
              const payment = entry.credit > 0;
              const charge = entry.debit > 0;
              return (
                <Animated.View
                  key={`${cell(row, columns.date)}-${cell(row, columns.particulars)}-${index}`}
                  entering={FadeInUp.delay(index * 40).duration(260)}
                  style={[styles.ledgerCard, width >= 720 ? styles.recordWide : null]}
                >
                  <View style={[styles.recordIcon, payment ? styles.recordIconSuccess : null]}>
                    <ReceiptText size={18} color={payment ? colors.success : colors.rose500} strokeWidth={2.7} />
                  </View>
                  <View style={styles.recordCopy}>
                    <View style={styles.ledgerTitleRow}>
                      <Text style={styles.recordTitle} numberOfLines={2}>{cell(row, columns.particulars) || 'Account entry'}</Text>
                      <Text style={[styles.ledgerType, payment ? styles.ledgerTypePayment : charge ? null : styles.ledgerTypeNeutral]}>
                        {payment ? 'Payment' : charge ? 'Charge' : 'Balance'}
                      </Text>
                    </View>
                    <Text style={styles.recordMeta}>{cell(row, columns.date) || 'Opening balance'}</Text>
                    <View style={styles.amountRow}>
                      <Text style={[styles.entryAmount, payment ? styles.paymentAmount : null]}>
                        {payment ? `− ${money(entry.credit)}` : charge ? `+ ${money(entry.debit)}` : 'Balance update'}
                      </Text>
                      <Text style={styles.balanceText}>Balance {money(cell(row, columns.balance))}</Text>
                    </View>
                  </View>
                </Animated.View>
              );
            })
          ) : (
            <View style={styles.empty}>
              <ReceiptText size={26} color={colors.muted} strokeWidth={2.4} />
              <Text style={styles.emptyTitle}>No entries in this view</Text>
            </View>
          )}
        </Animated.View>

        {pageCount > 1 ? (
          <Pagination page={safePage} pageCount={pageCount} onChange={setPage} />
        ) : null}
      </RecordCard>
    </View>
  );
}

function DuesOverview({ table, summary }: { table: TableData; summary: Record<string, string> }) {
  const { width } = useWindowDimensions();
  const columns = useMemo(() => columnsFor(table), [table]);
  const status = summaryValue(summary, /^status$/i) || 'Enrolled';
  const term = summaryValue(summary, /last enrolled sy.?term|^term$/i);
  const totalRequired = sumColumn(table, columns.requiredAmount);
  const finalBalance = [...table.rows].reverse().map((row) => cell(row, columns.cumulativeBalance)).find(Boolean) ?? '0';

  return (
    <View style={styles.shell}>
      <OverviewCard
        icon={CreditCard}
        title="Payment overview"
        hint="Required amounts by payment period."
        stats={[
          [status, 'Status', 'green'],
          [money(totalRequired), 'Scheduled', 'rose'],
          [money(finalBalance), 'Cumulative', 'purple'],
        ]}
        meta={friendlyTerm(term)}
      />

      <RecordCard title="Payment periods" hint="Amounts are shown exactly as posted by the portal.">
        <View style={[styles.recordList, width >= 720 ? styles.recordListWide : null]}>
          {table.rows.map((row, index) => (
            <Animated.View
              key={`${cell(row, columns.paymentSchedule)}-${index}`}
              entering={FadeInUp.delay(index * 45).duration(280)}
              style={[styles.dueCard, width >= 720 ? styles.recordWide : null]}
            >
              <View style={styles.dueTop}>
                <View style={styles.recordIcon}>
                  <CreditCard size={18} color={colors.rose500} strokeWidth={2.7} />
                </View>
                <View style={styles.recordCopy}>
                  <Text style={styles.codeBadge}>Payment period</Text>
                  <Text style={styles.recordTitle}>{cell(row, columns.paymentSchedule) || `Period ${index + 1}`}</Text>
                </View>
              </View>
              <View style={styles.dueAmounts}>
                <AmountBlock label="Required" value={money(cell(row, columns.requiredAmount))} />
                <AmountBlock label="Cumulative" value={money(cell(row, columns.cumulativeBalance))} accent />
              </View>
            </Animated.View>
          ))}
        </View>
      </RecordCard>
    </View>
  );
}

function OverviewCard({
  icon: Icon,
  title,
  hint,
  stats,
  meta,
}: {
  icon: typeof BookOpen;
  title: string;
  hint: string;
  stats: Array<[string, string, 'green' | 'rose' | 'purple']>;
  meta?: string;
}) {
  return (
    <View style={styles.overviewCard}>
      <View style={styles.overviewHeader}>
        <View style={styles.overviewIcon}>
          <Icon size={21} color={colors.rose500} strokeWidth={2.7} />
        </View>
        <View style={styles.overviewCopy}>
          <Text style={styles.overviewTitle}>{title}</Text>
          <Text style={styles.overviewHint}>{hint}</Text>
        </View>
      </View>
      {meta ? <Text style={styles.overviewMeta}>{meta}</Text> : null}
      <View style={styles.stats}>
        {stats.map(([value, label, tone]) => <Stat key={label} value={value || '—'} label={label} tone={tone} />)}
      </View>
    </View>
  );
}

function RecordCard({ title, hint, children }: { title: string; hint: string; children: React.ReactNode }) {
  return (
    <View style={styles.browserCard}>
      <View style={styles.browserHeading}>
        <Text style={styles.browserTitle}>{title}</Text>
        <Text style={styles.browserHint}>{hint}</Text>
      </View>
      {children}
    </View>
  );
}

function Stat({ value, label, tone }: { value: string; label: string; tone: 'green' | 'rose' | 'purple' }) {
  return (
    <View style={[styles.stat, tone === 'green' ? styles.statGreen : tone === 'purple' ? styles.statPurple : null]}>
      <Text style={styles.statValue} numberOfLines={1} adjustsFontSizeToFit>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function FilterChip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <AnimatedPressable onPress={onPress} style={[styles.filterChip, active ? styles.filterChipActive : null]}>
      <Text style={[styles.filterText, active ? styles.filterTextActive : null]}>{label}</Text>
    </AnimatedPressable>
  );
}

function DetailPill({ label, tone }: { label: string; tone?: 'purple' }) {
  return <Text style={[styles.detailPill, tone === 'purple' ? styles.detailPillPurple : null]}>{label}</Text>;
}

function AmountBlock({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <View style={[styles.amountBlock, accent ? styles.amountBlockAccent : null]}>
      <Text style={styles.amountLabel}>{label}</Text>
      <Text style={styles.amountValue}>{value}</Text>
    </View>
  );
}

function Pagination({ page, pageCount, onChange }: { page: number; pageCount: number; onChange: (page: number) => void }) {
  return (
    <View style={styles.pagination}>
      <PageButton disabled={page === 0} direction="left" onPress={() => onChange(Math.max(0, page - 1))} />
      <Text style={styles.pageText}>{page + 1} of {pageCount}</Text>
      <PageButton disabled={page === pageCount - 1} direction="right" onPress={() => onChange(Math.min(pageCount - 1, page + 1))} />
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

function columnsFor(table: TableData) {
  const find = (pattern: RegExp) => table.headers.findIndex((header) => pattern.test(header));
  return {
    code: find(/subject code/i),
    title: find(/subject (?:title|name|desc)/i),
    lecLab: find(/lec\/lab/i),
    totalUnits: find(/total units?/i),
    faculty: find(/faculty/i),
    schedule: find(/^schedule$/i),
    sectionRoom: find(/section.*room/i),
    date: find(/^date$/i),
    particulars: find(/particulars/i),
    debit: find(/^debit$/i),
    credit: find(/^credit$/i),
    balance: find(/^balance$/i),
    paymentSchedule: find(/payment schedule/i),
    requiredAmount: find(/required amount/i),
    cumulativeBalance: find(/cumulative balance/i),
  };
}

function cell(row: string[], index: number) {
  return index >= 0 ? (row[index] ?? '').trim() : '';
}

function summaryValue(summary: Record<string, string>, pattern: RegExp) {
  return Object.entries(summary).find(([key, value]) => pattern.test(key) && value?.trim())?.[1]?.trim() ?? '';
}

function parseNumber(value: string) {
  return Number.parseFloat(String(value).replace(/[^0-9.-]/g, '')) || 0;
}

function sumColumn(table: TableData, index: number) {
  return table.rows.reduce((total, row) => total + parseNumber(cell(row, index)), 0);
}

function cleanUnits(value: string) {
  return value.replace(/\s*\(Unit\)\s*/gi, '').trim();
}

function displayNumber(value: string | number) {
  if (value === '' || value === undefined) return '—';
  return typeof value === 'number' ? value.toFixed(value % 1 === 0 ? 1 : 2) : cleanUnits(value);
}

function money(value: string | number) {
  const amount = typeof value === 'number' ? value : parseNumber(value);
  return `₱${amount.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function friendlyTerm(value: string) {
  return value ? value.replace(/\s*-\s*/g, ' • ') : '';
}

function friendlyScheduleSubtitle(value?: string) {
  return value?.replace(/^LOAD\s*&\s*SCHEDULE\s*FOR\s*/i, '') ?? '';
}

const styles = StyleSheet.create({
  shell: {
    gap: 12,
  },
  overviewCard: {
    backgroundColor: colors.surface,
    borderColor: 'rgba(255,255,255,0.92)',
    borderRadius: radii.lg,
    borderWidth: 1,
    gap: 12,
    padding: 14,
  },
  overviewHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
  },
  overviewIcon: {
    alignItems: 'center',
    backgroundColor: colors.rose100,
    borderRadius: 19,
    height: 38,
    justifyContent: 'center',
    width: 38,
  },
  overviewCopy: {
    flex: 1,
  },
  overviewTitle: {
    color: colors.ink,
    fontFamily: fontFamily.black,
    fontSize: 17,
  },
  overviewHint: {
    color: colors.muted,
    fontFamily: fontFamily.medium,
    fontSize: 10,
    lineHeight: 14,
  },
  overviewMeta: {
    alignSelf: 'flex-start',
    backgroundColor: colors.rose50,
    borderRadius: 999,
    color: colors.inkSoft,
    fontFamily: fontFamily.bold,
    fontSize: 10,
    overflow: 'hidden',
    paddingHorizontal: 9,
    paddingVertical: 5,
  },
  stats: {
    flexDirection: 'row',
    gap: 8,
  },
  stat: {
    backgroundColor: colors.rose100,
    borderRadius: radii.md,
    flex: 1,
    minWidth: 0,
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
    fontSize: 14,
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
    padding: 14,
  },
  browserHeading: {
    gap: 2,
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
    lineHeight: 14,
  },
  recordList: {
    gap: 9,
  },
  recordListWide: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  recordWide: {
    flexBasis: '48%',
    flexGrow: 1,
  },
  subjectCard: {
    alignItems: 'flex-start',
    backgroundColor: colors.white,
    borderColor: colors.line,
    borderRadius: radii.md,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 10,
    padding: 12,
  },
  recordIcon: {
    alignItems: 'center',
    backgroundColor: colors.rose100,
    borderRadius: 17,
    height: 34,
    justifyContent: 'center',
    width: 34,
  },
  recordIconSuccess: {
    backgroundColor: colors.mint,
  },
  recordCopy: {
    flex: 1,
    minWidth: 0,
  },
  codeBadge: {
    color: colors.rose500,
    fontFamily: fontFamily.black,
    fontSize: 9,
    letterSpacing: 0.35,
    textTransform: 'uppercase',
  },
  recordTitle: {
    color: colors.ink,
    flex: 1,
    fontFamily: fontFamily.black,
    fontSize: 13,
    lineHeight: 18,
    marginTop: 2,
  },
  recordMeta: {
    color: colors.muted,
    fontFamily: fontFamily.medium,
    fontSize: 10,
    lineHeight: 14,
    marginTop: 3,
  },
  detailPills: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 8,
  },
  detailPill: {
    backgroundColor: colors.rose100,
    borderRadius: 999,
    color: colors.inkSoft,
    fontFamily: fontFamily.bold,
    fontSize: 9,
    overflow: 'hidden',
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  detailPillPurple: {
    backgroundColor: colors.lavenderSoft,
  },
  scheduleCard: {
    backgroundColor: colors.white,
    borderColor: colors.line,
    borderRadius: radii.md,
    borderWidth: 1,
    gap: 10,
    padding: 12,
  },
  scheduleTop: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: 10,
  },
  scheduleBlock: {
    backgroundColor: colors.rose50,
    borderRadius: radii.md,
    gap: 3,
    padding: 10,
  },
  scheduleTime: {
    color: colors.ink,
    fontFamily: fontFamily.black,
    fontSize: 12,
  },
  scheduleRoom: {
    color: colors.inkSoft,
    fontFamily: fontFamily.bold,
    fontSize: 10,
  },
  scheduleFooter: {
    alignItems: 'flex-end',
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'space-between',
  },
  unitsText: {
    color: colors.rose500,
    fontFamily: fontFamily.black,
    fontSize: 10,
  },
  filterRow: {
    flexDirection: 'row',
    gap: 7,
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
  ledgerCard: {
    alignItems: 'flex-start',
    backgroundColor: colors.white,
    borderColor: colors.line,
    borderRadius: radii.md,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 10,
    padding: 11,
  },
  ledgerTitleRow: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: 7,
  },
  ledgerType: {
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
  ledgerTypePayment: {
    backgroundColor: colors.mint,
    color: colors.success,
  },
  ledgerTypeNeutral: {
    backgroundColor: colors.lavenderSoft,
    color: colors.inkSoft,
  },
  amountRow: {
    alignItems: 'flex-end',
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'space-between',
    marginTop: 8,
  },
  entryAmount: {
    color: colors.rose500,
    fontFamily: fontFamily.black,
    fontSize: 12,
  },
  paymentAmount: {
    color: colors.success,
  },
  balanceText: {
    color: colors.inkSoft,
    fontFamily: fontFamily.bold,
    fontSize: 9,
  },
  dueCard: {
    backgroundColor: colors.white,
    borderColor: colors.line,
    borderRadius: radii.md,
    borderWidth: 1,
    gap: 10,
    padding: 12,
  },
  dueTop: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
  },
  dueAmounts: {
    flexDirection: 'row',
    gap: 8,
  },
  amountBlock: {
    backgroundColor: colors.rose50,
    borderRadius: radii.md,
    flex: 1,
    padding: 10,
  },
  amountBlockAccent: {
    backgroundColor: colors.lavenderSoft,
  },
  amountLabel: {
    color: colors.muted,
    fontFamily: fontFamily.black,
    fontSize: 8,
    textTransform: 'uppercase',
  },
  amountValue: {
    color: colors.ink,
    fontFamily: fontFamily.black,
    fontSize: 13,
    marginTop: 3,
  },
  empty: {
    alignItems: 'center',
    gap: 5,
    paddingVertical: 24,
  },
  emptyTitle: {
    color: colors.muted,
    fontFamily: fontFamily.bold,
    fontSize: 12,
  },
  pagination: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'center',
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
