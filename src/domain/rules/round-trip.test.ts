import { describe, it, expect } from 'vitest';
import { RuleEngine } from './engine';
import { AstronomyEngineProvider } from '../astronomy/astronomy-engine-provider';
import { SCHOOL_PRESETS, FortuneMethod } from '../qizhengsiyu/schoolConfig';
import { BirthInput } from '../astronomy/types';
import { parseAppraisalRequest } from '../../../api/_lib/appraisal-core';

// ルールエンジンが出したRuleHitを、そのままAI鑑定APIの検証に通す往復テスト。
//
// buildCanonicalRuleHit を直接呼ぶ単体テストだけでは zod スキーマ(件数・キー長・値長)を
// すり抜けてしまい、実際のAPIで400になる不具合を見逃す。ここで実経路を通す。

const provider = new AstronomyEngineProvider();
const engine = new RuleEngine();

const base: Omit<BirthInput, 'birthDate' | 'birthTime' | 'gender'> = {
  name: 't', timeAccuracy: 'exact', latitude: 35.6581, longitude: 139.7414, timezoneOffset: 9,
};

async function roundTrip(
  input: BirthInput,
  ziqi: boolean,
  targetYear?: number,
  fortuneMethod: FortuneMethod = SCHOOL_PRESETS.traditional.fortuneMethod
) {
  const config = { ...SCHOOL_PRESETS.traditional, ziqiOption: (ziqi ? 'datong' : 'none') as 'datong' | 'none' };
  const positions = await provider.calculateBodies(input, config);
  const angles = await provider.calculateAngles(input, config);
  const hits = engine.evaluateAll(positions, angles, {
    input, targetYear, fortuneMethod, ageReckoning: config.ageReckoning, ziqiOption: config.ziqiOption,
  });
  const body = {
    hits: hits.map(h => ({ ruleId: h.ruleId, ...(h.params ? { params: h.params } : {}) })),
  };
  return { hits, body, parsed: parseAppraisalRequest(body) };
}

describe('RuleHit → AI鑑定APIの往復', () => {
  it('基準命盤の全RuleHitがAPIの検証を通り、同じ本数が再構成される', async () => {
    const input: BirthInput = { ...base, birthDate: '1988-08-15', birthTime: '14:30', gender: 'male' };
    const { hits, parsed } = await roundTrip(input, true, 2026);
    expect(parsed, 'APIに拒否された').not.toBeNull();
    expect(parsed!).toHaveLength(hits.length);
  });

  it('クライアントの表示とサーバーの再構成が完全に一致する (大限の方式ごと)', async () => {
    const input: BirthInput = { ...base, birthDate: '1988-08-15', birthTime: '14:30', gender: 'male' };
    for (const method of ['guolao', 'yinyang_decade'] as const) {
      const { hits, parsed } = await roundTrip(input, true, 2026, method);
      expect(hits.map(h => h.ruleId), method).toContain('r_da_xian');
      hits.forEach((hit, i) => {
        expect(parsed![i].title, `${method} ${hit.ruleId}`).toBe(hit.title);
        expect(parsed![i].interpretation, `${method} ${hit.ruleId}`).toBe(hit.interpretation);
        expect(parsed![i].evidence, `${method} ${hit.ruleId}`).toEqual(hit.evidence);
        expect(parsed![i].sourceId, `${method} ${hit.ruleId}`).toBe(hit.sourceId);
      });
    }
  });

  it('大限の方式を送らない旧クライアントは一宮十年として再構成する', () => {
    const parsed = parseAppraisalRequest({
      hits: [{
        ruleId: 'r_da_xian',
        params: { houseName: '宝瓶', personHouseName: '田宅宮', direction: '順行', ageRange: '30〜40歳', index: '4' },
      }],
    });
    expect(parsed![0].evidence[0]).toBe('大限は命宮より順行・一宮十年');
    expect(parseAppraisalRequest({
      hits: [{
        ruleId: 'r_da_xian',
        params: { method: 'unknown', houseName: '宝瓶', personHouseName: '田宅宮', direction: '順行', ageRange: '30〜40歳', index: '4' },
      }],
    })).toBeNull();
  });

  it('パラメータのキーは20文字以内、値は80文字以内に収まる', async () => {
    const input: BirthInput = { ...base, birthDate: '1988-08-15', birthTime: '14:30', gender: 'male' };
    const { hits } = await roundTrip(input, true, 2026);
    for (const hit of hits) {
      for (const [key, value] of Object.entries(hit.params ?? {})) {
        expect(key.length, `${hit.ruleId} のキー "${key}"`).toBeLessThanOrEqual(20);
        expect(value.length, `${hit.ruleId} の値 "${value}"`).toBeLessThanOrEqual(80);
      }
    }
  });

  it('広い範囲の命盤・性別・年で常にAPIを通る', async () => {
    for (const year of [1930, 1955, 1971, 1988, 2004, 2021]) {
      for (const [time, gender] of [['04:10', 'male'], ['13:40', 'female'], ['22:20', 'male']] as const) {
        const input: BirthInput = { ...base, birthDate: `${year}-03-11`, birthTime: time, gender };
        const { hits, parsed } = await roundTrip(input, true, 2026);
        expect(parsed, `${year} ${time} ${gender} が拒否された (${hits.length}件)`).not.toBeNull();
      }
    }
  });

  it('性別のない古い履歴レコードでもAPIを通る', async () => {
    const input: BirthInput = { ...base, birthDate: '1975-06-06', birthTime: '09:00' }; // gender なし
    const { parsed } = await roundTrip(input, false, 2026);
    expect(parsed).not.toBeNull();
  });

  it('鑑定年なし(運勢なし)でもAPIを通る', async () => {
    const input: BirthInput = { ...base, birthDate: '1988-08-15', birthTime: '14:30', gender: 'male' };
    const { hits, parsed } = await roundTrip(input, false);
    expect(parsed).not.toBeNull();
    expect(hits.map(h => h.ruleId)).not.toContain('r_da_xian');
  });
});
