import { useFonts, NunitoSans_400Regular, NunitoSans_600SemiBold, NunitoSans_700Bold, NunitoSans_900Black } from '@expo-google-fonts/nunito-sans';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'react-native';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { ComponentType } from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaProvider, SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNetInfo } from '@react-native-community/netinfo';
import Animated, { FadeIn, FadeInDown, FadeInUp, Layout } from 'react-native-reanimated';
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  CalendarDays,
  Eye,
  EyeOff,
  FileText,
  Files,
  GraduationCap,
  Home,
  ListChecks,
  LockKeyhole,
  LogOut,
  OctagonAlert,
  RefreshCw,
  Scale,
  Settings,
  ShieldCheck,
  ShieldAlert,
  UserRound,
  Wifi,
  WifiOff,
} from 'lucide-react-native';
import type { LucideProps } from 'lucide-react-native';
import { DataTable } from './src/components/DataTable';
import { InfoSectionPager } from './src/components/InfoSectionPager';
import { PersonalInfoOverview } from './src/components/PersonalInfoOverview';
import { ChecklistOverview } from './src/components/ChecklistOverview';
import { AcademicRecordsOverview } from './src/components/AcademicRecordsOverview';
import { LegalDocumentModal } from './src/components/LegalDocumentModal';
import { EmptyState, Section } from './src/components/Section';
import { ModuleCard } from './src/components/ModuleCard';
import { StudentHeader } from './src/components/StudentHeader';
import { AnimatedPressable } from './src/components/AnimatedPressable';
import { CghPortalClient, isSessionExpiredError, MODULES } from './src/services/cghPortal';
import { previewModule, previewStudent } from './src/services/previewData';
import { cacheModule, cacheStudent, getCachedModule, getCachedStudent } from './src/services/portalCache';
import type { PortalModuleData, PortalModuleKey, StudentSummary } from './src/types';
import type { LegalDocumentKey } from './src/content/legal';
import { colors, gradients } from './src/theme/colors';
import { fontFamily } from './src/theme/typography';
import { radii } from './src/theme/spacing';

type DashboardTab = 'home' | 'records' | 'profile' | 'settings';

type NavItem = {
  key: DashboardTab;
  label: string;
  icon: ComponentType<LucideProps>;
};

const NAV_ITEMS: NavItem[] = [
  { key: 'home', label: 'Home', icon: Home },
  { key: 'records', label: 'Records', icon: Files },
  { key: 'profile', label: 'Profile', icon: UserRound },
  { key: 'settings', label: 'Settings', icon: Settings },
];

const DEV_PREVIEW_AVAILABLE = __DEV__;

