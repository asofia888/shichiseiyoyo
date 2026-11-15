import { z } from 'zod';
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

// 履歴として画面に出せる最低限の形。ここを通らないレコードは一覧にも命盤にも渡さない
// (壊れたレコードが1件あるだけで、履歴画面全体が描画時に落ちるのを防ぐ)。
// 旧バージョンのレコードも通るよう、後から足した項目は任意にし、未知の項目はそのまま残す。
const recordSchema = z.looseObject({
  id: z.string().min(1),
  date: z.string().min(1),
  input: z.looseObject({
    name: z.string(),
    birthDate: z.string(),
    birthTime: z.string(),
    timeAccuracy: z.enum(['exact', 'approximate', 'unknown']),
    latitude: z.number().finite(),
    longitude: z.number().finite(),
    timezoneOffset: z.number().finite(),
  }),
  ruleHits: z.array(
    z.looseObject({
      ruleId: z.string(),
      title: z.string(),
      interpretation: z.string(),
      evidence: z.array(z.string()),
      sourceId: z.string(),
    })
  ),
  appraisalText: z.string().nullable(),
  schoolConfig: z.looseObject({}).optional(),
  targetYear: z.number().finite().optional(),
});

function isValidRecord(value: unknown): value is AppraisalRecord {
  return recordSchema.safeParse(value).success;
}

/** 保存領域の中身をそのまま読む。配列でなければ空として扱う */
function readRaw(): unknown[] {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) return [];
    const parsed: unknown = JSON.parse(data);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    console.error('Failed to read appraisals', e);
    return [];
  }
}

/** 書き込む。容量超過や保存の禁止 (プライベートブラウズ等) で失敗したら false */
function writeRaw(records: unknown[]): boolean {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
    return true;
  } catch (e) {
    console.error('Failed to write appraisals', e);
    return false;
  }
}

function newId(): string {
  // randomUUID は http://localhost 以外の非HTTPS環境には無い
  return typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

// 書き込みは readRaw() の配列に対して行う。getAppraisals() の結果を書き戻すと、
// 形式検証で一覧から外しただけのレコードを保存領域からも消してしまう。

/** 保存できなかったら null (呼び出し側が利用者に知らせる) */
export function saveAppraisal(record: Omit<AppraisalRecord, 'id' | 'date'>): AppraisalRecord | null {
  const newRecord: AppraisalRecord = {
    ...record,
    id: newId(),
    date: new Date().toISOString(),
  };
  return writeRaw([newRecord, ...readRaw()]) ? newRecord : null;
}

/** 更新できたら true。レコードが無い・書き込めない場合は false */
export function updateAppraisalText(id: string, text: string): boolean {
  const raw = readRaw();
  const index = raw.findIndex(a => isValidRecord(a) && a.id === id);
  if (index === -1) return false;
  raw[index] = { ...(raw[index] as AppraisalRecord), appraisalText: text };
  return writeRaw(raw);
}

export function getAppraisals(): AppraisalRecord[] {
  return readRaw().filter(isValidRecord);
}

/** 形式が壊れていて一覧に出せないレコードの件数 */
export function countUnreadableAppraisals(): number {
  return readRaw().filter(a => !isValidRecord(a)).length;
}

export function deleteAppraisal(id: string): boolean {
  return writeRaw(readRaw().filter(a => !(isValidRecord(a) && a.id === id)));
}

// ---- 書き出し・取り込み ------------------------------------------------------
// 履歴はこのブラウザの中にしか無いので、機種変更やデータ消去に備えてファイルへ退避できるようにする。

const EXPORT_FORMAT = 'qzsy-appraisals';

/** 履歴をファイル保存用の JSON 文字列にする */
export function exportAppraisals(): string {
  return JSON.stringify(
    { format: EXPORT_FORMAT, version: 1, exportedAt: new Date().toISOString(), records: getAppraisals() },
    null,
    2
  );
}

export type ImportResult =
  | { ok: true; added: number; duplicates: number; invalid: number }
  | { ok: false; reason: 'parse' | 'format' | 'write' };

/**
 * 書き出したファイルの中身を取り込む。既にある id のレコードは上書きせずに飛ばし、
 * 形式の合わないレコードは捨てる。1件も書き込めなければ何も変えない。
 */
export function importAppraisals(json: string): ImportResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    return { ok: false, reason: 'parse' };
  }
  // 書き出し形式 ({format, records}) と、保存領域そのままの配列の両方を受け付ける
  const candidates: unknown = Array.isArray(parsed)
    ? parsed
    : (parsed as { format?: unknown; records?: unknown } | null)?.format === EXPORT_FORMAT
      ? (parsed as { records?: unknown }).records
      : undefined;
  if (!Array.isArray(candidates)) return { ok: false, reason: 'format' };

  const raw = readRaw();
  const existingIds = new Set(raw.filter(isValidRecord).map(a => a.id));
  const toAdd: AppraisalRecord[] = [];
  let duplicates = 0;
  let invalid = 0;
  for (const candidate of candidates) {
    if (!isValidRecord(candidate)) {
      invalid++;
    } else if (existingIds.has(candidate.id)) {
      duplicates++;
    } else {
      existingIds.add(candidate.id);
      toAdd.push(candidate);
    }
  }
  if (toAdd.length > 0) {
    // 保存日時の新しい順に並べ直す (一覧は新しいものが先頭)
    const merged = [...toAdd, ...raw].sort((a, b) => {
      const da = isValidRecord(a) ? a.date : '';
      const db = isValidRecord(b) ? b.date : '';
      return db.localeCompare(da);
    });
    if (!writeRaw(merged)) return { ok: false, reason: 'write' };
  }
  return { ok: true, added: toAdd.length, duplicates, invalid };
}
