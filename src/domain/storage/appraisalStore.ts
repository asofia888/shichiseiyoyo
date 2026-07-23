import { BirthInput } from '../astronomy/types';
import { RuleHit } from '../rules/types';

export interface AppraisalRecord {
  id: string;
  date: string;
  input: BirthInput;
  ruleHits: RuleHit[];
  appraisalText: string | null;
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
