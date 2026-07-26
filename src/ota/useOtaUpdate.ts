import { useCallback, useEffect, useRef, useState } from 'react';
import {
  checkForOtaUpdate,
  installOtaUpdate,
  isOtaSupported,
  nativeAppVersion,
  otaChannel,
  readLastOtaCheck,
  restartWithInstalledUpdate,
} from './otaService';
import type { OtaController, OtaState } from './types';

const initialSupported = isOtaSupported();

const INITIAL_STATE: OtaState = {
  phase: initialSupported ? 'idle' : 'disabled',
  supported: initialSupported,
  channel: otaChannel(),
  appVersion: nativeAppVersion(),
  currentBundleVersion: 0,
  progress: 0,
  modalVisible: false,
};

export function useOtaUpdate(): OtaController {
  const [state, setState] = useState<OtaState>(INITIAL_STATE);
  const checkingRef = useRef(false);
  const mountedRef = useRef(true);

  const checkForUpdate = useCallback(async (manual = false) => {
    if (!initialSupported || checkingRef.current) {
      if (manual && !initialSupported) {
        setState((current) => ({
          ...current,
          phase: 'disabled',
          message: 'Hot updates are checked by installed Android builds. Development preview remains unchanged.',
        }));
      }
      return;
    }

    checkingRef.current = true;
    setState((current) => ({
      ...current,
      phase: 'checking',
      message: undefined,
      modalVisible: false,
    }));

    try {
      const result = await checkForOtaUpdate();
      if (!mountedRef.current) return;
      setState((current) => ({
        ...current,
        phase: result.available ? 'available' : 'up-to-date',
        manifest: result.manifest,
        currentBundleVersion: result.currentBundleVersion,
        lastCheckedAt: result.checkedAt,
        message: result.available ? undefined : 'You have the latest app update.',
        modalVisible: result.available,
      }));
    } catch (error) {
      if (!mountedRef.current) return;
      setState((current) => ({
        ...current,
        phase: 'error',
        message: error instanceof Error ? error.message : 'Unable to check for updates.',
        modalVisible: manual,
      }));
    } finally {
      checkingRef.current = false;
    }
  }, []);

  const installUpdate = useCallback(async () => {
    const manifest = state.manifest;
    if (!manifest || state.phase === 'downloading') return;

    setState((current) => ({
      ...current,
      phase: 'downloading',
      progress: 0,
      message: undefined,
      modalVisible: true,
    }));

    try {
      await installOtaUpdate(manifest, (progress) => {
        if (!mountedRef.current) return;
        setState((current) => ({ ...current, progress }));
      });
      if (!mountedRef.current) return;
      setState((current) => ({
        ...current,
        phase: 'installed',
        currentBundleVersion: manifest.bundleVersion,
        progress: 1,
        message: 'The verified update is ready. Restart to apply it.',
        modalVisible: true,
      }));
    } catch (error) {
      if (!mountedRef.current) return;
      setState((current) => ({
        ...current,
        phase: 'error',
        message: error instanceof Error ? error.message : 'Unable to install the update.',
        modalVisible: true,
      }));
    }
  }, [state.manifest, state.phase]);

  const restartToApply = useCallback(async () => {
    try {
      await restartWithInstalledUpdate();
    } catch (error) {
      setState((current) => ({
        ...current,
        phase: 'error',
        message: error instanceof Error ? error.message : 'Unable to restart the app.',
        modalVisible: true,
      }));
    }
  }, []);

  const dismissModal = useCallback(() => {
    if (state.phase === 'downloading' || (state.manifest?.mandatory && state.phase !== 'error')) return;
    setState((current) => ({ ...current, modalVisible: false }));
  }, [state.manifest?.mandatory, state.phase]);

  useEffect(() => {
    mountedRef.current = true;
    if (!initialSupported) return () => {
      mountedRef.current = false;
    };

    void readLastOtaCheck().then((last) => {
      if (!mountedRef.current || !last) return;
      setState((current) => ({
        ...current,
        lastCheckedAt: last.checkedAt,
        currentBundleVersion: last.currentBundleVersion ?? current.currentBundleVersion,
      }));
    });

    const timer = setTimeout(() => {
      void checkForUpdate(false);
    }, 2_500);

    return () => {
      mountedRef.current = false;
      clearTimeout(timer);
    };
  }, [checkForUpdate]);

  return {
    ...state,
    checkForUpdate,
    installUpdate,
    restartToApply,
    dismissModal,
  };
}
