import AsyncStorage from '@react-native-async-storage/async-storage';
import type { PortalModuleData, PortalModuleKey, StudentSummary } from '../types';

// Bump the schema whenever parser field alignment changes so stale malformed
// records are never shown after an app update.
const STUDENT_KEY = 'cgh.cache.student.v2';
const MODULE_PREFIX = 'cgh.cache.module.v2.';
const LEGACY_PREFIXES = ['cgh.cache.student.v1', 'cgh.cache.module.v1.'];

export async function cacheStudent(student: StudentSummary) {
  await safeSet(STUDENT_KEY, student);
}

export async function getCachedStudent() {
  return safeGet<StudentSummary>(STUDENT_KEY);
}

export async function cacheModule(data: PortalModuleData) {
  await safeSet(`${MODULE_PREFIX}${data.key}`, { ...data, fromCache: false, cacheReason: undefined });
}

export async function getCachedModule(key: PortalModuleKey) {
  return safeGet<PortalModuleData>(`${MODULE_PREFIX}${key}`);
}

export async function clearPortalCache() {
  const keys = await AsyncStorage.getAllKeys();
  await AsyncStorage.multiRemove(
    keys.filter((key) => key === STUDENT_KEY || key.startsWith(MODULE_PREFIX) || LEGACY_PREFIXES.some((prefix) => key === prefix || key.startsWith(prefix))),
  );
}

async function safeSet(key: string, value: unknown) {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Cache failures should never block live portal usage.
  }
}

async function safeGet<T>(key: string): Promise<T | undefined> {
  try {
    const raw = await AsyncStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : undefined;
  } catch {
    return undefined;
  }
}
