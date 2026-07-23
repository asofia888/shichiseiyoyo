import { SchoolConfig, DEFAULT_SCHOOL_CONFIG, SCHOOL_PRESETS } from '../qizhengsiyu/schoolConfig';

const SCHOOL_CONFIG_STORAGE_KEY = 'qizhengsiyu_school_config';

export function getStoredSchoolConfig(): SchoolConfig {
  if (typeof window === 'undefined') return DEFAULT_SCHOOL_CONFIG;
  try {
    const raw = localStorage.getItem(SCHOOL_CONFIG_STORAGE_KEY);
    if (!raw) return DEFAULT_SCHOOL_CONFIG;
    const parsed = JSON.parse(raw);
    // 旧バージョンで保存された設定には新しい項目(羅計割当・時辰基準など)が存在しない。
    // 一律にデフォルト(伝統古法)で補完すると、例えば現代流派の保存済み設定に宋明式羅計が
    // 混入してしまうため、保存時のプリセット(id)の既定値で補完する(不明ならデフォルト)。
    const baseline = SCHOOL_PRESETS[parsed?.id] ?? DEFAULT_SCHOOL_CONFIG;
    return { ...DEFAULT_SCHOOL_CONFIG, ...baseline, ...parsed };
  } catch (e) {
    console.error('Failed to parse school config from localStorage:', e);
    return DEFAULT_SCHOOL_CONFIG;
  }
}

export function saveStoredSchoolConfig(config: SchoolConfig): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(SCHOOL_CONFIG_STORAGE_KEY, JSON.stringify(config));
  } catch (e) {
    console.error('Failed to save school config to localStorage:', e);
  }
}

export function resetStoredSchoolConfig(): SchoolConfig {
  if (typeof window === 'undefined') return DEFAULT_SCHOOL_CONFIG;
  try {
    localStorage.removeItem(SCHOOL_CONFIG_STORAGE_KEY);
  } catch (e) {
    console.error('Failed to reset school config:', e);
  }
  return DEFAULT_SCHOOL_CONFIG;
}
