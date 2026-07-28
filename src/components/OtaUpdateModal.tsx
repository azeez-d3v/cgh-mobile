import { memo } from 'react';
import { ActivityIndicator, Modal, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { CheckCircle2, Download, RefreshCw, ShieldCheck, X } from 'lucide-react-native';
import { AnimatedPressable } from './AnimatedPressable';
import type { OtaController } from '../ota/types';
import { colors } from '../theme/colors';
import { fontFamily } from '../theme/typography';
import { radii } from '../theme/spacing';

export const OtaUpdateModal = memo(function OtaUpdateModal({ ota }: { ota: OtaController }) {
  const insets = useSafeAreaInsets();
  const manifest = ota.manifest;
  const downloading = ota.phase === 'downloading';
  const installed = ota.phase === 'installed';
  const failed = ota.phase === 'error';
  const canDismiss = !downloading && (!manifest?.mandatory || failed);

  return (
    <Modal
      animationType="none"
      navigationBarTranslucent
      onRequestClose={ota.dismissModal}
      statusBarTranslucent
      transparent
      visible={ota.modalVisible}
    >
      <View style={[styles.overlay, { paddingBottom: Math.max(insets.bottom + 20, 36) }]}>
        {canDismiss ? <AnimatedPressable onPress={ota.dismissModal} style={StyleSheet.absoluteFill} /> : null}
        <Animated.View entering={FadeInDown.springify().damping(18).stiffness(180)} style={styles.sheet}>
          <View style={styles.headingRow}>
            <View style={[styles.iconShell, installed ? styles.successShell : null]}>
              {installed ? (
                <CheckCircle2 size={25} color={colors.success} strokeWidth={2.6} />
              ) : (
                <ShieldCheck size={25} color={colors.rose500} strokeWidth={2.6} />
              )}
            </View>
            {canDismiss ? (
              <AnimatedPressable accessibilityLabel="Close update dialog" onPress={ota.dismissModal} style={styles.closeButton}>
                <X size={19} color={colors.inkSoft} strokeWidth={2.6} />
              </AnimatedPressable>
            ) : null}
          </View>

          <Text style={styles.title}>
            {installed ? 'Update ready' : failed ? 'Update unavailable' : downloading ? 'Downloading update' : 'A new update is available'}
          </Text>
          <Text style={styles.description}>
            {ota.message ??
              (downloading
                ? 'The signed update is downloading and will be verified before installation.'
                : 'Install the latest verified Portal improvements without downloading another APK.')}
          </Text>

          {manifest && !failed ? (
            <View style={styles.metaCard}>
              <View style={styles.metaRow}>
                <Text style={styles.metaLabel}>Bundle</Text>
                <Text style={styles.metaValue}>#{manifest.bundleVersion}</Text>
              </View>
              <View style={styles.metaRow}>
                <Text style={styles.metaLabel}>Download</Text>
                <Text style={styles.metaValue}>{formatBytes(manifest.size)}</Text>
              </View>
              <View style={styles.metaRow}>
                <Text style={styles.metaLabel}>Security</Text>
                <Text style={styles.verifiedText}>Signed & verified</Text>
              </View>
            </View>
          ) : null}

          {manifest?.releaseNotes.length && !failed ? (
            <ScrollView style={styles.notesScroll} contentContainerStyle={styles.notesContent} showsVerticalScrollIndicator={false}>
              {manifest.releaseNotes.map((note) => (
                <View key={note} style={styles.noteRow}>
                  <View style={styles.noteDot} />
                  <Text style={styles.noteText}>{note}</Text>
                </View>
              ))}
            </ScrollView>
          ) : null}

          {downloading ? (
            <View style={styles.progressGroup}>
              <View style={styles.progressTrack}>
                <View style={[styles.progressFill, { width: `${Math.max(4, Math.round(ota.progress * 100))}%` }]} />
              </View>
              <Text style={styles.progressText}>{Math.round(ota.progress * 100)}%</Text>
            </View>
          ) : null}

          <View style={styles.actions}>
            {failed ? (
              <AnimatedPressable onPress={() => ota.checkForUpdate(true)} style={styles.primaryButton}>
                <RefreshCw size={17} color={colors.white} strokeWidth={2.7} />
                <Text style={styles.primaryButtonText}>Try again</Text>
              </AnimatedPressable>
            ) : installed ? (
              <AnimatedPressable onPress={ota.restartToApply} style={styles.primaryButton}>
                <RefreshCw size={17} color={colors.white} strokeWidth={2.7} />
                <Text style={styles.primaryButtonText}>Restart and apply</Text>
              </AnimatedPressable>
            ) : downloading ? (
              <View style={[styles.primaryButton, styles.busyButton]}>
                <ActivityIndicator color={colors.white} size="small" />
                <Text style={styles.primaryButtonText}>Verifying download</Text>
              </View>
            ) : (
              <AnimatedPressable onPress={ota.installUpdate} style={styles.primaryButton}>
                <Download size={17} color={colors.white} strokeWidth={2.7} />
                <Text style={styles.primaryButtonText}>Download update</Text>
              </AnimatedPressable>
            )}
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
});

function formatBytes(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const styles = StyleSheet.create({
  overlay: {
    bottom: 0,
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
    backgroundColor: 'rgba(45, 27, 37, 0.34)',
    justifyContent: 'flex-end',
    paddingHorizontal: 16,
  },
  sheet: {
    backgroundColor: colors.surfaceStrong,
    borderRadius: radii.xl,
    padding: 22,
    shadowColor: colors.ink,
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.18,
    shadowRadius: 30,
    elevation: 16,
    maxHeight: '78%',
  },
  headingRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  iconShell: {
    alignItems: 'center',
    backgroundColor: colors.rose100,
    borderRadius: 18,
    height: 52,
    justifyContent: 'center',
    width: 52,
  },
  successShell: {
    backgroundColor: colors.mint,
  },
  closeButton: {
    alignItems: 'center',
    backgroundColor: colors.rose50,
    borderRadius: 16,
    height: 42,
    justifyContent: 'center',
    width: 42,
  },
  title: {
    color: colors.ink,
    fontFamily: fontFamily.black,
    fontSize: 23,
    lineHeight: 29,
  },
  description: {
    color: colors.inkSoft,
    fontFamily: fontFamily.regular,
    fontSize: 14,
    lineHeight: 21,
    marginTop: 7,
  },
  metaCard: {
    backgroundColor: colors.rose50,
    borderColor: colors.line,
    borderRadius: radii.lg,
    borderWidth: 1,
    gap: 10,
    marginTop: 18,
    padding: 15,
  },
  metaRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  metaLabel: {
    color: colors.muted,
    fontFamily: fontFamily.medium,
    fontSize: 12,
  },
  metaValue: {
    color: colors.ink,
    fontFamily: fontFamily.bold,
    fontSize: 12,
  },
  verifiedText: {
    color: colors.success,
    fontFamily: fontFamily.bold,
    fontSize: 12,
  },
  notesScroll: {
    marginTop: 15,
    maxHeight: 128,
  },
  notesContent: {
    gap: 9,
  },
  noteRow: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: 9,
  },
  noteDot: {
    backgroundColor: colors.rose400,
    borderRadius: 4,
    height: 7,
    marginTop: 7,
    width: 7,
  },
  noteText: {
    color: colors.inkSoft,
    flex: 1,
    fontFamily: fontFamily.regular,
    fontSize: 13,
    lineHeight: 20,
  },
  progressGroup: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
    marginTop: 18,
  },
  progressTrack: {
    backgroundColor: colors.rose100,
    borderRadius: 8,
    flex: 1,
    height: 9,
    overflow: 'hidden',
  },
  progressFill: {
    backgroundColor: colors.rose500,
    borderRadius: 8,
    height: '100%',
  },
  progressText: {
    color: colors.rose500,
    fontFamily: fontFamily.bold,
    fontSize: 12,
    minWidth: 34,
    textAlign: 'right',
  },
  actions: {
    marginTop: 20,
  },
  primaryButton: {
    alignItems: 'center',
    backgroundColor: colors.rose500,
    borderRadius: 17,
    flexDirection: 'row',
    gap: 9,
    justifyContent: 'center',
    minHeight: 54,
    paddingHorizontal: 18,
  },
  busyButton: {
    opacity: 0.8,
  },
  primaryButtonText: {
    color: colors.white,
    fontFamily: fontFamily.bold,
    fontSize: 14,
  },
});
