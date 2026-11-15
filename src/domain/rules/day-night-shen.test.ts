import { describe, it, expect } from 'vitest';
import { RuleEngine } from './engine';
import { AstronomyEngineProvider } from '../astronomy/astronomy-engine-provider';
import { BirthInput } from '../astronomy/types';
import { SCHOOL_PRESETS } from '../qizhengsiyu/schoolConfig';
import { buildCanonicalRuleHit, getEnNanStars } from '../../../api/_lib/rule-texts';
import { parseAppraisalRequest } from '../../../api/_lib/appraisal-core';

const provider = new AstronomyEngineProvider();
const engine = new RuleEngine();
const config = SCHOOL_PRESETS.traditional;

const tokyo = (birthDate: string, birthTime: string, timeAccuracy: BirthInput['timeAccuracy'] = 'exact'): BirthInput => ({
  name: 't', birthDate, birthTime, timeAccuracy,
  latitude: 35.6581, longitude: 139.7414, timezoneOffset: 9,
});

async function evaluate(input: BirthInput) {
  const positions = await provider.calculateBodies(input, config);
  const angles = await provider.calculateAngles(input, config);
  const hits = engine.evaluateAll(positions, angles, { input, fortuneMethod: config.fortuneMethod });
  return { positions, angles, hits };
}

describe('昼夜の判定', () => {
  it('東京の夏至の日: 正午は昼、真夜中は夜', async () => {
    expect((await provider.calculateAngles(tokyo('2000-06-21', '12:00'), config)).isDaytime).toBe(true);
    expect((await provider.calculateAngles(tokyo('2000-06-21', '00:30'), config)).isDaytime).toBe(false);
  });

  it('日の出・日の入りの前後で切り替わる (東京 2000-06-21: 日の出4:26・日の入り19:00 JST)', async () => {
    // 日の出・日の入りの時刻は記憶による概算 (出典未照合)。前後10分で判定が分かれることを確かめる
    expect((await provider.calculateAngles(tokyo('2000-06-21', '04:16'), config)).isDaytime).toBe(false);
    expect((await provider.calculateAngles(tokyo('2000-06-21', '04:36'), config)).isDaytime).toBe(true);
    expect((await provider.calculateAngles(tokyo('2000-06-21', '18:50'), config)).isDaytime).toBe(true);
    expect((await provider.calculateAngles(tokyo('2000-06-21', '19:10'), config)).isDaytime).toBe(false);
  });

  it('昼生は火星・羅睺、夜生は土星・計都を忌星とする (張果星宗「昼生忌火罗，夜生忌土计」)', async () => {
    const day = (await evaluate(tokyo('1988-08-15', '14:30'))).hits.find(h => h.ruleId === 'r_day_night')!;
    expect(day.title).toBe('昼生（太陽に従う）・忌星は火星と羅睺');
    expect(day.params?.sect).toBe('昼生');
    const night = (await evaluate(tokyo('1988-08-15', '23:30'))).hits.find(h => h.ruleId === 'r_day_night')!;
    expect(night.title).toBe('夜生（月に従う）・忌星は土星と計都');
  });

  it('不正な昼夜・人事宮は拒否する', () => {
    expect(buildCanonicalRuleHit('r_day_night', { sect: '昼生' })).not.toBeNull();
    expect(buildCanonicalRuleHit('r_day_night', { sect: '朝生' })).toBeNull();
    expect(buildCanonicalRuleHit('r_day_night', { sect: 'constructor' })).toBeNull();
    expect(buildCanonicalRuleHit('r_day_night', { sect: '夜生', avoid1House: '偽宮' })).toBeNull();
  });
});