export default function App() {
  const [fontsLoaded] = useFonts({ NunitoSans_400Regular, NunitoSans_600SemiBold, NunitoSans_700Bold, NunitoSans_900Black });
  const netInfo = useNetInfo();
  const initialPreview = useRef(readWebPreviewRoute()).current;
  const clientRef = useRef(new CghPortalClient());
  const [student, setStudent] = useState<StudentSummary | undefined>(initialPreview.enabled ? previewStudent : undefined);
  const [selectedModule, setSelectedModule] = useState<PortalModuleData | undefined>(
    initialPreview.moduleKey ? previewModule(initialPreview.moduleKey) : undefined,
  );
  const [moduleKey, setModuleKey] = useState<PortalModuleKey | undefined>(initialPreview.moduleKey);
  const [loading, setLoading] = useState(false);
  const [loginLoading, setLoginLoading] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const [previewMode, setPreviewMode] = useState(initialPreview.enabled);
  const [offlineMode, setOfflineMode] = useState(false);
  const [sessionExpired, setSessionExpired] = useState(false);
  const [activeTab, setActiveTab] = useState<DashboardTab>('home');
  const [logoutDialogOpen, setLogoutDialogOpen] = useState(false);

  const isLoggedIn = !!student;
  const deviceOffline = netInfo.isConnected === false || netInfo.isInternetReachable === false;
  const effectiveOffline = offlineMode || deviceOffline;

  async function handleLogin(username: string, password: string) {
    setLoginLoading(true);
    setError(undefined);
    try {
      const summary = await clientRef.current.login(username, password);
      setPreviewMode(false);
      setOfflineMode(false);
      setSessionExpired(false);
      await cacheStudent(summary);
      setStudent(summary);
      setSelectedModule(undefined);
      setModuleKey(undefined);
      setActiveTab('home');
      void warmOfflineCache();
    } catch (cause) {
      const cachedStudent = await getCachedStudent();
      if (cachedStudent) {
        setOfflineMode(true);
        setPreviewMode(false);
        setStudent(cachedStudent);
        setError(`Network login failed. Showing cached offline mode. ${cause instanceof Error ? cause.message : ''}`.trim());
      } else {
        setError(cause instanceof Error ? cause.message : 'Login failed.');
      }
    } finally {
      setLoginLoading(false);
    }
  }

  async function warmOfflineCache() {
    for (const module of MODULES) {
      try {
        const data = await clientRef.current.loadModule(module.key);
        await cacheModule(data);
        syncStudentNameFromModule(data);
      } catch (cause) {
        if (isSessionExpiredError(cause)) {
          setSessionExpired(true);
          setOfflineMode(true);
          return;
        }
      }
    }
  }

  async function handleOpenModule(key: PortalModuleKey) {
    setLoading(true);
    setError(undefined);
    setModuleKey(key);
    try {
      if (previewMode) {
        setSelectedModule(previewModule(key));
        return;
      }
      if (effectiveOffline) {
        const cached = await getCachedModule(key);
        if (!cached) throw new Error('No cached copy is available for this module yet. Login online once to save it for offline use.');
        setSelectedModule({ ...cached, fromCache: true, cacheReason: `Offline copy saved ${formatTimestamp(cached.fetchedAt)}` });
        return;
      }
      const data = await clientRef.current.loadModule(key);
      await cacheModule(data);
      syncStudentNameFromModule(data);
      setSessionExpired(false);
      setSelectedModule(data);
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : 'Unable to load module.';
      const cached = await getCachedModule(key);
      if (cached) {
        setSelectedModule({
          ...cached,
          fromCache: true,
          cacheReason: isSessionExpiredError(cause)
            ? `Session expired • copy saved ${formatTimestamp(cached.fetchedAt)}`
            : `Network unavailable • copy saved ${formatTimestamp(cached.fetchedAt)}`,
        });
        setError(isSessionExpiredError(cause) ? 'Session expired. Showing the latest cached copy. Please sign in again when you need fresh data.' : `Network request failed. Showing cached copy. ${message}`);
      } else {
        setError(isSessionExpiredError(cause) ? 'Session expired. Please sign in again.' : message);
      }
      if (isSessionExpiredError(cause)) {
        setSessionExpired(true);
        setOfflineMode(true);
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleLogout() {
    setLogoutDialogOpen(false);
    await clientRef.current.logout();
    setStudent(undefined);
    setSelectedModule(undefined);
    setModuleKey(undefined);
    setError(undefined);
    setPreviewMode(false);
    setOfflineMode(false);
    setSessionExpired(false);
    setActiveTab('home');
  }

  function handlePreview() {
    if (!DEV_PREVIEW_AVAILABLE) return;
    setPreviewMode(true);
    setOfflineMode(false);
    setSessionExpired(false);
    setStudent(previewStudent);
    setSelectedModule(undefined);
    setModuleKey(undefined);
    setError(undefined);
    setActiveTab('home');
  }

  function syncStudentNameFromModule(data: PortalModuleData) {
    const fullName = fullNameFromPersonalInfo(data);
    if (!fullName) return;
    setStudent((current) => {
      if (!current || current.name === fullName) return current;
      const updated = { ...current, name: fullName };
      void cacheStudent(updated);
      return updated;
    });
  }

  useEffect(() => {
    if (!isLoggedIn || previewMode || offlineMode) return;
    let cancelled = false;

    const keepAlive = async () => {
      try {
        await clientRef.current.keepAlive();
      } catch (cause) {
        if (cancelled) return;
        if (isSessionExpiredError(cause)) {
          setError('Session expired. You can keep viewing cached data or sign in again for fresh records.');
          setSessionExpired(true);
          setOfflineMode(true);
        }
      }
    };

    const interval = setInterval(keepAlive, 55_000);
    keepAlive();
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [isLoggedIn, previewMode, offlineMode]);

  if (!fontsLoaded) {
    return (
      <View style={styles.loadingRoot}>
        <ActivityIndicator color={colors.rose500} />
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <View style={styles.immersiveRoot}>
        <StatusBar barStyle="dark-content" translucent backgroundColor="transparent" />
        {isLoggedIn ? (
          <DashboardScreen
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            student={student}
            previewMode={previewMode}
            offlineMode={effectiveOffline}
            sessionExpired={sessionExpired}
            cookieHeader={clientRef.current.cookieHeader}
            selectedModule={selectedModule}
            loading={loading}
            moduleKey={moduleKey}
            error={error}
            onOpenModule={handleOpenModule}
            onSignInAgain={handleLogout}
            onBack={() => {
              setSelectedModule(undefined);
              setModuleKey(undefined);
              setError(undefined);
            }}
            onLogout={() => setLogoutDialogOpen(true)}
          />
        ) : (
          <LoginScreen loading={loginLoading} error={error} onLogin={handleLogin} onPreview={handlePreview} />
        )}
        <LogoutConfirmation
          visible={logoutDialogOpen}
          onCancel={() => setLogoutDialogOpen(false)}
          onConfirm={handleLogout}
        />
      </View>
    </SafeAreaProvider>
  );
}

function AppBackdrop() {
  return (
    <View style={styles.backdropLayer}>
      <LinearGradient colors={gradients.app} style={StyleSheet.absoluteFill} />
      <View style={[styles.blob, styles.blobOne]} />
      <View style={[styles.blob, styles.blobTwo]} />
      <View style={[styles.blob, styles.blobThree]} />
      <View style={[styles.softSquare, styles.softSquareOne]} />
      <View style={[styles.softSquare, styles.softSquareTwo]} />
    </View>
  );
}

function LogoutConfirmation({
  visible,
  onCancel,
  onConfirm,
}: {
  visible: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const insets = useSafeAreaInsets();
  return (
    <Modal
      animationType="none"
      navigationBarTranslucent
      onRequestClose={onCancel}
      statusBarTranslucent
      transparent
      visible={visible}
    >
      <View style={[styles.dialogOverlay, { paddingBottom: Math.max(insets.bottom + 20, 36) }]}>
        <AnimatedPressable onPress={onCancel} style={styles.dialogBackdrop} />
        <Animated.View entering={FadeInDown.springify().damping(18).stiffness(180)} style={styles.logoutDialog}>
          <View style={styles.logoutDialogIcon}>
            <LogOut size={24} color={colors.rose500} strokeWidth={2.7} />
          </View>
          <Text style={styles.logoutDialogTitle}>Ready to sign out?</Text>
          <Text style={styles.logoutDialogText}>Your saved offline records will stay on this device, but live portal updates will stop.</Text>
          <View style={styles.logoutDialogActions}>
            <AnimatedPressable onPress={onCancel} style={styles.dialogCancelButton}>
              <Text style={styles.dialogCancelText}>Stay signed in</Text>
            </AnimatedPressable>
            <AnimatedPressable onPress={onConfirm} style={styles.dialogConfirmButton}>
              <LogOut size={16} color={colors.white} strokeWidth={2.7} />
              <Text style={styles.dialogConfirmText}>Sign out</Text>
            </AnimatedPressable>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

function LoginScreen({
  loading,
  error,
  onLogin,
  onPreview,
}: {
  loading: boolean;
  error?: string;
  onLogin: (username: string, password: string) => void;
  onPreview: () => void;
}) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [legalDocument, setLegalDocument] = useState<LegalDocumentKey | undefined>();
  const passwordRef = useRef<TextInput>(null);
  const scrollRef = useRef<ScrollView>(null);
  const insets = useSafeAreaInsets();
  const canSubmit = username.trim().length > 0 && password.length > 0 && !loading;

  return (
    <View style={styles.immersiveRoot}>
      <AppBackdrop />
      <SafeAreaView edges={['top', 'right', 'left']} style={styles.safeFill}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.loginKeyboard}>
          <ScrollView
            ref={scrollRef}
            automaticallyAdjustKeyboardInsets
            contentContainerStyle={[styles.loginScrollContent, { paddingBottom: Math.max(insets.bottom + 20, 28) }]}
            contentInsetAdjustmentBehavior="never"
            keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <Animated.View entering={FadeInUp.duration(460).springify()} style={styles.loginContent}>
              <View style={styles.loginBrand}>
                <LinearGradient colors={gradients.button} style={styles.loginBrandIcon}>
                  <GraduationCap size={30} color={colors.white} strokeWidth={2.4} />
                </LinearGradient>
                <View style={styles.loginBrandCopy}>
                  <Text style={styles.appName}>CGH Mobile</Text>
                  <Text style={styles.loginBrandText}>Student Portal</Text>
                </View>
              </View>

              <View style={styles.loginCard}>
                <View style={styles.loginHeading}>
                  <Text style={styles.loginTitle}>Welcome back</Text>
                  <Text style={styles.loginSubtitle}>Read-only access to your SchoolAutomate records.</Text>
                </View>

                <View style={styles.formGroup}>
                  <Text style={styles.label}>Student ID</Text>
                  <View style={styles.inputShell}>
                    <UserRound size={19} color={colors.rose500} strokeWidth={2.5} />
                    <TextInput
                      value={username}
                      onChangeText={setUsername}
                      placeholder="Enter your student ID"
                      placeholderTextColor={colors.muted}
                      keyboardType="number-pad"
                      autoCapitalize="none"
                      autoCorrect={false}
                      style={styles.input}
                      editable={!loading}
                      returnKeyType="next"
                      onSubmitEditing={() => passwordRef.current?.focus()}
                    />
                  </View>
                </View>

                <View style={styles.formGroup}>
                  <Text style={styles.label}>Password</Text>
                  <View style={styles.inputShell}>
                    <LockKeyhole size={19} color={colors.rose500} strokeWidth={2.5} />
                    <TextInput
                      ref={passwordRef}
                      value={password}
                      onChangeText={setPassword}
                      placeholder="Enter your password"
                      placeholderTextColor={colors.muted}
                      secureTextEntry={!passwordVisible}
                      autoCapitalize="none"
                      autoCorrect={false}
                      style={styles.input}
                      editable={!loading}
                      returnKeyType="go"
                      onFocus={() => setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 180)}
                      onSubmitEditing={() => (canSubmit ? onLogin(username, password) : undefined)}
                    />
                    <AnimatedPressable onPress={() => setPasswordVisible((visible) => !visible)} style={styles.passwordToggle}>
                      {passwordVisible ? (
                        <EyeOff size={18} color={colors.muted} strokeWidth={2.4} />
                      ) : (
                        <Eye size={18} color={colors.muted} strokeWidth={2.4} />
                      )}
                    </AnimatedPressable>
                  </View>
                </View>

                {error ? (
                  <View style={styles.loginErrorBox}>
                    <OctagonAlert size={17} color={colors.danger} strokeWidth={2.5} />
                    <Text style={styles.loginErrorText}>{error}</Text>
                  </View>
                ) : null}
                {Platform.OS === 'web' ? <Text style={styles.noteText}>Keep npm run proxy open for real portal login.</Text> : null}

                <AnimatedPressable
                  disabled={!canSubmit}
                  onPress={() => onLogin(username, password)}
                  style={[styles.loginButton, !canSubmit ? styles.disabledButton : null]}
                >
                  {loading ? (
                    <ActivityIndicator color={colors.white} />
                  ) : (
                    <>
                      <Text style={styles.loginButtonText}>Sign in</Text>
                      <ArrowRight size={18} color={colors.white} strokeWidth={2.8} />
                    </>
                  )}
                </AnimatedPressable>

                {DEV_PREVIEW_AVAILABLE ? (
                  <AnimatedPressable onPress={onPreview} style={styles.previewButton}>
                    <Text style={styles.previewButtonText}>Explore developer preview</Text>
                  </AnimatedPressable>
                ) : null}

                <View style={styles.legalConsent}>
                  <Text style={styles.legalConsentText}>By signing in, you acknowledge this unofficial app’s</Text>
                  <View style={styles.legalLinks}>
                    <AnimatedPressable onPress={() => setLegalDocument('terms')} style={styles.legalLinkButton}>
                      <Text style={styles.legalLinkText}>Terms of Use</Text>
                    </AnimatedPressable>
                    <Text style={styles.legalSeparator}>•</Text>
                    <AnimatedPressable onPress={() => setLegalDocument('privacy')} style={styles.legalLinkButton}>
                      <Text style={styles.legalLinkText}>Privacy Policy</Text>
                    </AnimatedPressable>
                  </View>
                </View>
              </View>

              <Text style={styles.loginFootnote}>Unofficial student companion • Not affiliated with CGH or SchoolAutomate</Text>
            </Animated.View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
      <LegalDocumentModal documentKey={legalDocument} onClose={() => setLegalDocument(undefined)} />
    </View>
  );
}

function DashboardScreen({
  activeTab,
  setActiveTab,
  student,
  previewMode,
  offlineMode,
  sessionExpired,
  cookieHeader,
  selectedModule,
  loading,
  moduleKey,
  error,
  onOpenModule,
  onSignInAgain,
  onBack,
  onLogout,
}: {
  activeTab: DashboardTab;
  setActiveTab: (tab: DashboardTab) => void;
  student?: StudentSummary;
  previewMode: boolean;
  offlineMode: boolean;
  sessionExpired: boolean;
  cookieHeader?: string;
  selectedModule?: PortalModuleData;
  loading: boolean;
  moduleKey?: PortalModuleKey;
  error?: string;
  onOpenModule: (key: PortalModuleKey) => void;
  onSignInAgain: () => void;
  onBack: () => void;
  onLogout: () => void;
}) {
  const insets = useSafeAreaInsets();

  if (selectedModule || loading || moduleKey) {
    return (
      <ModuleDetailScreen
        data={selectedModule}
        loading={loading}
        error={error}
        moduleKey={moduleKey}
        offlineMode={offlineMode}
        sessionExpired={sessionExpired}
        onBack={onBack}
        onRetry={moduleKey ? () => onOpenModule(moduleKey) : undefined}
        onSignInAgain={onSignInAgain}
        onNavigate={(tab) => {
          onBack();
          setActiveTab(tab);
        }}
      />
    );
  }

  return (
    <View style={styles.immersiveRoot}>
      <AppBackdrop />
      <SafeAreaView edges={['top', 'right', 'left']} style={styles.safeFill}>
        <View style={styles.dashboardTopBar}>
          <View>
            <Text style={styles.kicker}>{previewMode ? 'Visual Mode' : greetingLabel(activeTab)}</Text>
            <Text style={styles.screenTitle}>{tabTitle(activeTab)}</Text>
          </View>
          <View style={styles.topBarActions}>
            <ConnectionPill offline={offlineMode} sessionExpired={sessionExpired} />
          </View>
        </View>

        <DashboardTabContent
          activeTab={activeTab}
          student={student}
          cookieHeader={cookieHeader}
          previewMode={previewMode}
          offlineMode={offlineMode}
          sessionExpired={sessionExpired}
          onOpenModule={onOpenModule}
          onSignInAgain={onSignInAgain}
          onLogout={onLogout}
        />
      </SafeAreaView>
      <FloatingNav activeTab={activeTab} onSelect={setActiveTab} bottom={insets.bottom + 20} />
    </View>
  );
}

function DashboardTabContent({
  activeTab,
  student,
  cookieHeader,
  previewMode,
  offlineMode,
  sessionExpired,
  onOpenModule,
  onSignInAgain,
  onLogout,
}: {
  activeTab: DashboardTab;
  student?: StudentSummary;
  cookieHeader?: string;
  previewMode: boolean;
  offlineMode: boolean;
  sessionExpired: boolean;
  onOpenModule: (key: PortalModuleKey) => void;
  onSignInAgain: () => void;
  onLogout: () => void;
}) {
  const insets = useSafeAreaInsets();
  const [legalDocument, setLegalDocument] = useState<LegalDocumentKey | undefined>();

  if (activeTab === 'profile') {
    return (
      <ScrollView contentContainerStyle={[styles.tabScrollContent, { paddingBottom: 136 + insets.bottom }]} showsVerticalScrollIndicator={false}>
        <Animated.View entering={FadeInDown.duration(420)}>
          <StudentHeader student={student} cookieHeader={cookieHeader} />
        </Animated.View>
        <Section title="Profile actions">
          <View style={styles.actionGrid}>
            <ActionTile icon={UserRound} label="Personal Info" value="View GSPIS" onPress={() => onOpenModule('personalInfo')} />
            <ActionTile icon={ListChecks} label="Checklist" value="Residency" onPress={() => onOpenModule('checklist')} />
          </View>
        </Section>
      </ScrollView>
    );
  }

  if (activeTab === 'settings') {
    return (
      <>
        <ScrollView contentContainerStyle={[styles.tabScrollContent, { paddingBottom: 136 + insets.bottom }]} showsVerticalScrollIndicator={false}>
          <Animated.View entering={FadeInDown.duration(360)} style={styles.unofficialBanner}>
            <View style={styles.unofficialBannerIcon}>
              <ShieldAlert size={21} color={colors.rose500} strokeWidth={2.6} />
            </View>
            <View style={styles.unofficialBannerCopy}>
              <Text style={styles.unofficialBannerTitle}>Unofficial CGH App Portal</Text>
              <Text style={styles.unofficialBannerText}>
                An independent, read-only student companion. Not affiliated with or endorsed by CGH or SchoolAutomate.
              </Text>
            </View>
          </Animated.View>

          <Animated.View entering={FadeInDown.duration(420)} style={styles.settingsCard}>
            <Scale size={28} color={colors.rose500} strokeWidth={2.5} />
            <Text style={styles.settingsTitle}>Account & legal</Text>
            <Text style={styles.settingsText}>Review the app policies or securely end your current portal session.</Text>

            <View style={styles.settingsLegalActions}>
              <AnimatedPressable onPress={() => setLegalDocument('terms')} style={styles.settingsLegalButton}>
                <View style={styles.settingsLegalIcon}>
                  <FileText size={20} color={colors.rose500} strokeWidth={2.5} />
                </View>
                <Text style={styles.settingsLegalText}>Terms of Use</Text>
                <ArrowRight size={18} color={colors.rose500} strokeWidth={2.7} />
              </AnimatedPressable>

              <AnimatedPressable onPress={() => setLegalDocument('privacy')} style={styles.settingsLegalButton}>
                <View style={styles.settingsLegalIcon}>
                  <ShieldCheck size={20} color={colors.rose500} strokeWidth={2.5} />
                </View>
                <Text style={styles.settingsLegalText}>Privacy Policy</Text>
                <ArrowRight size={18} color={colors.rose500} strokeWidth={2.7} />
              </AnimatedPressable>
            </View>

            <AnimatedPressable onPress={onLogout} style={styles.settingsLogoutButton}>
              <LogOut size={19} color={colors.white} strokeWidth={2.7} />
              <Text style={styles.settingsLogoutText}>Logout</Text>
            </AnimatedPressable>
          </Animated.View>
        </ScrollView>
        <LegalDocumentModal documentKey={legalDocument} onClose={() => setLegalDocument(undefined)} />
      </>
    );
  }

  const data = activeTab === 'records' ? MODULES : MODULES.slice(0, 6);

  return (
    <FlatList
      data={data}
      keyExtractor={(item) => item.key}
      ListHeaderComponent={
        <View style={styles.dashboardHeaderStack}>
          {offlineMode || sessionExpired ? (
            <ConnectivityNotice offline={offlineMode} sessionExpired={sessionExpired} onSignInAgain={onSignInAgain} />
          ) : null}
          {activeTab === 'home' ? (
            <Animated.View entering={FadeInDown.duration(420)}>
              <StudentHeader student={student} cookieHeader={cookieHeader} />
            </Animated.View>
          ) : null}
          <View style={styles.quickStatsRow}>
            <QuickStat icon={CalendarDays} label="Term" value={student?.term ?? 'Current'} />
            <QuickStat icon={BookOpen} label="Course" value={student?.course ?? 'CGH'} accent />
          </View>
          <View style={styles.addonStrip}>
            {offlineMode ? <WifiOff size={16} color={colors.rose500} strokeWidth={2.8} /> : <RefreshCw size={16} color={colors.rose500} strokeWidth={2.8} />}
            <Text style={styles.addonText}>{offlineMode ? 'Saved records remain available on this device' : previewMode ? 'Developer preview data active' : 'Read-only records with automatic offline caching'}</Text>
          </View>
          <Text style={styles.sectionLead}>{activeTab === 'records' ? 'All records' : 'Essentials'}</Text>
        </View>
      }
      contentContainerStyle={[styles.listContent, { paddingBottom: 136 + insets.bottom }]}
      ItemSeparatorComponent={() => <View style={styles.separator} />}
      renderItem={({ item, index }) => (
        <Animated.View entering={FadeInUp.delay(index * 55).duration(360)} layout={Layout.springify()}>
          <ModuleCard module={item} index={index} onPress={onOpenModule} />
        </Animated.View>
      )}
    />
  );
}

function ModuleDetailScreen({
  data,
  loading,
  error,
  moduleKey,
  offlineMode,
  sessionExpired,
  onBack,
  onRetry,
  onSignInAgain,
  onNavigate,
}: {
  data?: PortalModuleData;
  loading: boolean;
  error?: string;
  moduleKey?: PortalModuleKey;
  offlineMode: boolean;
  sessionExpired: boolean;
  onBack: () => void;
  onRetry?: () => void;
  onSignInAgain: () => void;
  onNavigate: (tab: DashboardTab) => void;
}) {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const detailWidth = Math.min(Math.max(240, width - 40), 960);
  const fallbackTitle = MODULES.find((item) => item.key === moduleKey)?.label ?? 'Module';
  const summaryEntries = useMemo(() => essentialSummaryEntries(data), [data]);
  const checklistTable = moduleKey === 'checklist' ? data?.tables[0] : undefined;
  const hasAcademicOverview = Boolean(data && ['subjects', 'schedule', 'ledger', 'dues'].includes(data.key));

  return (
    <View style={styles.immersiveRoot}>
      <AppBackdrop />
      <SafeAreaView edges={['top', 'right', 'left']} style={styles.safeFill}>
        <View style={styles.detailTopBar}>
          <AnimatedPressable onPress={onBack} style={styles.backBubble}>
            <ArrowLeft size={20} color={colors.rose500} strokeWidth={3} />
          </AnimatedPressable>
          <Text style={styles.detailTitle} numberOfLines={1}>
            {fallbackTitle}
          </Text>
          <AnimatedPressable onPress={onRetry} disabled={!onRetry} style={styles.backBubble}>
            <RefreshCw size={19} color={colors.rose500} strokeWidth={2.8} />
          </AnimatedPressable>
        </View>

        {loading ? (
          <View style={styles.centerState}>
            <ActivityIndicator color={colors.rose500} size="large" />
            <Text style={styles.centerText}>Loading CGH portal data…</Text>
          </View>
        ) : error && !data ? (
          <NetworkErrorPage message={error} onRetry={onRetry} onBack={onBack} />
        ) : (
          <ScrollView
            key={moduleKey}
            contentContainerStyle={[styles.detailContent, { alignSelf: 'center', paddingBottom: 136 + insets.bottom, width: detailWidth }]}
            contentInsetAdjustmentBehavior="never"
            showsVerticalScrollIndicator={false}
            refreshControl={onRetry ? <RefreshControl refreshing={false} onRefresh={onRetry} tintColor={colors.rose500} /> : undefined}
          >
            {offlineMode || sessionExpired ? (
              <ConnectivityNotice offline={offlineMode} sessionExpired={sessionExpired} onSignInAgain={onSignInAgain} />
            ) : null}

            {data?.fromCache ? (
              <View style={styles.cacheBox}>
                <RefreshCw size={16} color={colors.rose500} strokeWidth={2.8} />
                <Text style={styles.cacheText}>{data.cacheReason ?? 'Showing cached data.'}</Text>
              </View>
            ) : null}

            {error ? (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>{error}</Text>
                {onRetry ? <PrimaryButton label="Retry" onPress={onRetry} /> : null}
              </View>
            ) : null}

            {data ? (
              <>
                {moduleKey === 'personalInfo' && data.infoSections?.length ? (
                  <PersonalInfoOverview sections={data.infoSections} />
                ) : moduleKey === 'checklist' && checklistTable ? (
                  <ChecklistOverview table={checklistTable} summary={data.summary ?? {}} />
                ) : hasAcademicOverview ? (
                  <AcademicRecordsOverview data={data} />
                ) : data.infoSections?.length ? (
                  <InfoSectionPager sections={data.infoSections} />
                ) : summaryEntries.length > 0 ? (
                  <Section title="Summary">
                    <View style={styles.infoGrid}>
                      {summaryEntries.map(([label, value]) => (
                        <View key={`${label}-${value}`} style={styles.infoItem}>
                          <Text style={styles.infoLabel}>{label}</Text>
                          <Text style={styles.infoValue}>{value}</Text>
                        </View>
                      ))}
                    </View>
                  </Section>
                ) : null}

                {!hasAcademicOverview && moduleKey !== 'personalInfo' && moduleKey !== 'checklist' && data.tables.length > 0 ? (
                  <View style={styles.tableStack}>
                    {data.tables.map((table, index) => (
                      <Animated.View key={`${table.title}-${index}`} entering={FadeInUp.delay(index * 70).duration(360)}>
                        <DataTable table={table} fallbackTitle={fallbackTitle} />
                      </Animated.View>
                    ))}
                  </View>
                ) : !hasAcademicOverview && moduleKey !== 'personalInfo' && moduleKey !== 'checklist' && !data.infoSections?.some((section) => (section.tables?.length ?? 0) > 0) ? (
                  <EmptyState message="No structured table was found on this portal page." />
                ) : null}

                <Text style={styles.timestamp}>Updated {new Date(data.fetchedAt).toLocaleString()}</Text>
              </>
            ) : null}
          </ScrollView>
        )}
      </SafeAreaView>
      <FloatingNav activeTab="records" onSelect={onNavigate} bottom={insets.bottom + 20} />
    </View>
  );
}

function ConnectionPill({ offline, sessionExpired }: { offline: boolean; sessionExpired: boolean }) {
  const Icon = sessionExpired ? ShieldAlert : offline ? WifiOff : Wifi;
  const label = sessionExpired ? 'Expired' : offline ? 'Offline' : 'Live';
  return (
    <View style={[styles.connectionPill, offline || sessionExpired ? styles.connectionPillOffline : null]}>
      <Icon size={13} color={offline || sessionExpired ? colors.danger : colors.success} strokeWidth={2.8} />
      <Text style={[styles.connectionPillText, offline || sessionExpired ? styles.connectionPillTextOffline : null]}>{label}</Text>
    </View>
  );
}

function ConnectivityNotice({
  offline,
  sessionExpired,
  onSignInAgain,
}: {
  offline: boolean;
  sessionExpired: boolean;
  onSignInAgain: () => void;
}) {
  const Icon = sessionExpired ? ShieldAlert : WifiOff;
  return (
    <View style={styles.connectivityNotice}>
      <View style={styles.connectivityIcon}>
        <Icon size={20} color={sessionExpired ? colors.danger : colors.rose500} strokeWidth={2.7} />
      </View>
      <View style={styles.connectivityCopy}>
        <Text style={styles.connectivityTitle}>{sessionExpired ? 'Session expired' : 'You’re offline'}</Text>
        <Text style={styles.connectivityText}>
          {sessionExpired
            ? 'Cached records are still available. Sign in again to refresh them.'
            : 'The app is using records saved on this device until the connection returns.'}
        </Text>
      </View>
      {sessionExpired ? (
        <AnimatedPressable onPress={onSignInAgain} style={styles.signInAgainButton}>
          <Text style={styles.signInAgainText}>Sign in</Text>
        </AnimatedPressable>
      ) : null}
    </View>
  );
}


function NetworkErrorPage({ message, onRetry, onBack }: { message: string; onRetry?: () => void; onBack: () => void }) {
  return (
    <View style={styles.errorPage}>
      <View style={styles.errorPageIcon}>
        <OctagonAlert size={34} color={colors.danger} strokeWidth={2.6} />
      </View>
      <Text style={styles.errorPageTitle}>Couldn’t load fresh data</Text>
      <Text style={styles.errorPageMessage}>{message}</Text>
      <View style={styles.errorPageActions}>
        {onRetry ? <PrimaryButton label="Retry" onPress={onRetry} /> : null}
        <AnimatedPressable onPress={onBack} style={styles.secondaryButton}>
          <Text style={styles.secondaryButtonText}>Back to dashboard</Text>
        </AnimatedPressable>
      </View>
    </View>
  );
}

function QuickStat({ icon: Icon, label, value, accent }: { icon: ComponentType<LucideProps>; label: string; value: string; accent?: boolean }) {
  const responsiveSize = value.length > 20 ? 12 : value.length > 14 ? 13 : 15;
  return (
    <View style={[styles.quickStat, accent ? styles.quickStatAccent : null]}>
      <Icon size={18} color={colors.rose500} strokeWidth={2.8} />
      <Text style={[styles.quickStatValue, { fontSize: responsiveSize }]}>{value}</Text>
      <Text style={styles.quickStatLabel}>{label}</Text>
    </View>
  );
}

function ActionTile({ icon: Icon, label, value, onPress }: { icon: ComponentType<LucideProps>; label: string; value: string; onPress: () => void }) {
  return (
    <AnimatedPressable onPress={onPress} style={styles.actionTile}>
      <Icon size={22} color={colors.rose500} strokeWidth={2.8} />
      <Text style={styles.actionLabel}>{label}</Text>
      <Text style={styles.actionValue}>{value}</Text>
    </AnimatedPressable>
  );
}

function FloatingNav({ activeTab, onSelect, bottom }: { activeTab: DashboardTab; onSelect: (tab: DashboardTab) => void; bottom: number }) {
  return (
    <Animated.View entering={FadeIn.duration(350)} style={[styles.floatingNav, { bottom }]}>
      {NAV_ITEMS.map((item) => {
        const Icon = item.icon;
        const active = activeTab === item.key;
        return (
          <AnimatedPressable key={item.key} onPress={() => onSelect(item.key)} style={[styles.navItem, active ? styles.navItemActive : null]}>
            <Icon size={20} color={active ? colors.white : colors.rose500} strokeWidth={2.8} />
          </AnimatedPressable>
        );
      })}
    </Animated.View>
  );
}

function PrimaryButton({ label, loading, disabled, onPress }: { label: string; loading?: boolean; disabled?: boolean; onPress: () => void }) {
  return (
    <AnimatedPressable disabled={disabled} onPress={onPress} style={[styles.primaryButton, disabled ? styles.disabledButton : null]}>
      {loading ? <ActivityIndicator color={colors.white} /> : <Text style={styles.primaryButtonText}>{label}</Text>}
    </AnimatedPressable>
  );
}

function essentialSummaryEntries(data?: PortalModuleData) {
  if (!data || data.key === 'personalInfo' || data.key === 'checklist') return [];
  const patterns: Record<Exclude<PortalModuleKey, 'personalInfo' | 'checklist'>, RegExp[]> = {
    subjects: [/enrolled sy.?term|term/i, /total units load taken|total units/i, /maximum units/i],
    schedule: [/term|school year/i, /total load units|total units/i],
    ledger: [/student id/i, /^balance$/i, /term|school year/i],
    dues: [/last enrolled|term/i, /^status$/i, /balance|amount/i],
  };
  const entries = Object.entries(data.summary ?? {}).filter(([label, value]) => value?.trim() && !/:\s*[\d,.]+\s*$/i.test(label));
  const selected: Array<[string, string]> = [];

  for (const pattern of patterns[data.key]) {
    const match = entries.find(([label]) => pattern.test(label) && !selected.some(([used]) => used === label));
    if (match) selected.push(match);
  }

  return (selected.length > 0 ? selected : entries).slice(0, 4);
}

function greetingLabel(tab: DashboardTab) {
  switch (tab) {
    case 'home':
      return 'Welcome back';
    case 'records':
      return 'Searchable portal';
    case 'profile':
      return 'Student profile';
    case 'settings':
      return 'App controls';
  }
}

function tabTitle(tab: DashboardTab) {
  switch (tab) {
    case 'home':
      return 'Dashboard';
    case 'records':
      return 'Records';
    case 'profile':
      return 'Profile';
    case 'settings':
      return 'Settings';
  }
}

function readWebPreviewRoute(): { enabled: boolean; moduleKey?: PortalModuleKey } {
  if (!DEV_PREVIEW_AVAILABLE || Platform.OS !== 'web' || typeof window === 'undefined') return { enabled: false };
  const value = new URLSearchParams(window.location.search).get('preview');
  if (value === null) return { enabled: false };
  const moduleKey = MODULES.find((module) => module.key === value)?.key;
  return { enabled: true, moduleKey };
}

function formatTimestamp(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'previously' : date.toLocaleString();
}

function fullNameFromPersonalInfo(data: PortalModuleData) {
  if (data.key !== 'personalInfo') return undefined;
  const fields = data.infoSections?.find((section) => section.id === 'personal')?.fields;
  const firstName = fields?.['First Name']?.trim();
  const lastName = fields?.['Last Name']?.trim();
  if (!firstName || !lastName) return undefined;
  return `${lastName}, ${firstName}`;
}

const styles = StyleSheet.create({
  loadingRoot: {
    alignItems: 'center',
    backgroundColor: colors.background,
    flex: 1,
    justifyContent: 'center',
  },
  immersiveRoot: {
    flex: 1,
  },
  dialogOverlay: {
    backgroundColor: 'rgba(45, 27, 37, 0.32)',
    flex: 1,
    justifyContent: 'flex-end',
    paddingHorizontal: 18,
  },
  dialogBackdrop: {
    bottom: 0,
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
  },
  logoutDialog: {
    alignItems: 'center',
    backgroundColor: colors.surfaceStrong,
    borderColor: 'rgba(255,255,255,0.96)',
    borderRadius: 30,
    borderWidth: 1,
    gap: 10,
    padding: 20,
    shadowColor: colors.ink,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.18,
    shadowRadius: 28,
    elevation: 16,
  },
  logoutDialogIcon: {
    alignItems: 'center',
    backgroundColor: colors.rose100,
    borderRadius: 26,
    height: 52,
    justifyContent: 'center',
    width: 52,
  },
  logoutDialogTitle: {
    color: colors.ink,
    fontFamily: fontFamily.black,
    fontSize: 21,
    marginTop: 2,
  },
  logoutDialogText: {
    color: colors.inkSoft,
    fontFamily: fontFamily.medium,
    fontSize: 12,
    lineHeight: 18,
    maxWidth: 340,
    textAlign: 'center',
  },
  logoutDialogActions: {
    flexDirection: 'row',
    gap: 9,
    marginTop: 5,
    width: '100%',
  },
  dialogCancelButton: {
    alignItems: 'center',
    backgroundColor: colors.rose50,
    borderColor: colors.line,
    borderRadius: radii.md,
    borderWidth: 1,
    flex: 1,
    justifyContent: 'center',
    minHeight: 48,
    paddingHorizontal: 10,
  },
  dialogCancelText: {
    color: colors.inkSoft,
    fontFamily: fontFamily.black,
    fontSize: 12,
  },
  dialogConfirmButton: {
    alignItems: 'center',
    backgroundColor: colors.rose500,
    borderRadius: radii.md,
    flex: 1,
    flexDirection: 'row',
    gap: 7,
    justifyContent: 'center',
    minHeight: 48,
    paddingHorizontal: 10,
  },
  dialogConfirmText: {
    color: colors.white,
    fontFamily: fontFamily.black,
    fontSize: 12,
  },
  safeFill: {
    flex: 1,
  },
  backdropLayer: {
    bottom: 0,
    left: 0,
    pointerEvents: 'none',
    position: 'absolute',
    right: 0,
    top: 0,
  },
  blob: {
    position: 'absolute',
    backgroundColor: 'rgba(249, 175, 200, 0.25)',
    borderRadius: 999,
  },
  blobOne: {
    height: 260,
    left: -92,
    top: -68,
    width: 260,
  },
  blobTwo: {
    backgroundColor: 'rgba(217, 199, 255, 0.28)',
    height: 220,
    right: -72,
    top: 106,
    width: 220,
  },
  blobThree: {
    bottom: -86,
    height: 300,
    left: 36,
    width: 300,
  },
  softSquare: {
    position: 'absolute',
    backgroundColor: 'rgba(255,255,255,0.38)',
    borderRadius: 18,
    height: 58,
    width: 58,
  },
  softSquareOne: {
    left: 26,
    top: 64,
  },
  softSquareTwo: {
    bottom: 82,
    right: 26,
  },
  loginKeyboard: {
    flex: 1,
  },
  loginScrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 22,
    paddingTop: 20,
  },
  loginContent: {
    alignSelf: 'center',
    gap: 18,
    maxWidth: 430,
    width: '100%',
  },
  loginBrand: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 4,
  },
  loginBrandIcon: {
    alignItems: 'center',
    borderRadius: 23,
    height: 46,
    justifyContent: 'center',
    width: 46,
  },
  loginBrandCopy: {
    flex: 1,
  },
  loginBrandText: {
    color: colors.ink,
    fontFamily: fontFamily.black,
    fontSize: 17,
    marginTop: 1,
  },
  loginCard: {
    backgroundColor: colors.surface,
    borderColor: 'rgba(255,255,255,0.94)',
    borderRadius: 30,
    borderWidth: 1,
    gap: 17,
    padding: 20,
    shadowColor: colors.rose400,
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.13,
    shadowRadius: 28,
    elevation: 9,
  },
  appName: {
    color: colors.rose500,
    fontFamily: fontFamily.black,
    fontSize: 13,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  loginHeading: {
    gap: 4,
  },
  loginTitle: {
    color: colors.ink,
    fontFamily: fontFamily.black,
    fontSize: 28,
  },
  loginSubtitle: {
    color: colors.inkSoft,
    fontFamily: fontFamily.regular,
    fontSize: 14,
    lineHeight: 20,
  },
  formGroup: {
    gap: 8,
  },
  label: {
    color: colors.inkSoft,
    fontFamily: fontFamily.black,
    fontSize: 11,
  },
  inputShell: {
    alignItems: 'center',
    backgroundColor: colors.rose50,
    borderColor: colors.line,
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 10,
    minHeight: 54,
    paddingHorizontal: 14,
  },
  input: {
    color: colors.ink,
    flex: 1,
    fontFamily: fontFamily.medium,
    fontSize: 15,
    minHeight: 52,
    paddingHorizontal: 0,
    paddingVertical: 10,
  },
  passwordToggle: {
    alignItems: 'center',
    height: 40,
    justifyContent: 'center',
    marginRight: -8,
    width: 40,
  },
  loginErrorBox: {
    alignItems: 'flex-start',
    backgroundColor: '#FFF1F0',
    borderColor: 'rgba(180,35,24,0.12)',
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 8,
    padding: 11,
  },
  loginErrorText: {
    color: colors.danger,
    flex: 1,
    fontFamily: fontFamily.bold,
    fontSize: 11,
    lineHeight: 16,
  },
  loginButton: {
    alignItems: 'center',
    backgroundColor: colors.rose500,
    borderRadius: 16,
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    minHeight: 54,
    paddingHorizontal: 16,
  },
  loginButtonText: {
    color: colors.white,
    fontFamily: fontFamily.black,
    fontSize: 15,
    textTransform: 'uppercase',
  },
  primaryButton: {
    alignItems: 'center',
    backgroundColor: colors.rose500,
    borderRadius: 14,
    minHeight: 52,
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  primaryButtonText: {
    color: colors.white,
    fontFamily: fontFamily.black,
    fontSize: 15,
    textTransform: 'uppercase',
  },
  previewButton: {
    alignItems: 'center',
    alignSelf: 'center',
    minHeight: 38,
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  previewButtonText: {
    color: colors.rose500,
    fontFamily: fontFamily.black,
    fontSize: 12,
  },
  legalConsent: {
    alignItems: 'center',
    gap: 4,
  },
  legalConsentText: {
    color: colors.muted,
    fontFamily: fontFamily.medium,
    fontSize: 9,
    lineHeight: 14,
    textAlign: 'center',
  },
  legalLinks: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 7,
    justifyContent: 'center',
  },
  legalLinkButton: {
    paddingHorizontal: 2,
    paddingVertical: 3,
  },
  legalLinkText: {
    color: colors.rose500,
    fontFamily: fontFamily.black,
    fontSize: 10,
    textDecorationLine: 'underline',
  },
  legalSeparator: {
    color: colors.muted,
    fontFamily: fontFamily.bold,
    fontSize: 10,
  },
  loginFootnote: {
    color: colors.muted,
    fontFamily: fontFamily.bold,
    fontSize: 10,
    lineHeight: 15,
    textAlign: 'center',
  },
  disabledButton: {
    opacity: 0.45,
  },
  dashboardTopBar: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 22,
    paddingTop: 8,
    paddingBottom: 14,
  },
  kicker: {
    color: colors.inkSoft,
    fontFamily: fontFamily.black,
    fontSize: 13,
  },
  screenTitle: {
    color: colors.ink,
    fontFamily: fontFamily.black,
    fontSize: 28,
  },
  topBarActions: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  connectionPill: {
    alignItems: 'center',
    backgroundColor: colors.mint,
    borderRadius: radii.pill,
    flexDirection: 'row',
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 7,
  },
  connectionPillOffline: {
    backgroundColor: '#FFF1F0',
  },
  connectionPillText: {
    color: colors.success,
    fontFamily: fontFamily.black,
    fontSize: 10,
  },
  connectionPillTextOffline: {
    color: colors.danger,
  },
  roundAction: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 22,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  dashboardHeaderStack: {
    gap: 14,
  },
  quickStatsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  quickStat: {
    backgroundColor: colors.rose100,
    borderRadius: radii.lg,
    flex: 1,
    gap: 5,
    padding: 14,
  },
  quickStatAccent: {
    backgroundColor: colors.cream,
  },
  quickStatValue: {
    color: colors.ink,
    flexShrink: 1,
    fontFamily: fontFamily.black,
    lineHeight: 18,
  },
  quickStatLabel: {
    color: colors.inkSoft,
    fontFamily: fontFamily.bold,
    fontSize: 11,
  },
  addonStrip: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: 'rgba(255,255,255,0.9)',
    borderRadius: radii.md,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  addonText: {
    color: colors.inkSoft,
    flex: 1,
    fontFamily: fontFamily.bold,
    fontSize: 12,
  },
  connectivityNotice: {
    alignItems: 'center',
    backgroundColor: colors.cream,
    borderColor: colors.line,
    borderRadius: radii.md,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 10,
    padding: 12,
  },
  connectivityIcon: {
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: 18,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  connectivityCopy: {
    flex: 1,
  },
  connectivityTitle: {
    color: colors.ink,
    fontFamily: fontFamily.black,
    fontSize: 13,
  },
  connectivityText: {
    color: colors.inkSoft,
    fontFamily: fontFamily.medium,
    fontSize: 11,
    lineHeight: 15,
    marginTop: 2,
  },
  signInAgainButton: {
    backgroundColor: colors.rose500,
    borderRadius: radii.pill,
    paddingHorizontal: 11,
    paddingVertical: 8,
  },
  signInAgainText: {
    color: colors.white,
    fontFamily: fontFamily.black,
    fontSize: 10,
    textTransform: 'uppercase',
  },
  sectionLead: {
    color: colors.ink,
    fontFamily: fontFamily.black,
    fontSize: 20,
    marginTop: 4,
  },
  listContent: {
    gap: 14,
    paddingHorizontal: 22,
    paddingTop: 4,
  },
  tabScrollContent: {
    gap: 18,
    paddingHorizontal: 22,
    paddingTop: 4,
  },
  separator: {
    height: 0,
  },
  detailTopBar: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 14,
  },
  backBubble: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 22,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  detailTitle: {
    color: colors.ink,
    flex: 1,
    fontFamily: fontFamily.black,
    fontSize: 18,
    textAlign: 'center',
  },
  centerState: {
    alignItems: 'center',
    flex: 1,
    gap: 12,
    justifyContent: 'center',
  },
  centerText: {
    color: colors.rose500,
    fontFamily: fontFamily.black,
  },
  detailContent: {
    maxWidth: '100%',
    overflow: 'hidden',
    paddingTop: 4,
  },
  subtitle: {
    color: colors.inkSoft,
    fontFamily: fontFamily.bold,
    fontSize: 13,
    lineHeight: 18,
    textAlign: 'center',
  },
  infoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  infoItem: {
    backgroundColor: colors.surface,
    borderColor: 'rgba(255,255,255,0.9)',
    borderRadius: radii.md,
    borderWidth: 1,
    flexGrow: 1,
    minWidth: '45%',
    padding: 13,
  },
  infoLabel: {
    color: colors.muted,
    fontFamily: fontFamily.black,
    fontSize: 10,
    textTransform: 'uppercase',
  },
  infoValue: {
    color: colors.ink,
    fontFamily: fontFamily.bold,
    fontSize: 14,
    lineHeight: 19,
    marginTop: 5,
  },
  tableStack: {
    gap: 14,
    marginTop: 18,
  },
  timestamp: {
    color: colors.muted,
    fontFamily: fontFamily.bold,
    fontSize: 12,
    marginTop: 10,
    textAlign: 'center',
  },
  floatingNav: {
    alignSelf: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderColor: 'rgba(255,255,255,0.95)',
    borderRadius: 30,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    padding: 9,
    position: 'absolute',
    shadowColor: colors.rose400,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.18,
    shadowRadius: 24,
    elevation: 8,
  },
  navItem: {
    alignItems: 'center',
    borderRadius: 22,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  navItemActive: {
    backgroundColor: colors.rose500,
  },
  actionGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  actionTile: {
    backgroundColor: colors.surface,
    borderColor: 'rgba(255,255,255,0.9)',
    borderRadius: radii.lg,
    borderWidth: 1,
    flex: 1,
    gap: 6,
    padding: 16,
  },
  actionLabel: {
    color: colors.ink,
    fontFamily: fontFamily.black,
    fontSize: 15,
  },
  actionValue: {
    color: colors.inkSoft,
    fontFamily: fontFamily.bold,
    fontSize: 12,
  },
  unofficialBanner: {
    alignItems: 'flex-start',
    backgroundColor: colors.rose100,
    borderColor: colors.line,
    borderRadius: radii.lg,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 12,
    marginBottom: 14,
    padding: 15,
  },
  unofficialBannerIcon: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 18,
    height: 38,
    justifyContent: 'center',
    width: 38,
  },
  unofficialBannerCopy: {
    flex: 1,
    gap: 3,
  },
  unofficialBannerTitle: {
    color: colors.ink,
    fontFamily: fontFamily.black,
    fontSize: 15,
    lineHeight: 20,
  },
  unofficialBannerText: {
    color: colors.inkSoft,
    fontFamily: fontFamily.medium,
    fontSize: 12,
    lineHeight: 17,
  },
  settingsCard: {
    alignItems: 'flex-start',
    backgroundColor: colors.surface,
    borderColor: 'rgba(255,255,255,0.9)',
    borderRadius: radii.xl,
    borderWidth: 1,
    gap: 12,
    padding: 22,
  },
  settingsTitle: {
    color: colors.ink,
    fontFamily: fontFamily.black,
    fontSize: 22,
  },
  settingsText: {
    color: colors.inkSoft,
    fontFamily: fontFamily.regular,
    fontSize: 14,
    lineHeight: 21,
  },
  settingsLegalActions: {
    gap: 10,
    marginTop: 4,
    width: '100%',
  },
  settingsLegalButton: {
    alignItems: 'center',
    backgroundColor: colors.rose50,
    borderColor: colors.line,
    borderRadius: radii.md,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 12,
    minHeight: 60,
    paddingHorizontal: 14,
  },
  settingsLegalIcon: {
    alignItems: 'center',
    backgroundColor: colors.rose100,
    borderRadius: 16,
    height: 34,
    justifyContent: 'center',
    width: 34,
  },
  settingsLegalText: {
    color: colors.ink,
    flex: 1,
    fontFamily: fontFamily.black,
    fontSize: 14,
  },
  settingsLogoutButton: {
    alignItems: 'center',
    backgroundColor: colors.rose500,
    borderRadius: radii.md,
    flexDirection: 'row',
    gap: 9,
    justifyContent: 'center',
    marginTop: 2,
    minHeight: 54,
    width: '100%',
  },
  settingsLogoutText: {
    color: colors.white,
    fontFamily: fontFamily.black,
    fontSize: 14,
    textTransform: 'uppercase',
  },

  cacheBox: {
    alignItems: 'center',
    backgroundColor: colors.cream,
    borderColor: colors.line,
    borderRadius: radii.md,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
    padding: 12,
  },
  cacheText: {
    color: colors.inkSoft,
    flex: 1,
    fontFamily: fontFamily.bold,
    fontSize: 12,
    lineHeight: 17,
  },
  errorPage: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    padding: 28,
  },
  errorPageIcon: {
    alignItems: 'center',
    backgroundColor: '#FFF1F0',
    borderRadius: 34,
    height: 68,
    justifyContent: 'center',
    marginBottom: 16,
    width: 68,
  },
  errorPageTitle: {
    color: colors.ink,
    fontFamily: fontFamily.black,
    fontSize: 24,
    textAlign: 'center',
  },
  errorPageMessage: {
    color: colors.inkSoft,
    fontFamily: fontFamily.medium,
    fontSize: 14,
    lineHeight: 21,
    marginTop: 8,
    textAlign: 'center',
  },
  errorPageActions: {
    gap: 10,
    marginTop: 18,
    minWidth: 220,
  },
  secondaryButton: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.line,
    borderRadius: 14,
    borderWidth: 1,
    minHeight: 48,
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  secondaryButtonText: {
    color: colors.rose500,
    fontFamily: fontFamily.black,
    fontSize: 14,
    textTransform: 'uppercase',
  },
  errorText: {
    color: colors.danger,
    fontFamily: fontFamily.bold,
    fontSize: 13,
    lineHeight: 19,
  },
  noteText: {
    color: colors.inkSoft,
    fontFamily: fontFamily.bold,
    fontSize: 12,
    lineHeight: 17,
  },
  errorBox: {
    backgroundColor: '#FFF1F0',
    borderColor: '#FFCCC7',
    borderRadius: radii.md,
    borderWidth: 1,
    gap: 12,
    marginBottom: 18,
    padding: 14,
  },
});
