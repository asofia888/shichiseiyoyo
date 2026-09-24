import { describe, it, expect } from 'vitest';
import { AstronomyEngineProvider } from '../astronomy/astronomy-engine-provider';
import { BirthInput } from '../astronomy/types';
import { SCHOOL_PRESETS } from './schoolConfig';
import { findDayUncertainBodies, describeDayUncertainBody, isBirthTimeUnknown, UNKNOWN_BIRTH_TIME } from './birth-time';
import { RuleEngine } from '../rules/engine';
import { MVP_RULES } from '../rules/rule-sets/mvp-rules';
import { parseAppraisalRequest } from '../../../api/_lib/appraisal-core';
import { PERSON_HOUSE_NAMES } from '../../../api/_lib/rule-texts';

const provider = new AstronomyEngineProvider();
const engine = new RuleEngine();
const config = SCHOOL_PRESETS.traditional;

const unknownTime = (birthDate: string): BirthInput => ({
  name: 't', birthDate, birthTime: UNKNOWN_BIRTH_TIME, timeAccuracy: 'unknown',
  latitude: 35.6581, longitude: 139.7414, timezoneOffset: 9, gender: 'male',
});

async function evaluate(input: BirthInput) {
  const positions = await provider.calculateBodies(input, config);
  const angles = await provider.calculateAngles(input, config);
  const uncertain = isBirthTimeUnknown(input) ? await findDayUncertainBodies(provider, input, config) : [];
  const hits = engine.evaluateAll(positions, angles, {
    input, targetYear: 2026, fortuneMethod: config.fortuneMethod, uncertainBodyIds: uncertain.map(b => b.id),
  });
  return { hits, uncertain };
}

describe('出生時刻が不明な命盤', () => {
  it('その日のうちに十二次・宿が変わる星曜を見つける (1990-01-03 JST は月が宝瓶宮から双魚宮へ)', async () => {
    const uncertain = await findDayUncertainBodies(provider, unknownTime('1990-01-03'), config);
    expect(uncertain.map(b => b.id)).toEqual(['Moon']);
    expect(uncertain[0].houses).toEqual(['宝瓶', '双魚']);
    expect(uncertain[0].mansions).toEqual(['危', '室']);
    expect(describeDayUncertainBody(uncertain[0])).toBe('月は出生日のうちに宝瓶宮から双魚宮へ、危宿から室宿へ移ります');
  });

  it('一日を通して十二次・宿が変わらない日は何も返さない (1990-01-02 JST)', async () => {
    expect(await findDayUncertainBodies(provider, unknownTime('1990-01-02'), config)).toEqual([]);
  });

  it('命宮から導く判定 (命主・命度主・大限・流年・命宮の会合など) を出さない', async () => {
    const { hits } = await evaluate(unknownTime('1990-01-02'));
    const timeDependent = MVP_RULES.filter(r => r.requiresBirthTime).map(r => r.id);
    expect(timeDependent).toEqual(expect.arrayContaining(['r_ming_zhu', 'r_ming_du_zhu', 'r_da_xian', 'r_liu_nian']));
    for (const hit of hits) {
      expect(timeDependent, hit.ruleId).not.toContain(hit.ruleId);
    }
    // 星曜の落宮は日付で決まるので出す
    expect(hits.filter(h => h.ruleId === 'r_star_placement')).toHaveLength(7);
  });

  it('落宮の判定に人事宮 (命宮から数える宮) を付けない', async () => {
    const { hits } = await evaluate(unknownTime('1990-01-02'));
    for (const hit of hits) {
      expect(hit.params?.personHouseName, hit.title).toBeUndefined();
      for (const e of hit.evidence) expect(PERSON_HOUSE_NAMES, `${hit.title}: ${e}`).not.toContain(e);
    }
  });

  it('その日のうちに位置が変わる星曜は落宮の判定から外す', async () => {
    const { hits } = await evaluate(unknownTime('1990-01-03'));
    const stars = hits.filter(h => h.ruleId === 'r_star_placement').map(h => h.params?.starName);
    expect(stars).not.toContain('月');
    expect(stars).toHaveLength(6);
    expect(hits.map(h => h.ruleId)).not.toContain('r_geju_sun_moon_same');
  });

  it('判定結果はAI鑑定APIの検証を通り、表示とサーバーの再構成が一致する', async () => {
    for (const date of ['1990-01-02', '1990-01-03']) {
      const { hits } = await evaluate(unknownTime(date));
      const parsed = parseAppraisalRequest({
        hits: hits.map(h => ({ ruleId: h.ruleId, ...(h.params ? { params: h.params } : {}) })),
      });
      expect(parsed, date).not.toBeNull();
      hits.forEach((hit, i) => {
        expect(parsed![i].title, hit.ruleId).toBe(hit.title);
        expect(parsed![i].interpretation, hit.ruleId).toBe(hit.interpretation);
        expect(parsed![i].evidence, hit.ruleId).toEqual(hit.evidence);
      });
    }
  });

  it('人事宮を送る場合は、これまでどおりホワイトリストで検証する', () => {
    const params = { starName: '太陽', houseName: '獅子', mansionName: '星' };
    expect(parseAppraisalRequest({ hits: [{ ruleId: 'r_star_placement', params }] })).not.toBeNull();
    expect(parseAppraisalRequest({
      hits: [{ ruleId: 'r_star_placement', params: { ...params, personHouseName: '無効な宮' } }],
    })).toBeNull();
    expect(parseAppraisalRequest({
      hits: [{ ruleId: 'r_rahu_placement', params: { houseName: '獅子', mansionName: '星', personHouseName: 'constructor' } }],
    })).toBeNull();
  });

  it('時刻が分かっている命盤では、これまでどおり命宮から導く判定を出す', async () => {
    const { hits, uncertain } = await evaluate({ ...unknownTime('1990-01-03'), birthTime: '14:30', timeAccuracy: 'exact' });
    expect(uncertain).toEqual([]);
    expect(hits.map(h => h.ruleId)).toEqual(expect.arrayContaining(['r_ming_zhu', 'r_da_xian']));
    expect(hits.filter(h => h.ruleId === 'r_star_placement').every(h => !!h.params?.personHouseName)).toBe(true);
  });
});
