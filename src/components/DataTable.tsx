import { memo, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, useWindowDimensions, View } from 'react-native';
import { ChevronLeft, ChevronRight, Search } from 'lucide-react-native';
import type { TableData } from '../types';
import { colors } from '../theme/colors';
import { fontFamily } from '../theme/typography';
import { radii } from '../theme/spacing';
import { AnimatedPressable } from './AnimatedPressable';

const MIN_COLUMN_WIDTH = 132;
const DESKTOP_PAGE_SIZE = 12;
const MOBILE_PAGE_SIZE = 8;

export const DataTable = memo(function DataTable({ table, fallbackTitle }: { table: TableData; fallbackTitle?: string }) {
  const { width } = useWindowDimensions();
  const compact = width < 560;
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(0);
  const [group, setGroup] = useState('All');
  const displayTitle = useMemo(() => readableTableTitle(table, fallbackTitle), [fallbackTitle, table]);

  const groups = useMemo(() => {
    if (!/^term$/i.test(table.headers[0] ?? '')) return [];
    return [...new Set(table.rows.map((row) => row[0]).filter(Boolean))];
  }, [table.headers, table.rows]);

  const filteredRows = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return table.rows.filter((row) => {
      if (group !== 'All' && row[0] !== group) return false;
      return !needle || row.join(' ').toLowerCase().includes(needle);
    });
  }, [group, query, table.rows]);

  const pageSize = compact ? MOBILE_PAGE_SIZE : DESKTOP_PAGE_SIZE;
  const pageCount = Math.max(1, Math.ceil(filteredRows.length / pageSize));
  const safePage = Math.min(page, pageCount - 1);
  const pageRows = useMemo(() => filteredRows.slice(safePage * pageSize, safePage * pageSize + pageSize), [filteredRows, pageSize, safePage]);
  const columnWidth = useMemo(() => Math.max(MIN_COLUMN_WIDTH, Math.floor(Math.max(width - 56, 320) / Math.max(table.headers.length, 1))), [table.headers.length, width]);

  function updateQuery(text: string) {
    setQuery(text);
    setPage(0);
  }

  function updateGroup(value: string) {
    setGroup(value);
    setPage(0);
  }

  return (
    <View style={styles.card}>
      <View style={styles.tableTopBar}>
        <View style={styles.titleBlock}>
          <Text style={styles.title}>{displayTitle}</Text>
          <Text style={styles.subtitle}>{filteredRows.length} record{filteredRows.length === 1 ? '' : 's'}</Text>
        </View>
        <View style={styles.searchBox}>
          <Search size={15} color={colors.muted} strokeWidth={2.5} />
          <TextInput value={query} onChangeText={updateQuery} placeholder="Search" placeholderTextColor={colors.muted} style={styles.searchInput} />
        </View>
      </View>

      {groups.length > 0 ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.groupStrip}>
          {['All', ...groups].map((value) => {
            const selected = value === group;
            return (
              <AnimatedPressable key={value} onPress={() => updateGroup(value)} style={[styles.groupChip, selected ? styles.groupChipActive : null]}>
                <Text style={[styles.groupChipText, selected ? styles.groupChipTextActive : null]}>{value}</Text>
              </AnimatedPressable>
            );
          })}
        </ScrollView>
      ) : null}

      {pageRows.length === 0 ? (
        <View style={styles.emptyResults}>
          <Text style={styles.emptyResultsText}>No matching records.</Text>
        </View>
      ) : compact ? (
        <View style={styles.cardRows}>
          {pageRows.map((row, rowIndex) => (
            <View key={`${safePage}-${rowIndex}-${row.join('|')}`} style={styles.recordCard}>
              {table.headers.map((header, index) => (
                <View key={`${header}-${index}`} style={styles.recordLine}>
                  <Text style={styles.recordLabel}>{header || `Column ${index + 1}`}</Text>
                  <Text style={styles.recordValue}>{row[index] || '—'}</Text>
                </View>
              ))}
            </View>
          ))}
        </View>
      ) : (
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View>
            <View style={styles.headerRow}>
              {table.headers.map((header, index) => (
                <Text key={`${header}-${index}`} style={[styles.headerCell, { width: columnWidth }]} numberOfLines={3}>
                  {header || `Column ${index + 1}`}
                </Text>
              ))}
            </View>
            {pageRows.map((row, rowIndex) => (
              <DataRow key={`${safePage}-${rowIndex}-${row.join('|')}`} headers={table.headers} row={row} rowIndex={rowIndex} columnWidth={columnWidth} />
            ))}
          </View>
        </ScrollView>
      )}

      <View style={styles.pagination}>
        <AnimatedPressable disabled={safePage === 0} onPress={() => setPage((value) => Math.max(0, value - 1))} style={[styles.pageButton, safePage === 0 ? styles.disabledPageButton : null]}>
          <ChevronLeft size={17} color={safePage === 0 ? colors.muted : colors.rose500} strokeWidth={3} />
        </AnimatedPressable>
        <Text style={styles.pageText}>Page {safePage + 1} of {pageCount}</Text>
        <AnimatedPressable disabled={safePage >= pageCount - 1} onPress={() => setPage((value) => Math.min(pageCount - 1, value + 1))} style={[styles.pageButton, safePage >= pageCount - 1 ? styles.disabledPageButton : null]}>
          <ChevronRight size={17} color={safePage >= pageCount - 1 ? colors.muted : colors.rose500} strokeWidth={3} />
        </AnimatedPressable>
      </View>
    </View>
  );
});

