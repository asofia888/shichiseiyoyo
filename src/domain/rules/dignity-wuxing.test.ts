import { describe, it, expect } from 'vitest';
import {
  getDignity, oppositeHouse, wuxingRelation, getStarMansionRelation,
  HOUSE_LORDS, EXALTATIONS, HOUSE_ORDER, MANSION_LORDS, SEVEN_GOVERNORS,
  buildCanonicalRuleHit,
} from '../../../api/_lib/rule-texts';
import { SIDEREAL_MANSIONS, getMingZhu, getMingDuZhu } from '../qizhengsiyu/constants';
import { RuleEngine } from './engine';
import { AstronomyEngineProvider } from '../astronomy/astronomy-engine-provider';
import { SCHOOL_PRESETS } from '../qizhengsiyu/schoolConfig';
import { BirthInput } from '../astronomy/types';

describe('二十八宿の七曜配当', () => {
  it('サーバー側の正規表と命盤データの五行が28宿すべてで一致する', () => {
    // api/_lib はサーバー関数として自己完結させるため表を二重に持っている。ここで乖離を防ぐ。
    expect(Object.keys(MANSION_LORDS)).toHaveLength(28);
    for (const m of SIDEREAL_MANSIONS) {
      expect(MANSION_LORDS[m.name], `${m.name}宿`).toBe(m.element);
    }
  });

  it('七曜配当が伝統の並び順で 木金土日月火水 の7周期になる', () => {
    // 配列は黄経順なので、歳差により 参 が 觜 より先行している(乾隆17年の「参前觜後」)。
    // 七曜配当は配列の位置ではなく宿そのものに付くので、伝統の並び順で検証する。
    const traditionalOrder = [
      '角', '亢', '氐', '房', '心', '尾', '箕',
      '斗', '牛', '女', '虚', '危', '室', '壁',
      '奎', '婁', '胃', '昴', '畢', '觜', '参',
      '井', '鬼', '柳', '星', '張', '翼', '軫',
    ];
    const cycle = ['木', '金', '土', '日', '月', '火', '水'];
    traditionalOrder.forEach((name, i) => {
      const m = SIDEREAL_MANSIONS.find(x => x.name === name)!;
      expect(m, `${name}宿がテーブルにない`).toBeDefined();
      expect(m.element, `${name}宿`).toBe(cycle[i % 7]);
    });
    // 配列側では 参 が 觜 に先行していること (歳差の反映) も確認しておく
    const idx = (n: string) => SIDEREAL_MANSIONS.findIndex(m => m.name === n);
    expect(idx('参')).toBeLessThan(idx('觜'));
  });
});

describe('五行の生剋', () => {
  it('相生 (木生火生土生金生水生木) を得生・洩気として判定する', () => {
    expect(wuxingRelation('火', '木')).toBe('得生'); // 木が火を生じる
    expect(wuxingRelation('木', '火')).toBe('洩気'); // 木が火を生じて気が漏れる
    expect(wuxingRelation('水', '金')).toBe('得生');
    expect(wuxingRelation('金', '水')).toBe('洩気');
  });

  it('相剋 (木剋土剋水剋火剋金剋木) を受剋・剋出として判定する', () => {
    expect(wuxingRelation('土', '木')).toBe('受剋'); // 木が土を剋する
    expect(wuxingRelation('木', '土')).toBe('剋出');
    expect(wuxingRelation('火', '水')).toBe('受剋');
    expect(wuxingRelation('水', '火')).toBe('剋出');
  });

  it('同じ五行は比和', () => {
    for (const w of ['木', '火', '土', '金', '水'] as const) {
      expect(wuxingRelation(w, w)).toBe('比和');
    }
  });

  it('日は火・月は水として読み替える', () => {
    // 星宿(日曜=火) に 水星(水) → 水剋火で剋出
    expect(getStarMansionRelation('水星', '星')!.mansionWuxing).toBe('火');
    expect(getStarMansionRelation('水星', '星')!.relation).toBe('剋出');
    // 張宿(月曜=水) に 月(水) → 比和
    expect(getStarMansionRelation('月', '張')!.mansionWuxing).toBe('水');
    expect(getStarMansionRelation('月', '張')!.relation).toBe('比和');
  });

  it('未知の星曜・宿は判定しない', () => {
    expect(getStarMansionRelation('偽星', '角')).toBeNull();
    expect(getStarMansionRelation('太陽', '偽宿')).toBeNull();
    expect(getStarMansionRelation('太陽', 'constructor')).toBeNull();
  });
});

