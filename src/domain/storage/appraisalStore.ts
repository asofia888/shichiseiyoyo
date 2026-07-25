import { BirthInput } from '../astronomy/types';
import { RuleHit } from '../rules/types';
import { SchoolConfig } from '../qizhengsiyu/schoolConfig';

export interface AppraisalRecord {
  id: string;
  date: string;
  input: BirthInput;
  ruleHits: RuleHit[];
  appraisalText: string | null;
  // 保存時の流派設定。これがないと、後で別の流派設定で開いたときに
  // 同じレコードから違う命盤が出てしまい再現性がなくなる。
  // 旧バージョンで保存されたレコードには存在しない (undefined)。
  schoolConfig?: SchoolConfig;
  // 鑑定文を生成したときに見ていた年。これがないと、2026年に作った鑑定文を
  // 翌年に開いたとき、本文は2026年の流年なのに画面は2027年になってしまう。
  targetYear?: number;
}

const STORAGE_KEY = 'qzsy_appraisals';

export function saveAppraisal(record: Omit<AppraisalRecord, 'id' | 'date'>): AppraisalRecord {
  const appraisals = getAppraisals();
  const newRecord: AppraisalRecord = {
    ...record,
    id: crypto.randomUUID(),
    date: new Date().toISOString(),
  };
  appraisals.unshift(newRecord);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(appraisals));
  return newRecord;
}

export function updateAppraisalText(id: string, text: string): void {
  const appraisals = getAppraisals();
  const index = appraisals.findIndex(a => a.id === id);
  if (index !== -1) {
    appraisals[index].appraisalText = text;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(appraisals));
  }
}

export function getAppraisals(): AppraisalRecord[] {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch (e) {
    console.error("Failed to parse appraisals", e);
    return [];
  }
}

export function deleteAppraisal(id: string) {
  const appraisals = getAppraisals();
  const filtered = appraisals.filter(a => a.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
}
