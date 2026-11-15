import { describe, it, expect } from 'vitest';
import {
  buildCanonicalRuleHit, getHuaYao, getShenSha, getHouseStrength, STRONG_PERSON_HOUSES, PERSON_HOUSE_NAMES,
} from '../../../api/_lib/rule-texts';
import { RuleEngine } from './engine';
import { AstronomyEngineProvider } from '../astronomy/astronomy-engine-provider';
import { BirthInput } from '../astronomy/types';
import { SCHOOL_PRESETS } from '../qizhengsiyu/schoolConfig';
import { computeFortune } from '../qizhengsiyu/fortune';
import { normalizeRecordSchoolConfig, normalizeSchoolConfig } from '../storage/schoolConfigStore';

describe('化曜 (張果星宗「天干化曜星例」)', () => {
  const starsOf = (stem: string, name: string) => getHuaYao(stem)!.find(h => h.name === name)!.star;

  it('天禄は「甲火乙孛丙属木，丁是金星戊上求。己人太阴庚是水，辛气壬计癸罗」', () => {
    const expected = ['火星', '月孛', '木星', '金星', '土星', '月', '水星', '紫氣', '計都', '羅睺'];
    ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'].forEach((stem, i) => {
      expect(starsOf(stem, '天禄'), stem).toBe(expected[i]);
    });
  });

  it('天暗は「孛木金土月水气计罗火」、天権は「罗火孛木金土月水气计」(年干横取)', () => {
    const stems = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'];
    expect(stems.map(s => starsOf(s, '天暗'))).toEqual(['月孛', '木星', '金星', '土星', '月', '水星', '紫氣', '計都', '羅睺', '火星']);
    expect(stems.map(s => starsOf(s, '天権'))).toEqual(['羅睺', '火星', '月孛', '木星', '金星', '土星', '月', '水星', '紫氣', '計都']);
    expect(stems.map(s => starsOf(s, '天貴'))).toEqual(['月', '水星', '紫氣', '計都', '羅睺', '火星', '月孛', '木星', '金星', '土星']);
  });

  it('甲年は「禄暗福耗荫，贵刑印囚权」が「火孛木金土，月水气计罗」に付き、太陽には付かない', () => {
    const list = getHuaYao('甲')!;
    expect(list.map(h => h.name)).toEqual(['天禄', '天暗', '天福', '天耗', '天蔭', '天貴', '天刑', '天印', '天囚', '天権']);
    expect(list.map(h => h.star)).toEqual(['火星', '月孛', '木星', '金星', '土星', '月', '水星', '紫氣', '計都', '羅睺']);
    expect(new Set(list.map(h => h.star)).size).toBe(10);
    expect(list.map(h => h.star)).not.toContain('太陽');
  });

  it('未知の干は拒否する', () => {
    expect(getHuaYao('子')).toBeNull();
    expect(buildCanonicalRuleHit('r_hua_yao', { stem: 'constructor' })).toBeNull();
    expect(buildCanonicalRuleHit('r_hua_yao', {})).toBeNull();
  });
});

