import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  saveAppraisal, updateAppraisalText, getAppraisals, deleteAppraisal,
  countUnreadableAppraisals, exportAppraisals, importAppraisals, AppraisalRecord,
} from './appraisalStore';

// テストは node 環境で走るので、localStorage を最小限の実装で差し替える
const KEY = 'qzsy_appraisals';
let store: Map<string, string>;
let failWrites = false;

beforeEach(() => {
  store = new Map();
  failWrites = false;
  vi.stubGlobal('localStorage', {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => {
      if (failWrites) throw new DOMException('quota', 'QuotaExceededError');
      store.set(k, v);
    },
    removeItem: (k: string) => { store.delete(k); },
  });
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

const draft = (name = '太郎'): Omit<AppraisalRecord, 'id' | 'date'> => ({
  input: {
    name, birthDate: '1988-08-15', birthTime: '14:30', timeAccuracy: 'exact',
    latitude: 35.66, longitude: 139.74, timezoneOffset: 9,
  },
  ruleHits: [{
    ruleId: 'r_general_asc', title: 't', category: 'nature', evidence: ['e'], interpretation: 'i',
    strength: 3, priority: 5, sourceId: '共通', ruleSetVersion: '2.5.0',
  }],
  appraisalText: null,
});

describe('履歴の保存', () => {
  it('保存・更新・削除ができ、新しいものが先頭に並ぶ', () => {
    const a = saveAppraisal(draft('A'))!;
    const b = saveAppraisal(draft('B'))!;
    expect(getAppraisals().map(r => r.input.name)).toEqual(['B', 'A']);
    expect(updateAppraisalText(a.id, '鑑定文')).toBe(true);
    expect(getAppraisals().find(r => r.id === a.id)!.appraisalText).toBe('鑑定文');
    expect(deleteAppraisal(b.id)).toBe(true);
    expect(getAppraisals().map(r => r.id)).toEqual([a.id]);
  });

  it('保存領域がいっぱいでも例外を投げず、失敗を戻り値で知らせる', () => {
    const a = saveAppraisal(draft())!;
    failWrites = true;
    expect(saveAppraisal(draft())).toBeNull();
    expect(updateAppraisalText(a.id, '鑑定文')).toBe(false);
    expect(deleteAppraisal(a.id)).toBe(false);
    failWrites = false;
    expect(getAppraisals()).toHaveLength(1); // 失敗した操作で中身は変わっていない
    expect(getAppraisals()[0].appraisalText).toBeNull();
  });

  it('存在しないレコードの更新は false', () => {
    expect(updateAppraisalText('none', 'x')).toBe(false);
  });
});

describe('壊れたデータへの耐性', () => {
  it('JSON として読めない・配列でないデータは空の履歴として扱う', () => {
    store.set(KEY, '{broken');
    expect(getAppraisals()).toEqual([]);
    store.set(KEY, '{"a":1}');
    expect(getAppraisals()).toEqual([]);
    store.set(KEY, 'null');
    expect(getAppraisals()).toEqual([]);
  });

  it('形式の壊れたレコードは一覧から外すが、保存領域からは消さない', () => {
    const good = saveAppraisal(draft('良'))!;
    const raw = JSON.parse(store.get(KEY)!);
    raw.push({ id: 'x', date: '2026-01-01', input: null, ruleHits: [], appraisalText: null }); // input が無い
    raw.push('文字列');
    raw.push({ ...good, id: 'y', input: { ...good.input, latitude: '35' } }); // 緯度が数値でない
    store.set(KEY, JSON.stringify(raw));

    expect(getAppraisals().map(r => r.id)).toEqual([good.id]);
    expect(countUnreadableAppraisals()).toBe(3);

    // 別の保存・削除をしても、壊れたレコードは残る
    const added = saveAppraisal(draft('追加'))!;
    deleteAppraisal(added.id);
    expect(JSON.parse(store.get(KEY)!)).toHaveLength(4);
    expect(countUnreadableAppraisals()).toBe(3);
  });

  it('旧バージョンのレコード (流派設定・鑑定年・性別なし) は読める', () => {
    saveAppraisal(draft());
    const [r] = getAppraisals();
    expect(r.schoolConfig).toBeUndefined();
    expect(r.targetYear).toBeUndefined();
  });
});

describe('書き出しと取り込み', () => {
  it('書き出したものを空の状態に取り込むと、同じ履歴に戻る', () => {
    saveAppraisal({ ...draft('A'), appraisalText: '本文', targetYear: 2026 });
    saveAppraisal(draft('B'));
    const before = getAppraisals();
    const file = exportAppraisals();

    store.clear();
    expect(importAppraisals(file)).toEqual({ ok: true, added: 2, duplicates: 0, invalid: 0 });
    expect(getAppraisals()).toEqual(before);
  });

  it('既にあるレコードは上書きせず、形式の合わないものは取り込まない', () => {
    const a = saveAppraisal({ ...draft('A'), appraisalText: '手元の本文' })!;
    const file = JSON.stringify({
      format: 'qzsy-appraisals', version: 1,
      records: [
        { ...a, appraisalText: 'ファイル側の本文' },          // 同じ id
        { ...a, id: 'new-1', date: '2020-01-01T00:00:00.000Z' }, // 新規 (古い日付)
        { id: 'bad' },                                           // 形式不正
      ],
    });
    expect(importAppraisals(file)).toEqual({ ok: true, added: 1, duplicates: 1, invalid: 1 });
    const list = getAppraisals();
    expect(list.map(r => r.id)).toEqual([a.id, 'new-1']); // 保存日時の新しい順
    expect(list[0].appraisalText).toBe('手元の本文');
  });

  it('別物のファイル・壊れたファイルは拒否し、履歴を変えない', () => {
    saveAppraisal(draft());
    const snapshot = store.get(KEY);
    expect(importAppraisals('not json')).toEqual({ ok: false, reason: 'parse' });
    expect(importAppraisals('{"format":"other","records":[]}')).toEqual({ ok: false, reason: 'format' });
    expect(importAppraisals('{"format":"qzsy-appraisals"}')).toEqual({ ok: false, reason: 'format' });
    expect(importAppraisals('null')).toEqual({ ok: false, reason: 'format' });
    expect(store.get(KEY)).toBe(snapshot);
  });

  it('取り込みの書き込みに失敗したら、そのことを返す', () => {
    const file = JSON.stringify([{ ...draft(), id: 'a', date: '2026-01-01T00:00:00.000Z' }]);
    failWrites = true;
    expect(importAppraisals(file)).toEqual({ ok: false, reason: 'write' });
  });
});
