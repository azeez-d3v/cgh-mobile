export type OtaChannel = 'development' | 'production';

export type OtaManifest = {
  schemaVersion: 1;
  id: string;
  channel: OtaChannel;
  platform: 'android';
  targetAppVersion: string;
  bundleVersion: number;
  downloadUrl: string;
  sha256: string;
  size: number;
  mandatory: boolean;
  publishedAt: string;
  releaseNotes: string[];
};

export type OtaPhase =
  | 'disabled'
  | 'idle'
  | 'checking'
  | 'up-to-date'
  | 'available'
  | 'downloading'
  | 'installed'
  | 'error';

export type OtaState = {
  phase: OtaPhase;
  supported: boolean;
  channel: OtaChannel;
  appVersion: string;
  currentBundleVersion: number;
  manifest?: OtaManifest;
  progress: number;
  message?: string;
  lastCheckedAt?: string;
  modalVisible: boolean;
};

export type OtaController = OtaState & {
  checkForUpdate: (manual?: boolean) => Promise<void>;
  installUpdate: () => Promise<void>;
  restartToApply: () => Promise<void>;
  dismissModal: () => void;
};