function readableTableTitle(table: TableData, fallbackTitle?: string) {
  if (table.title && !/^table\s+\d+$/i.test(table.title.trim())) return table.title;
  const headers = table.headers.join(' ').toLowerCase();
  if (/subject/.test(headers) && /schedule|room/.test(headers)) return 'Class schedule';
  if (/subject/.test(headers)) return 'Course records';
  if (/payment|required amount|cumulative/.test(headers)) return 'Payment schedule';
  if (/date/.test(headers) && /debit|credit|balance/.test(headers)) return 'Account activity';
  if (/name/.test(headers) && /address|telephone/.test(headers)) return 'Contact records';
  return fallbackTitle ? `${fallbackTitle} details` : 'Record details';
}

const DataRow = memo(function DataRow({
  headers,
  row,
  rowIndex,
  columnWidth,
}: {
  headers: string[];
  row: string[];
  rowIndex: number;
  columnWidth: number;
}) {
  return (
    <View style={[styles.row, rowIndex % 2 === 1 ? styles.altRow : null]}>
      {headers.map((header, index) => (
        <Text key={`${header}-${index}`} style={[styles.cell, { width: columnWidth }]}>
          {row[index] || '—'}
        </Text>
      ))}
    </View>
  );
});

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderColor: 'rgba(255,255,255,0.92)',
    borderRadius: radii.lg,
    borderWidth: 1,
    overflow: 'hidden',
  },
  tableTopBar: {
    gap: 12,
    padding: 14,
  },
  titleBlock: {
    gap: 2,
  },
  title: {
    color: colors.ink,
    fontFamily: fontFamily.black,
    fontSize: 16,
  },
  subtitle: {
    color: colors.muted,
    fontFamily: fontFamily.bold,
    fontSize: 12,
  },
  searchBox: {
    alignItems: 'center',
    backgroundColor: colors.rose50,
    borderColor: colors.line,
    borderRadius: radii.md,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 12,
  },
  searchInput: {
    color: colors.ink,
    flex: 1,
    fontFamily: fontFamily.medium,
    fontSize: 14,
    minHeight: 42,
    paddingVertical: 8,
  },
  groupStrip: {
    gap: 8,
    paddingBottom: 12,
    paddingHorizontal: 14,
  },
  groupChip: {
    backgroundColor: colors.rose50,
    borderColor: colors.line,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  groupChipActive: {
    backgroundColor: colors.rose500,
    borderColor: colors.rose500,
  },
  groupChipText: {
    color: colors.inkSoft,
    fontFamily: fontFamily.bold,
    fontSize: 11,
  },
  groupChipTextActive: {
    color: colors.white,
  },
  headerRow: {
    backgroundColor: colors.rose500,
    flexDirection: 'row',
  },
  headerCell: {
    color: colors.white,
    fontFamily: fontFamily.black,
    fontSize: 12,
    padding: 10,
  },
  row: {
    borderBottomColor: colors.line,
    borderBottomWidth: 1,
    flexDirection: 'row',
  },
  altRow: {
    backgroundColor: 'rgba(255,247,250,0.75)',
  },
  cell: {
    color: colors.inkSoft,
    fontFamily: fontFamily.medium,
    fontSize: 12,
    lineHeight: 17,
    padding: 10,
  },
  cardRows: {
    gap: 10,
    paddingHorizontal: 14,
  },
  recordCard: {
    backgroundColor: colors.white,
    borderColor: colors.line,
    borderRadius: radii.md,
    borderWidth: 1,
    gap: 9,
    padding: 12,
  },
  recordLine: {
    gap: 3,
  },
  recordLabel: {
    color: colors.muted,
    fontFamily: fontFamily.black,
    fontSize: 10,
    textTransform: 'uppercase',
  },
  recordValue: {
    color: colors.ink,
    fontFamily: fontFamily.bold,
    fontSize: 13,
    lineHeight: 18,
  },
  pagination: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'center',
    padding: 14,
  },
  emptyResults: {
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 28,
  },
  emptyResultsText: {
    color: colors.muted,
    fontFamily: fontFamily.bold,
    fontSize: 13,
  },
  pageButton: {
    alignItems: 'center',
    backgroundColor: colors.rose50,
    borderRadius: 16,
    height: 32,
    justifyContent: 'center',
    width: 32,
  },
  disabledPageButton: {
    opacity: 0.45,
  },
  pageText: {
    color: colors.inkSoft,
    fontFamily: fontFamily.black,
    fontSize: 12,
  },
});