describe('廟旺', () => {
  it('宮主星である宮が廟、その対宮が陥', () => {
    for (const house of HOUSE_ORDER) {
      const lord = HOUSE_LORDS[house];
      expect(getDignity(lord, house), `${lord}/${house}`).toBe('廟');
      // 対宮は陥 (旺・落と重ならない場合)
      const opp = oppositeHouse(house);
      if (EXALTATIONS[lord] !== opp && HOUSE_LORDS[opp] !== lord) {
        expect(getDignity(lord, opp), `${lord}/${opp}`).toBe('陥');
      }
    }
  });

  it('旺宮とその対宮(落)を判定する', () => {
    expect(getDignity('太陽', '白羊')).toBe('旺');
    expect(getDignity('太陽', '天秤')).toBe('落');
    expect(getDignity('月', '金牛')).toBe('旺');
    expect(getDignity('木星', '巨蟹')).toBe('旺');
    expect(getDignity('土星', '天秤')).toBe('旺');
    expect(getDignity('火星', '磨羯')).toBe('旺');
    expect(getDignity('金星', '双魚')).toBe('旺');
  });

  it('水星の双女は廟と旺が重なるが廟を優先する', () => {
    expect(HOUSE_LORDS['双女']).toBe('水星');
    expect(EXALTATIONS['水星']).toBe('双女');
    expect(getDignity('水星', '双女')).toBe('廟');
  });

  it('水星の双魚は陥と落が重なるが陥を優先する', () => {
    // 双魚は双女(廟・旺)の対宮なので、陥と落の両方に当たる
    expect(oppositeHouse('双魚')).toBe('双女');
    expect(getDignity('水星', '双魚')).toBe('陥');
  });

  it('Object.prototype 由来の宮名でも廟旺を誤判定しない', () => {
    for (const evil of ['constructor', '__proto__', 'toString']) {
      expect(getDignity('太陽', evil), evil).toBe('平');
    }
  });

  it('該当しない組み合わせは平', () => {
    expect(getDignity('太陽', '巨蟹')).toBe('平');
    expect(getDignity('土星', '陰陽')).toBe('平');
  });

  it('四余は古典の廟旺表に無いので常に平', () => {
    for (const star of ['羅睺', '計都', '月孛', '紫氣']) {
      for (const house of HOUSE_ORDER) {
        expect(getDignity(star, house), `${star}/${house}`).toBe('平');
      }
    }
  });

  it('七政すべてに廟と旺の宮が定義されている', () => {
    for (const star of SEVEN_GOVERNORS) {
      expect(Object.values(HOUSE_LORDS), star).toContain(star);
      expect(EXALTATIONS[star], star).toBeDefined();
    }
  });
});

describe('命主・命度主', () => {
  it('命主は命宮(十二次)の宮主星', () => {
    expect(getMingZhu(215)).toBe('火星');  // 天蝎(210〜240)の宮主
    expect(getMingZhu(125)).toBe('太陽');  // 獅子
    expect(getMingZhu(95)).toBe('月');     // 巨蟹
    expect(getMingZhu(275)).toBe('土星');  // 磨羯
  });

  it('命度主は命度が落ちる宿の宿主星', () => {
    const jiao = SIDEREAL_MANSIONS.find(m => m.name === '角')!; // 角木蛟 → 木曜
    const r = getMingDuZhu(jiao.startLongitude + 1, 0);
    expect(r.mansionName).toBe('角');
    expect(r.luminary).toBe('木');
    expect(r.star).toBe('木星');

    const fang = SIDEREAL_MANSIONS.find(m => m.name === '房')!; // 房日兎 → 日曜
    expect(getMingDuZhu(fang.startLongitude + 1, 0).star).toBe('太陽');
  });

  it('全28宿で命度主が七政のいずれかに解決する', () => {
    for (const m of SIDEREAL_MANSIONS) {
      const r = getMingDuZhu(m.startLongitude + m.width / 2, 0);
      expect(SEVEN_GOVERNORS, `${m.name}宿`).toContain(r.star);
    }
  });

  it('命主ルールは宮と宮主の対応が食い違うと成立しない', () => {
    // 天蝎の宮主は火星。木星を申告しても通らない
    expect(buildCanonicalRuleHit('r_ming_zhu', {
      houseName: '天蝎', lordName: '木星', lordHouseName: '双魚', lordPersonHouseName: '男女宮',
    })).toBeNull();
    expect(buildCanonicalRuleHit('r_ming_zhu', {
      houseName: '天蝎', lordName: '火星', lordHouseName: '双魚', lordPersonHouseName: '男女宮',
    })).not.toBeNull();
  });

  it('命度主は宿からサーバー側で導出し、クライアントの申告を採用しない', () => {
    const hit = buildCanonicalRuleHit('r_ming_du_zhu', {
      mansionName: '角', // 角木蛟 → 木曜 → 木星
      lordName: '土星',  // 偽の申告。無視されること
      lordHouseName: '人馬', lordPersonHouseName: '命宮', lordMansionName: '箕',
    })!;
    expect(hit).not.toBeNull();
    expect(hit.title).toContain('木星');
    expect(hit.title).not.toContain('土星');
    expect(hit.evidence).toContain('命度主=木星');
    expect(hit.sourceId).toBe('通説（典拠未確定）');
  });

  it('命度主の解釈文にその星の落宮・廟旺・星宿生剋が入る', () => {
    const hit = buildCanonicalRuleHit('r_ming_du_zhu', {
      mansionName: '角',
      lordHouseName: '人馬', lordPersonHouseName: '官禄宮', lordMansionName: '箕',
    })!;
    // 木星は人馬の宮主なので廟
    expect(hit.interpretation).toContain('人馬宮');
    expect(hit.interpretation).toContain('官禄宮');
    expect(hit.interpretation).toContain('箕宿');
    expect(hit.interpretation).toContain('自らが主る宮にあり(廟)');
    expect(hit.evidence).toContain('廟');
  });

  it('命度主は落ち先の情報が欠けると成立しない', () => {
    expect(buildCanonicalRuleHit('r_ming_du_zhu', { mansionName: '角' })).toBeNull();
    expect(buildCanonicalRuleHit('r_ming_du_zhu', {
      mansionName: '角', lordHouseName: '偽宮', lordPersonHouseName: '命宮', lordMansionName: '箕',
    })).toBeNull();
  });
});

