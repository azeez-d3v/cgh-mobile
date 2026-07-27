import { memo, useEffect, useMemo, useState } from 'react';
import { LinearGradient } from 'expo-linear-gradient';
import { Image } from 'expo-image';
import { StyleSheet, Text, View } from 'react-native';
import type { StudentSummary } from '../types';
import { colors, gradients } from '../theme/colors';
import { radii } from '../theme/spacing';
import { fontFamily } from '../theme/typography';

export const StudentHeader = memo(function StudentHeader({ student, cookieHeader }: { student?: StudentSummary; cookieHeader?: string }) {
  const [avatarFailed, setAvatarFailed] = useState(false);
  const displayName = student?.name?.trim() || 'Student';
  const initials = useMemo(() => studentInitials(displayName), [displayName]);
  const nameSize = displayName.length > 30 ? 16 : displayName.length > 22 ? 18 : 22;

  useEffect(() => {
    setAvatarFailed(false);
  }, [student?.avatarUrl]);

  return (
    <LinearGradient colors={gradients.darkRose} style={styles.header}>
      <View style={styles.topLine}>
        {student?.avatarUrl && !avatarFailed ? (
          <Image
            source={{
              uri: student.avatarUrl,
              headers: cookieHeader && !student.avatarUrl.startsWith('data:') ? { Cookie: cookieHeader } : undefined,
            }}
            style={styles.avatar}
            cachePolicy="memory-disk"
            contentFit="cover"
            onError={() => setAvatarFailed(true)}
            recyclingKey={student.avatarUrl}
            transition={0}
          />
        ) : (
          <View style={styles.avatarFallback}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
        )}
        <View style={styles.copy}>
          <Text style={styles.eyebrow}>CGH Student Portal</Text>
          <Text style={[styles.name, { fontSize: nameSize }]}>
            {displayName}
          </Text>
          <Text style={styles.meta} numberOfLines={2}>
            {[student?.id, student?.course, student?.yearLevel].filter(Boolean).join(' • ')}
          </Text>
          {student?.term ? <Text style={styles.term}>{student.term}</Text> : null}
        </View>
      </View>
    </LinearGradient>
  );
});

function studentInitials(name: string) {
  const parts = name.replace(',', ' ').split(/\s+/).filter(Boolean);
  return parts.slice(0, 2).map((part) => part[0]?.toUpperCase()).join('') || 'CG';
}

const styles = StyleSheet.create({
  header: {
    borderRadius: 30,
    overflow: 'hidden',
    padding: 18,
  },
  topLine: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 14,
  },
  avatar: {
    backgroundColor: colors.rose100,
    borderColor: colors.white,
    borderRadius: 26,
    borderWidth: 2,
    height: 52,
    width: 52,
  },
  avatarFallback: {
    alignItems: 'center',
    backgroundColor: colors.rose100,
    borderRadius: 26,
    height: 52,
    justifyContent: 'center',
    width: 52,
  },
  avatarText: {
    color: colors.rose500,
    fontFamily: fontFamily.black,
    fontSize: 22,
  },
  copy: {
    flex: 1,
    minWidth: 0,
  },
  eyebrow: {
    color: colors.rose100,
    fontFamily: fontFamily.black,
    fontSize: 11,
    letterSpacing: 0.7,
    textTransform: 'uppercase',
  },
  name: {
    color: colors.white,
    fontFamily: fontFamily.black,
    lineHeight: 24,
    marginTop: 3,
  },
  meta: {
    color: colors.rose100,
    fontFamily: fontFamily.regular,
    fontSize: 12,
    lineHeight: 17,
    marginTop: 3,
  },
  term: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.14)',
    color: colors.rose100,
    borderRadius: radii.pill,
    fontFamily: fontFamily.bold,
    fontSize: 10,
    marginTop: 7,
    overflow: 'hidden',
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
});