describe('神殺 (張果星宗の歌訣・表)', () => {
  const at = (stem: string, branch: string, name: string) =>
    getShenSha(stem, branch)!.find(s => s.name === name)?.branch;

  it('禄勲「寅卯巳午巳午申酉亥子」・天乙貴人「甲见未，戊庚在丑乙申位。己子丙酉辛居寅，丁亥壬兔巳逢癸」', () => {
    const pairs: [string, string][] = [
      ['甲', '子'], ['乙', '丑'], ['丙', '寅'], ['丁', '卯'], ['戊', '辰'],
      ['己', '巳'], ['庚', '午'], ['辛', '未'], ['壬', '申'], ['癸', '酉'],
    ];
    expect(pairs.map(([s, b]) => at(s, b, '禄勲'))).toEqual(['寅', '卯', '巳', '午', '巳', '午', '申', '酉', '亥', '子']);
    expect(pairs.map(([s, b]) => at(s, b, '天乙貴人'))).toEqual(['未', '申', '酉', '亥', '丑', '子', '丑', '寅', '卯', '巳']);
  });

  it('羊刃は陽干だけ (甲=卯、丙・戊=午、庚=酉、壬=子)', () => {
    expect(at('甲', '子', '羊刃')).toBe('卯');
    expect(at('丙', '寅', '羊刃')).toBe('午');
    expect(at('戊', '辰', '羊刃')).toBe('午');
    expect(at('庚', '午', '羊刃')).toBe('酉');
    expect(at('壬', '申', '羊刃')).toBe('子');
    expect(at('乙', '丑', '羊刃')).toBeUndefined();
  });

  it('駅馬「申子辰人马居寅，寅午戌人马居申，巳酉丑人马在亥，亥卯未人马在巳」・劫殺「巳寅亥申…」', () => {
    const yearOf: Record<string, string> = { 子: '甲', 丑: '乙', 寅: '甲', 卯: '乙', 辰: '甲', 巳: '乙', 午: '甲', 未: '乙', 申: '甲', 酉: '乙', 戌: '甲', 亥: '乙' };
    const branches = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];
    expect(branches.map(b => at(yearOf[b], b, '駅馬'))).toEqual(['寅', '亥', '申', '巳', '寅', '亥', '申', '巳', '寅', '亥', '申', '巳']);
    expect(branches.map(b => at(yearOf[b], b, '劫殺'))).toEqual(['巳', '寅', '亥', '申', '巳', '寅', '亥', '申', '巳', '寅', '亥', '申']);
  });

  it('命宮の宮名があれば人事宮を添え、不正な干支は拒否する', () => {
    // 甲子年・命宮が天蝎(卯): 駅馬は寅=人馬宮で、天蝎の次の宮なので財帛宮
    const hit = buildCanonicalRuleHit('r_shen_sha', { stem: '甲', branch: '子', mingHouseName: '天蝎' })!;
    expect(hit.evidence).toContain('駅馬在寅(人馬)宮=財帛宮');
    expect(hit.evidence).toContain('羊刃在卯(天蝎)宮=命宮');
    const noTime = buildCanonicalRuleHit('r_shen_sha', { stem: '甲', branch: '子' })!;
    expect(noTime.evidence).toContain('駅馬在寅(人馬)宮');
    expect(buildCanonicalRuleHit('r_shen_sha', { stem: '甲', branch: '丑' })).toBeNull(); // 陽干に陰支は組まない
    expect(buildCanonicalRuleHit('r_shen_sha', { stem: '甲', branch: '子', mingHouseName: '偽' })).toBeNull();
  });

  it('流年の太歳が生年の神殺の宮に入る年は、そのことを添える', () => {
    const base = { houseName: '人馬', personHouseName: '財帛宮', yearGanzhi: '壬寅', year: '2022' };
    const hit = buildCanonicalRuleHit('r_liu_nian', { ...base, birthStem: '甲', birthBranch: '子' })!;
    expect(hit.evidence).toContain('生年の禄勲・駅馬の宮に重なる'); // 甲の禄勲=寅、子年の駅馬=寅
    expect(hit.interpretation).toContain('生年の禄勲・駅馬の宮に入る');
    // 生年の干支を送らない旧クライアントも通る
    expect(buildCanonicalRuleHit('r_liu_nian', base)!.interpretation).not.toContain('神殺');
    expect(buildCanonicalRuleHit('r_liu_nian', { ...base, birthStem: '甲' })).toBeNull();
  });
});

describe('強宮・弱宮と木星 (張果星宗「入門看法」「歳星総論」)', () => {
  it('七強宮は命宮・官禄・田宅・妻妾・男女・福徳・財帛、残りの五宮が弱宮', () => {
    expect(STRONG_PERSON_HOUSES).toHaveLength(7);
    const weak = PERSON_HOUSE_NAMES.filter(n => getHouseStrength(n)!.label === '弱宮');
    expect(weak.sort()).toEqual(['兄弟宮', '奴僕宮', '疾厄宮', '相貌宮', '遷移宮'].sort());
    expect(getHouseStrength(undefined)).toBeNull();
  });

  it('木星は強宮に在るときだけ判定し、旧 r_jupiter_angle も古いクライアントのために受け付ける', () => {
    expect(buildCanonicalRuleHit('r_jupiter_strong', { personHouseName: '福徳宮' })!.sourceId).toBe('張果星宗（歳星総論・強弱宮）');
    expect(buildCanonicalRuleHit('r_jupiter_strong', { personHouseName: '遷移宮' })).toBeNull();
    expect(buildCanonicalRuleHit('r_jupiter_strong', {})).toBeNull();
    expect(buildCanonicalRuleHit('r_jupiter_angle')!.sourceId).toBe('通説（典拠未確定）');
  });

  it('基準命盤でエンジンが新しいルールを出し、木星(金牛=妻妾宮)は強宮と判定される', async () => {
    const input: BirthInput = {
      name: 't', birthDate: '1988-08-15', birthTime: '14:30', timeAccuracy: 'exact',
      latitude: 35.6581, longitude: 139.7414, timezoneOffset: 9,
    };
    const config = SCHOOL_PRESETS.traditional;
    const provider = new AstronomyEngineProvider();
    const positions = await provider.calculateBodies(input, config);
    const angles = await provider.calculateAngles(input, config);
    const hits = new RuleEngine().evaluateAll(positions, angles, {
      input, targetYear: 2026, fortuneMethod: config.fortuneMethod, ageReckoning: config.ageReckoning, ziqiOption: config.ziqiOption,
    });
    const ids = hits.map(h => h.ruleId);
    expect(ids).not.toContain('r_jupiter_angle');
    expect(hits.find(h => h.ruleId === 'r_jupiter_strong')!.params).toEqual({ personHouseName: '妻妾宮' });
    expect(hits.find(h => h.ruleId === 'r_hua_yao')!.params).toEqual({ stem: '戊' }); // 1988年=戊辰
    expect(hits.find(h => h.ruleId === 'r_shen_sha')!.params).toEqual({ stem: '戊', branch: '辰', mingHouseName: '天蝎' });
    expect(hits.find(h => h.ruleId === 'r_da_xian')!.params?.ageBasis).toBe('数え年');
    expect(hits.length).toBeLessThanOrEqual(40);
  });
});

