import { memo } from 'react';
import { Modal, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { FileText, ShieldCheck, X } from 'lucide-react-native';
import type { LegalDocumentKey } from '../content/legal';
import { legalDocuments } from '../content/legal';
import { colors } from '../theme/colors';
import { radii } from '../theme/spacing';
import { fontFamily } from '../theme/typography';
import { AnimatedPressable } from './AnimatedPressable';

export const LegalDocumentModal = memo(function LegalDocumentModal({
  documentKey,
  onClose,
}: {
  documentKey?: LegalDocumentKey;
  onClose: () => void;
}) {
  const insets = useSafeAreaInsets();
  const document = documentKey ? legalDocuments[documentKey] : undefined;
  const Icon = documentKey === 'privacy' ? ShieldCheck : FileText;

  return (
    <Modal animationType="slide" navigationBarTranslucent onRequestClose={onClose} statusBarTranslucent visible={Boolean(document)}>
      <View style={styles.root}>
        <SafeAreaView edges={['top', 'left', 'right']} style={styles.safe}>
          {document ? (
            <>
              <View style={styles.topBar}>
                <View style={styles.titleRow}>
                  <View style={styles.iconBubble}>
                    <Icon size={20} color={colors.rose500} strokeWidth={2.6} />
                  </View>
                  <View style={styles.titleCopy}>
                    <Text style={styles.title}>{document.title}</Text>
                    <Text style={styles.date}>Effective {document.effectiveDate}</Text>
                  </View>
                </View>
                <AnimatedPressable onPress={onClose} style={styles.closeButton}>
                  <X size={20} color={colors.ink} strokeWidth={2.7} />
                </AnimatedPressable>
              </View>

              <ScrollView
                key={documentKey}
                style={styles.scroll}
                contentContainerStyle={[styles.content, { paddingBottom: Math.max(insets.bottom + 28, 40) }]}
                contentInsetAdjustmentBehavior="never"
                showsVerticalScrollIndicator={false}
              >
                <View style={styles.notice}>
                  <Text style={styles.noticeTitle}>Unofficial • Read-only</Text>
                  <Text style={styles.noticeText}>{document.introduction}</Text>
                </View>

                {document.sections.map((section) => (
                  <View key={section.title} style={styles.section}>
                    <Text style={styles.sectionTitle}>{section.title}</Text>
                    {section.paragraphs.map((paragraph, index) => (
                      <Text key={`${section.title}-paragraph-${index}`} style={styles.paragraph}>
                        {paragraph}
                      </Text>
                    ))}
                    {section.bullets?.map((bullet) => (
                      <View key={bullet} style={styles.bulletRow}>
                        <View style={styles.bullet} />
                        <Text style={styles.bulletText}>{bullet}</Text>
                      </View>
                    ))}
                  </View>
                ))}

                <AnimatedPressable onPress={onClose} style={styles.doneButton}>
                  <Text style={styles.doneText}>Done</Text>
                </AnimatedPressable>
              </ScrollView>
            </>
          ) : null}
        </SafeAreaView>
      </View>
    </Modal>
  );
});

const styles = StyleSheet.create({
  root: {
    backgroundColor: colors.white,
    flex: 1,
  },
  safe: {
    backgroundColor: colors.white,
    flex: 1,
  },
  topBar: {
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.94)',
    borderBottomColor: colors.line,
    borderBottomWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingVertical: 12,
  },
  titleRow: {
    alignItems: 'center',
    flex: 1,
    flexDirection: 'row',
    gap: 10,
  },
  iconBubble: {
    alignItems: 'center',
    backgroundColor: colors.rose100,
    borderRadius: 19,
    height: 38,
    justifyContent: 'center',
    width: 38,
  },
  titleCopy: {
    flex: 1,
  },
  title: {
    color: colors.ink,
    fontFamily: fontFamily.black,
    fontSize: 18,
  },
  date: {
    color: colors.muted,
    fontFamily: fontFamily.medium,
    fontSize: 10,
    marginTop: 1,
  },
  closeButton: {
    alignItems: 'center',
    backgroundColor: colors.rose50,
    borderRadius: 20,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  content: {
    alignSelf: 'center',
    gap: 12,
    maxWidth: 760,
    paddingHorizontal: 18,
    paddingTop: 18,
    width: '100%',
  },
  scroll: {
    backgroundColor: colors.background,
  },
  notice: {
    backgroundColor: colors.rose100,
    borderColor: colors.line,
    borderRadius: radii.lg,
    borderWidth: 1,
    gap: 5,
    padding: 16,
  },
  noticeTitle: {
    color: colors.rose500,
    fontFamily: fontFamily.black,
    fontSize: 12,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  noticeText: {
    color: colors.inkSoft,
    fontFamily: fontFamily.medium,
    fontSize: 12,
    lineHeight: 18,
  },
  section: {
    backgroundColor: colors.surface,
    borderColor: 'rgba(255,255,255,0.94)',
    borderRadius: radii.lg,
    borderWidth: 1,
    gap: 8,
    padding: 16,
  },
  sectionTitle: {
    color: colors.ink,
    fontFamily: fontFamily.black,
    fontSize: 15,
    lineHeight: 20,
  },
  paragraph: {
    color: colors.inkSoft,
    fontFamily: fontFamily.regular,
    fontSize: 12,
    lineHeight: 19,
  },
  bulletRow: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: 9,
  },
  bullet: {
    backgroundColor: colors.rose500,
    borderRadius: 3,
    height: 6,
    marginTop: 6,
    width: 6,
  },
  bulletText: {
    color: colors.inkSoft,
    flex: 1,
    fontFamily: fontFamily.medium,
    fontSize: 12,
    lineHeight: 18,
  },
  doneButton: {
    alignItems: 'center',
    backgroundColor: colors.rose500,
    borderRadius: 16,
    justifyContent: 'center',
    minHeight: 52,
  },
  doneText: {
    color: colors.white,
    fontFamily: fontFamily.black,
    fontSize: 14,
    textTransform: 'uppercase',
  },
});
