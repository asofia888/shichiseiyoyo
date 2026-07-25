import { SchoolConfig, DEFAULT_SCHOOL_CONFIG, SCHOOL_PRESETS } from '../qizhengsiyu/schoolConfig';

const SCHOOL_CONFIG_STORAGE_KEY = 'qizhengsiyu_school_config';

// 旧バージョンで保存された設定には新しい項目(羅計割当・時辰基準など)が存在しない。
// 一律にデフォルト(伝統古法)で補完すると、例えば現代流派の保存済み設定に宋明式羅計が
// 混入してしまうため、保存時のプリセット(id)の既定値で補完する(不明ならデフォルト)。
// 鑑定履歴に保存された流派設定にも同じ補完が要るので関数として切り出す。
export function normalizeSchoolConfig(parsed: Partial<SchoolConfig> | null | undefined): SchoolConfig {
  if (!parsed) return DEFAULT_SCHOOL_CONFIG;
  const baseline = (parsed.id && SCHOOL_PRESETS[parsed.id]) || DEFAULT_SCHOOL_CONFIG;
  return { ...DEFAULT_SCHOOL_CONFIG, ...baseline, ...parsed };
}

// 命盤の計算結果を左右する項目。表示用の id / name / description は含めない。
const CALCULATION_KEYS: (keyof SchoolConfig)[] = [
  'zodiacSystem', 'ayanamshaValue', 'nodeCalc', 'apogeeCalc',
  'ziqiOption', 'mingGongMethod', 'rahuKetuAssignment', 'shichenBasis',
];

/** 2つの流派設定が同じ命盤を生むか。id が同じ 'custom' でも中身が違えば false になる。 */
export function isSameCalculation(a: SchoolConfig, b: SchoolConfig): boolean {
  return CALCULATION_KEYS.every(key => a[key] === b[key]);
}

export function getStoredSchoolConfig(): SchoolConfig {
  if (typeof window === 'undefined') return DEFAULT_SCHOOL_CONFIG;
  try {
    const raw = localStorage.getItem(SCHOOL_CONFIG_STORAGE_KEY);
    if (!raw) return DEFAULT_SCHOOL_CONFIG;
    return normalizeSchoolConfig(JSON.parse(raw));
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