describe('年齢の数え方', () => {
  const ASC = 238.907;
  const input = (birthDate: string): BirthInput => ({
    name: 't', birthDate, birthTime: '12:00', timeAccuracy: 'exact', latitude: 35, longitude: 139, timezoneOffset: 9, gender: 'male',
  });

  it('数え年は生まれた年を一歳とし、満年齢より一つ多い', () => {
    const nominal = computeFortune(input('1988-08-15'), ASC, 2026, 'yinyang_decade', 'nominal')!;
    const full = computeFortune(input('1988-08-15'), ASC, 2026, 'yinyang_decade', 'full')!;
    expect(nominal.age).toBe(39);
    expect(full.age).toBe(38);
    expect(computeFortune(input('1988-08-15'), ASC, 1988, 'yinyang_decade', 'nominal')!.age).toBe(1);
  });

  it('立春前の生まれは前年の干支年から数える', () => {
    // 1988-01-20 は立春前なので丁卯(1987)年の生まれ。1988年には数え2歳
    expect(computeFortune(input('1988-01-20'), ASC, 1988, 'yinyang_decade', 'nominal')!.age).toBe(2);
  });

  it('一宮十年: 数え1〜10歳が第1大限、11歳から第2大限', () => {
    const at = (year: number) => computeFortune(input('1988-08-15'), ASC, year, 'yinyang_decade', 'nominal')!.daXian!.index;
    expect(at(1988)).toBe(1); // 1歳
    expect(at(1997)).toBe(1); // 10歳
    expect(at(1998)).toBe(2); // 11歳
  });

  it('果老式: 童限の年数までが命宮で、それを超えた歳から次の宮', () => {
    const f = (year: number) => computeFortune(input('1988-08-15'), ASC, year, 'guolao', 'nominal')!;
    const tong = f(2026).tongXianYears!;
    const lastInMing = Math.floor(tong); // 童限 13.x 年なら数え13歳まで
    expect(f(1988 + lastInMing - 1).daXian!.personHouseName).toBe('命宮');
    expect(f(1988 + lastInMing).daXian!.personHouseName).toBe('相貌宮');
  });

  it('小限は数え一歳を命宮とし、どちらの数え方でも同じ年に同じ宮になる (立春後の生まれ)', () => {
    for (const year of [1988, 1989, 2000, 2026]) {
      const nominal = computeFortune(input('1988-08-15'), ASC, year, 'guolao', 'nominal')!;
      const full = computeFortune(input('1988-08-15'), ASC, year, 'guolao', 'full')!;
      expect(nominal.xiaoXian, String(year)).toEqual(full.xiaoXian);
    }
    expect(computeFortune(input('1988-08-15'), ASC, 1988, 'guolao', 'nominal')!.xiaoXian.personHouseName).toBe('命宮');
  });

  it('数え方を選べるようにする前の履歴は満年齢で、現在の設定は流派の既定で補う', () => {
    expect(normalizeRecordSchoolConfig({ id: 'traditional', fortuneMethod: 'guolao' }).ageReckoning).toBe('full');
    expect(normalizeRecordSchoolConfig({ id: 'traditional', fortuneMethod: 'guolao', ageReckoning: 'nominal' }).ageReckoning).toBe('nominal');
    expect(normalizeSchoolConfig({ id: 'traditional' }).ageReckoning).toBe('nominal');
    expect(normalizeSchoolConfig({ id: 'modern' }).ageReckoning).toBe('full');
  });
});
