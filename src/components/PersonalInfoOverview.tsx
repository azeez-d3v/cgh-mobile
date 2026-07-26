import { memo, useMemo } from 'react';
import { StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { GraduationCap, ShieldCheck, UserRound } from 'lucide-react-native';
import type { LucideProps } from 'lucide-react-native';
import type { ComponentType } from 'react';
import type { PortalInfoSection } from '../types';
import { colors } from '../theme/colors';
import { radii } from '../theme/spacing';
import { fontFamily } from '../theme/typography';

type EssentialGroup = {
  id: string;
  title: string;
  hint: string;
  icon: ComponentType<LucideProps>;
  fields: Array<[string, string]>;
};

export const PersonalInfoOverview = memo(function PersonalInfoOverview({ sections }: { sections: PortalInfoSection[] }) {
  const { width } = useWindowDimensions();
  const groups = useMemo(() => buildEssentialGroups(sections), [sections]);

  return (
    <View style={styles.shell}>
      <View style={styles.heading}>
        <View>
          <Text style={styles.title}>Essential information</Text>
          <Text style={styles.subtitle}>Only the details commonly needed for school transactions.</Text>
        </View>
        <View style={styles.countBadge}>
          <Text style={styles.countText}>{groups.reduce((total, group) => total + group.fields.length, 0)}</Text>
        </View>
      </View>

      <View style={[styles.groupGrid, width >= 760 ? styles.groupGridWide : null]}>
        {groups.map((group, groupIndex) => {
          const Icon = group.icon;
          return (
            <Animated.View
              key={group.id}
              entering={FadeInUp.delay(groupIndex * 65).duration(320)}
              style={[styles.groupCard, width >= 760 ? styles.groupCardWide : null]}
            >
              <View style={styles.groupHeader}>
                <View style={styles.iconBubble}>
                  <Icon size={18} color={colors.rose500} strokeWidth={2.7} />
                </View>
                <View style={styles.groupCopy}>
                  <Text style={styles.groupTitle}>{group.title}</Text>
                  <Text style={styles.groupHint}>{group.hint}</Text>
                </View>
              </View>

              <View style={styles.fieldList}>
                {group.fields.map(([label, value], index) => (
                  <View key={`${group.id}-${label}`} style={[styles.fieldRow, index > 0 ? styles.fieldDivider : null]}>
                    <Text style={styles.fieldLabel}>{label}</Text>
                    <Text selectable style={styles.fieldValue}>
                      {value}
                    </Text>
                  </View>
                ))}
              </View>
            </Animated.View>
          );
        })}
      </View>

      <View style={styles.privacyNote}>
        <ShieldCheck size={16} color={colors.rose500} strokeWidth={2.6} />
        <Text style={styles.privacyText}>Extended family, physical, education and reference records are hidden from this mobile summary.</Text>
      </View>
    </View>
  );
});

function buildEssentialGroups(sections: PortalInfoSection[]): EssentialGroup[] {
  const byId = new Map(sections.map((section) => [section.id, section.fields]));
  const academic = byId.get('academic') ?? {};
  const personal = byId.get('personal') ?? {};
  const current = byId.get('current-contact') ?? byId.get('contact') ?? {};
  const emergency = byId.get('emergency') ?? {};

  const fullName = [pick(personal, 'First Name'), pick(personal, 'Last Name')].filter(Boolean).join(' ');
  const guardian = joinWithRelation(pick(current, 'Contact Person/Guardian Name', 'Contact Person'), pick(current, 'Relation'));
  const emergencyPerson = joinWithRelation(pick(emergency, 'Contact Person Name', 'Emergency Contact'), pick(emergency, 'Relation'));

  const groups: EssentialGroup[] = [
    {
      id: 'academic',
      title: 'Academic',
      hint: 'Current enrollment identity',
      icon: GraduationCap,
      fields: compactFields([
        ['Course', pick(academic, 'COURSE', 'Course')],
        ['Curriculum', pick(academic, 'CURRICULUM YEAR', 'Curriculum Year')],
        ['School year', pick(academic, 'SCHOOL YEAR', 'School Year')],
        ['Year & term', pick(academic, 'YEAR LEVEL/TERM', 'Year Level / Term')],
      ]),
    },
    {
      id: 'identity',
      title: 'Student',
      hint: 'Basic identity information',
      icon: UserRound,
      fields: compactFields([
        ['Full name', fullName],
        ['Date of birth', pick(personal, 'Date of Birth')],
        ['Gender', pick(personal, 'Gender')],
        ['Nationality', pick(personal, 'Nationality')],
      ]),
    },
    {
      id: 'contact',
      title: 'Contact & safety',
      hint: 'How the school can reach you',
      icon: ShieldCheck,
      fields: compactFields([
        ['Mobile', pick(personal, 'Mobile Number')],
        ['Email', pick(current, 'Email Address')],
        ['Guardian', guardian],
        ['Emergency contact', emergencyPerson],
      ]),
    },
  ];

  return groups.filter((group) => group.fields.length > 0);
}

function pick(fields: Record<string, string>, ...labels: string[]) {
  for (const label of labels) {
    const exact = fields[label];
    if (exact?.trim()) return exact.trim();
    const normalized = normalize(label);
    const match = Object.entries(fields).find(([key, value]) => normalize(key) === normalized && value?.trim());
    if (match) return match[1].trim();
  }
  return '';
}

function normalize(value: string) {
  return value.replace(/[^a-z0-9]/gi, '').toLowerCase();
}

function joinWithRelation(name: string, relation: string) {
  if (!name) return '';
  return relation ? `${name} • ${relation}` : name;
}

function compactFields(fields: Array<[string, string]>) {
  return fields.filter((entry): entry is [string, string] => Boolean(entry[1]));
}

const styles = StyleSheet.create({
  shell: {
    gap: 12,
  },
  heading: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  title: {
    color: colors.ink,
    fontFamily: fontFamily.black,
    fontSize: 19,
  },
  subtitle: {
    color: colors.muted,
    fontFamily: fontFamily.medium,
    fontSize: 11,
    lineHeight: 15,
    marginTop: 2,
  },
  countBadge: {
    alignItems: 'center',
    backgroundColor: colors.rose100,
    borderRadius: 18,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  countText: {
    color: colors.rose500,
    fontFamily: fontFamily.black,
    fontSize: 12,
  },
  groupGrid: {
    gap: 10,
  },
  groupGridWide: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  groupCard: {
    backgroundColor: colors.surface,
    borderColor: 'rgba(255,255,255,0.92)',
    borderRadius: radii.lg,
    borderWidth: 1,
    overflow: 'hidden',
    padding: 14,
  },
  groupCardWide: {
    flexBasis: '31%',
    flexGrow: 1,
  },
  groupHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
    marginBottom: 8,
  },
  iconBubble: {
    alignItems: 'center',
    backgroundColor: colors.rose100,
    borderRadius: 18,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  groupCopy: {
    flex: 1,
  },
  groupTitle: {
    color: colors.ink,
    fontFamily: fontFamily.black,
    fontSize: 15,
  },
  groupHint: {
    color: colors.muted,
    fontFamily: fontFamily.medium,
    fontSize: 10,
    marginTop: 1,
  },
  fieldList: {
    backgroundColor: colors.white,
    borderColor: colors.line,
    borderRadius: radii.md,
    borderWidth: 1,
    overflow: 'hidden',
    paddingHorizontal: 12,
  },
  fieldRow: {
    gap: 3,
    paddingVertical: 10,
  },
  fieldDivider: {
    borderTopColor: colors.line,
    borderTopWidth: 1,
  },
  fieldLabel: {
    color: colors.muted,
    fontFamily: fontFamily.black,
    fontSize: 9,
    letterSpacing: 0.35,
    textTransform: 'uppercase',
  },
  fieldValue: {
    color: colors.ink,
    fontFamily: fontFamily.bold,
    fontSize: 13,
    lineHeight: 18,
  },
  privacyNote: {
    alignItems: 'flex-start',
    backgroundColor: colors.rose50,
    borderColor: colors.line,
    borderRadius: radii.md,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 8,
    padding: 11,
  },
  privacyText: {
    color: colors.inkSoft,
    flex: 1,
    fontFamily: fontFamily.medium,
    fontSize: 10,
    lineHeight: 15,
  },
});
