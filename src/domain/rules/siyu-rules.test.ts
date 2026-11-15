import { describe, it, expect } from 'vitest';
import { RuleEngine } from './engine';
import { AstronomyEngineProvider } from '../astronomy/astronomy-engine-provider';
import { BirthInput } from '../astronomy/types';
import { SCHOOL_PRESETS } from '../qizhengsiyu/schoolConfig';
import { parseAppraisalRequest } from '../../../api/_lib/appraisal-core';
import { buildCanonicalRuleHit, PERSON_HOUSE_NAMES, MANSION_NAMES, HOUSE_BRANCHES } from '../../../api/_lib/rule-texts';

const provider = new AstronomyEngineProvider();
const engine = new RuleEngine();

const GOLDEN_INPUT: BirthInput = {
  name: '基準命盤', birthDate: '1988-08-15', birthTime: '14:30', timeAccuracy: 'exact',
  latitude: 35.6581, longitude: 139.7414, timezoneOffset: 9,
};

async function hitsFor(config = SCHOOL_PRESETS.traditional) {
  const positions = await provider.calculateBodies(GOLDEN_INPUT, config);
  const angles = await provider.calculateAngles(GOLDEN_INPUT, config);
  return engine.evaluateAll(positions, angles, {
    input: GOLDEN_INPUT, fortuneMethod: config.fortuneMethod, ziqiOption: config.ziqiOption,
  });
}

describe('四余の鑑定ルール', () => {
  it('羅睺・計都・月孛が必ず判定される (基準命盤・伝統古法)', async () => {
    const hits = await hitsFor();
    const ids = hits.map(h => h.ruleId);
    expect(ids).toContain('r_rahu_placement');
    expect(ids).toContain('r_ketu_placement');
    expect(ids).toContain('r_yuebei_placement');
  });

  it('旧試験式の紫氣には、位置が試験的な計算であることを判定文に明記する', async () => {
    const hits = await hitsFor({ ...SCHOOL_PRESETS.traditional, ziqiOption: 'cycle_28' });
    const ziqi = hits.find(h => h.ruleId === 'r_ziqi_placement')!;
    expect(ziqi.interpretation).toContain('試験的な計算');
    expect(ziqi.params?.calc).toBeUndefined();
    // 他の四余には付けない
    const rahu = hits.find(h => h.ruleId === 'r_rahu_placement')!;
    expect(rahu.interpretation).not.toContain('試験的');
  });

  it('大統暦法の紫氣には但し書きを付けず、根拠に算法を示す', async () => {
    const hits = await hitsFor(); // 伝統古法の既定は大統暦法
    const ziqi = hits.find(h => h.ruleId === 'r_ziqi_placement')!;
    expect(ziqi.params?.calc).toBe('datong');
    expect(ziqi.interpretation).not.toContain('試験的');
    expect(ziqi.evidence).toContain('紫氣の位置は大統暦法による');
  });

  it('算法の指定は紫氣にだけ許し、未知の値は拒否する', () => {
    const base = { houseName: '獅子', personHouseName: '官禄宮', mansionName: '張' };
    expect(buildCanonicalRuleHit('r_ziqi_placement', { ...base, calc: 'datong' })).not.toBeNull();
    expect(buildCanonicalRuleHit('r_ziqi_placement', { ...base, calc: 'other' })).toBeNull();
    expect(buildCanonicalRuleHit('r_rahu_placement', { ...base, calc: 'datong' })).toBeNull();
  });

  it('紫氣は流派設定で有効なときだけ判定される', async () => {
    const off = await hitsFor({ ...SCHOOL_PRESETS.traditional, ziqiOption: 'none' });
    expect(off.map(h => h.ruleId)).not.toContain('r_ziqi_placement');

    for (const ziqiOption of ['datong', 'cycle_28'] as const) {
      const on = await hitsFor({ ...SCHOOL_PRESETS.traditional, ziqiOption });
      expect(on.map(h => h.ruleId), ziqiOption).toContain('r_ziqi_placement');
    }
  });

  it('根拠に落宮・人事宮・落宿・星宿生剋がそろい、命盤の実値と一致する', async () => {
    const hits = await hitsFor();
    const rahu = hits.find(h => h.ruleId === 'r_rahu_placement')!;
    // 基準命盤: 羅睺 141.44° = 獅子(午)宮 / 命宮は天蝎なので獅子は官禄宮 / 張宿(月=水)
    // 羅睺は火なので、水剋火で「受剋」
    // 官禄宮は強宮 (張果星宗「强宫者，谓命宫、官禄、田宅、妻妾、男女、福德、财帛」)
    expect(rahu.evidence).toEqual([
      '羅睺在午(獅子)宮', '官禄宮', '強宮', '張宿', '張宿(月=水)と羅睺(火)は受剋',
    ]);
    expect(rahu.interpretation).toContain('官禄宮は強宮で、この星は力を得ます。');
    expect(rahu.title).toBe('羅睺が官禄宮に在中（張宿・受剋）');
    expect(rahu.interpretation).toContain('獅子宮（午）の官禄宮');
  });

  it('落宿が解釈文に反映される (根拠に出すだけで終わらない)', async () => {
    const hits = await hitsFor({ ...SCHOOL_PRESETS.traditional, ziqiOption: 'cycle_28' });
    for (const id of ['r_rahu_placement', 'r_ketu_placement', 'r_yuebei_placement', 'r_ziqi_placement']) {
      const hit = hits.find(h => h.ruleId === id)!;
      const mansion = hit.params!.mansionName;
      expect(hit.interpretation, id).toContain(`${mansion}宿に落ちます`);
      // 生剋の結論が文章に現れていること
      expect(hit.interpretation.length, id).toBeGreaterThan(80);
      expect(
        ['気が揃う', '後押し', '流れ出る', '抑えられ', '強引'].some(w => hit.interpretation.includes(w)),
        `${id} に星宿生剋の記述がない`
      ).toBe(true);
    }
  });

  it('四余の意味は典拠未確定の通説であることを、出典欄に明示している', async () => {
    const hits = await hitsFor();
    for (const id of ['r_rahu_placement', 'r_ketu_placement', 'r_yuebei_placement']) {
      expect(hits.find(h => h.ruleId === id)!.sourceId).toContain('通説（四余の意味・五行生剋・典拠未確定）');
    }
  });

  it('命宮に在中する場合は専用の文章になり、優先度が上がる', () => {
    const normal = buildCanonicalRuleHit('r_rahu_placement', {
      houseName: '獅子', personHouseName: '官禄宮', mansionName: '張',
    })!;
    const ming = buildCanonicalRuleHit('r_rahu_placement', {
      houseName: '獅子', personHouseName: '命宮', mansionName: '張',
    })!;
    expect(ming.title).toBe('羅睺が命宮に在中（張宿・受剋）');
    expect(ming.interpretation).toContain('人生の主軸');
    expect(ming.priority).toBeGreaterThan(normal.priority);
    expect(ming.strength).toBeGreaterThan(normal.strength);
  });
});