describe('基準命盤での判定 (1988-08-15 14:30 JST 東京・伝統古法)', () => {
  const provider = new AstronomyEngineProvider();
  const engine = new RuleEngine();
  const GOLDEN: BirthInput = {
    name: '基準命盤', birthDate: '1988-08-15', birthTime: '14:30', timeAccuracy: 'exact',
    latitude: 35.6581, longitude: 139.7414, timezoneOffset: 9,
  };

  it('命主=火星(天蝎宮の宮主)、命度主=火星(尾宿=火曜)', async () => {
    const angles = await provider.calculateAngles(GOLDEN, SCHOOL_PRESETS.traditional);
    expect(getMingZhu(angles.ascendant)).toBe('火星');
    const du = getMingDuZhu(angles.ascendant, angles.mansionOffset);
    expect(du.mansionName).toBe('尾');
    expect(du.luminary).toBe('火');
    expect(du.star).toBe('火星');
  });

  it('七政7件すべてに廟旺と星宿生剋が付く', async () => {
    const positions = await provider.calculateBodies(GOLDEN, SCHOOL_PRESETS.traditional);
    const angles = await provider.calculateAngles(GOLDEN, SCHOOL_PRESETS.traditional);
    const hits = engine.evaluateAll(positions, angles);
    const stars = hits.filter(h => h.ruleId === 'r_star_placement');
    expect(stars).toHaveLength(7);
    for (const h of stars) {
      expect(h.evidence.some(e => /廟|旺|陥|落|平/.test(e)), h.title).toBe(true);
      expect(h.evidence.some(e => /比和|得生|洩気|受剋|剋出/.test(e)), h.title).toBe(true);
    }
  });

  it('RuleHit件数がAI鑑定APIの上限(30件)を超えない', async () => {
    // 紫氣あり・運勢ありの最大構成でも上限内に収まること
    const config = { ...SCHOOL_PRESETS.traditional, ziqiOption: 'cycle_28' as const };
    const positions = await provider.calculateBodies(GOLDEN, config);
    const angles = await provider.calculateAngles(GOLDEN, config);
    const hits = engine.evaluateAll(positions, angles, { input: { ...GOLDEN, gender: 'male' }, targetYear: 2026 });
    expect(hits.length).toBeLessThanOrEqual(30);
    expect(hits.length).toBeGreaterThanOrEqual(13); // 七政7 + 四余4 + 命主 + 命度主 + 命宮
  });

  it('あらゆる命盤でRuleHit件数が上限(30件)を超えない', async () => {
    // 格局が最大まで成立する命盤でも超えないことを、広い範囲を走査して確かめる
    const config = { ...SCHOOL_PRESETS.traditional, ziqiOption: 'cycle_28' as const };
    let worst = 0;
    for (let year = 1930; year <= 2030; year += 7) {
      for (const [m, d, t] of [[2, 10, '04:00'], [6, 21, '13:00'], [11, 5, '21:00']] as const) {
        const bi: BirthInput = {
          ...GOLDEN, gender: 'female',
          birthDate: `${year}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`,
          birthTime: t,
        };
        const positions = await provider.calculateBodies(bi, config);
        const angles = await provider.calculateAngles(bi, config);
        const hits = engine.evaluateAll(positions, angles, { input: bi, targetYear: 2026 });
        worst = Math.max(worst, hits.length);
      }
    }
    expect(worst, `最大 ${worst} 件`).toBeLessThanOrEqual(30);
  });

  it('鑑定年を渡さなければ大限・流年は判定されない', async () => {
    const positions = await provider.calculateBodies(GOLDEN, SCHOOL_PRESETS.traditional);
    const angles = await provider.calculateAngles(GOLDEN, SCHOOL_PRESETS.traditional);
    const ids = engine.evaluateAll(positions, angles).map(h => h.ruleId);
    expect(ids).not.toContain('r_da_xian');
    expect(ids).not.toContain('r_liu_nian');
  });
});