describe('恩星と難星', () => {
  it('翼宿(火)の命度では水星・月孛が難星 (張果星宗「命坐翼度，火为主…水孛乃我之仇星」)', () => {
    const found = getEnNanStars('翼')!;
    expect(found.lordWuxing).toBe('火');
    expect(found.nan).toEqual(['水星', '月孛']);
    expect(found.en).toEqual(['木星', '紫氣']); // 木生火
    expect(found.zi).toEqual(['土星', '計都']); // 火生土
  });

  it('五行すべてで、恩星は生じる側・難星は剋する側になる', () => {
    // 角=木, 尾=火, 氐=土, 亢=金, 箕=水
    expect(getEnNanStars('角')).toMatchObject({ en: ['水星', '月孛'], nan: ['金星'] });
    expect(getEnNanStars('氐')).toMatchObject({ en: ['火星', '羅睺'], nan: ['木星', '紫氣'] });
    expect(getEnNanStars('亢')).toMatchObject({ en: ['土星', '計都'], nan: ['火星', '羅睺'] });
    expect(getEnNanStars('箕')).toMatchObject({ en: ['金星'], nan: ['土星', '計都'] });
  });

  it('日曜・月曜の宿は火・水として扱い、太陽と月は恩難に数えない', () => {
    expect(getEnNanStars('房')).toMatchObject({ lordWuxing: '火', nan: ['水星', '月孛'] });
    expect(getEnNanStars('心')).toMatchObject({ lordWuxing: '水', nan: ['土星', '計都'] });
    for (const mansion of ['房', '心', '角', '氐', '亢', '箕', '尾']) {
      const f = getEnNanStars(mansion)!;
      expect([...f.en, ...f.nan, ...f.zi]).not.toContain('太陽');
      expect([...f.en, ...f.nan, ...f.zi]).not.toContain('月');
    }
  });

  it('未知の宿名は拒否する', () => {
    expect(getEnNanStars('constructor')).toBeNull();
    expect(buildCanonicalRuleHit('r_en_nan', { mansionName: '偽' })).toBeNull();
    expect(buildCanonicalRuleHit('r_en_nan', {})).toBeNull();
  });
});

describe('身主と身宮', () => {
  it('身宮は月の在る宮、身度主は月の宿の宿主 (基準命盤: 月は獅子宮・張宿=月曜)', async () => {
    const { hits } = await evaluate(tokyo('1988-08-15', '14:30'));
    const shen = hits.find(h => h.ruleId === 'r_shen')!;
    expect(shen.params).toMatchObject({ houseName: '獅子', mansionName: '張' });
    expect(shen.title).toContain('身宮は獅子宮');
    expect(shen.title).toContain('身度主は月');
    expect(shen.evidence).toContain('月在午(獅子)宮=身宮');
  });

  it('時刻不明では昼夜・恩難を出さず、身主は人事宮なしで出す (月の位置が確定する日)', async () => {
    // 基準日の月は一日じゅう獅子宮・張宿に在る
    const input = tokyo('1988-08-15', '12:00', 'unknown');
    const positions = await provider.calculateBodies(input, config);
    const angles = await provider.calculateAngles(input, config);
    const hits = engine.evaluateAll(positions, angles, { input, fortuneMethod: config.fortuneMethod, uncertainBodyIds: [] });
    const ids = hits.map(h => h.ruleId);
    expect(ids).not.toContain('r_day_night');
    expect(ids).not.toContain('r_en_nan');
    const shen = hits.find(h => h.ruleId === 'r_shen')!;
    expect(shen.params?.personHouseName).toBeUndefined();

    // 月の位置が確定しない日は身主も出さない
    const uncertain = engine.evaluateAll(positions, angles, { input, fortuneMethod: config.fortuneMethod, uncertainBodyIds: ['Moon'] });
    expect(uncertain.map(h => h.ruleId)).not.toContain('r_shen');
  });

  it('新しい3ルールがAPIの検証を通り、表示と同じ文面に再構成される', async () => {
    const { hits } = await evaluate(tokyo('1988-08-15', '14:30'));
    const added = hits.filter(h => ['r_day_night', 'r_en_nan', 'r_shen'].includes(h.ruleId));
    expect(added).toHaveLength(3);
    const parsed = parseAppraisalRequest({ hits: added.map(h => ({ ruleId: h.ruleId, params: h.params })) })!;
    added.forEach((hit, i) => {
      expect(parsed[i].title).toBe(hit.title);
      expect(parsed[i].interpretation).toBe(hit.interpretation);
    });
  });
});