describe('四余ルールのAPI入力検証', () => {
  it('正規の宮名・人事宮名・宿名の組み合わせはすべて通る', () => {
    for (const personHouseName of PERSON_HOUSE_NAMES) {
      const parsed = parseAppraisalRequest({
        hits: [{ ruleId: 'r_ketu_placement', params: { houseName: '天蝎', personHouseName, mansionName: '氐' } }],
      });
      expect(parsed, personHouseName).not.toBeNull();
    }
    for (const houseName of Object.keys(HOUSE_BRANCHES)) {
      expect(parseAppraisalRequest({
        hits: [{ ruleId: 'r_yuebei_placement', params: { houseName, personHouseName: '命宮', mansionName: '角' } }],
      }), houseName).not.toBeNull();
    }
  });

  it('ホワイトリスト外の人事宮名・宿名・宮名は拒否する', () => {
    const req = (params: Record<string, string>) =>
      parseAppraisalRequest({ hits: [{ ruleId: 'r_rahu_placement', params }] });
    expect(req({ houseName: '獅子', personHouseName: '官禄宮', mansionName: '張' })).not.toBeNull();
    expect(req({ houseName: '偽宮', personHouseName: '官禄宮', mansionName: '張' })).toBeNull();
    expect(req({ houseName: '獅子', personHouseName: '架空宮', mansionName: '張' })).toBeNull();
    expect(req({ houseName: '獅子', personHouseName: '官禄宮', mansionName: '偽宿' })).toBeNull();
    expect(req({ houseName: '獅子', personHouseName: '官禄宮' })).toBeNull(); // 宿名なし
    expect(req({})).toBeNull();
  });

  it('二十八宿の正規名テーブルが28件で命盤の宿名を網羅する', () => {
    expect(MANSION_NAMES).toHaveLength(28);
    expect(new Set(MANSION_NAMES).size).toBe(28);
  });
});
