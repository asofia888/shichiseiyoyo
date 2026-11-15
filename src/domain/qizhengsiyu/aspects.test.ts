import { describe, it, expect } from 'vitest';
import { getAspect, buildAspectGrid, getAspectsTo, groupByKind } from './aspects';
import { aspectByHouseDiff, aspectBetweenSigns, isLiuHe, HOUSE_ORDER, HOUSE_BRANCHES, isExactAspect, separationDeg, ASPECT_ORB_DEG, buildCanonicalRuleHit } from '../../../api/_lib/rule-texts';
import { CelestialPosition } from '../astronomy/types';

const star = (name: string, longitude: number): CelestialPosition =>
  ({ id: name, name, longitude, latitude: 0, isRetrograde: false });

describe('会合の宮差判定', () => {
  it('宮差ごとの種別が三方四正の定義どおり', () => {
    expect(aspectByHouseDiff(0)).toBe('同宮');
    expect(aspectByHouseDiff(3)).toBe('方照');
    expect(aspectByHouseDiff(9)).toBe('方照');
    expect(aspectByHouseDiff(4)).toBe('三合');
    expect(aspectByHouseDiff(8)).toBe('三合');
    expect(aspectByHouseDiff(6)).toBe('対照');
  });

  it('会合しない宮差は null', () => {
    for (const d of [1, 2, 5, 7, 10, 11]) { // 2宮差(60°)は古法の会合ではない
      expect(aspectByHouseDiff(d), `宮差${d}`).toBeNull();
    }
  });

  it('負の宮差・12以上の宮差も正しく丸める', () => {
    expect(aspectByHouseDiff(-6)).toBe('対照');
    expect(aspectByHouseDiff(-4)).toBe('三合');
    expect(aspectByHouseDiff(16)).toBe('三合');
  });
});

describe('六合 (地支の組)', () => {
  const signOfBranch = (branch: string) =>
    HOUSE_ORDER.findIndex(name => HOUSE_BRANCHES[name] === branch);

  it('子丑・寅亥・卯戌・辰酉・巳申・午未の6組だけが六合になる', () => {
    const pairs = ['子丑', '寅亥', '卯戌', '辰酉', '巳申', '午未'];
    const found: string[] = [];
    for (let a = 0; a < 12; a++) {
      for (let b = a + 1; b < 12; b++) {
        if (isLiuHe(a, b)) found.push(HOUSE_BRANCHES[HOUSE_ORDER[a]] + HOUSE_BRANCHES[HOUSE_ORDER[b]]);
      }
    }
    const normalize = (p: string) => [...p].sort().join('');
    expect(found.map(normalize).sort()).toEqual(pairs.map(normalize).sort());
    for (const p of pairs) {
      expect(isLiuHe(signOfBranch(p[0]), signOfBranch(p[1])), p).toBe(true);
      expect(isLiuHe(signOfBranch(p[1]), signOfBranch(p[0])), `${p} 逆順`).toBe(true);
    }
  });

  it('宮差の会合が無い組 (子丑・卯戌・辰酉・午未) は六合として返る', () => {
    for (const p of ['子丑', '卯戌', '辰酉', '午未']) {
      expect(aspectBetweenSigns(signOfBranch(p[0]), signOfBranch(p[1])), p)
        .toEqual({ kind: '六合', alsoLiuHe: false });
    }
  });

  it('寅亥・巳申は方照を優先し、六合を兼ねることを知らせる', () => {
    for (const p of ['寅亥', '巳申']) {
      expect(aspectBetweenSigns(signOfBranch(p[0]), signOfBranch(p[1])), p)
        .toEqual({ kind: '方照', alsoLiuHe: true });
    }
  });

  it('六合は度数の精密判定をしない', () => {
    expect(isExactAspect('六合', 100, 160)).toBe(false);
  });
});

describe('度数での精密判定', () => {
  it('離角は0〜180°で、向きによらない', () => {
    expect(separationDeg(10, 100)).toBeCloseTo(90, 9);
    expect(separationDeg(100, 10)).toBeCloseTo(90, 9);
    expect(separationDeg(350, 10)).toBeCloseTo(20, 9);
    expect(separationDeg(0, 180)).toBeCloseTo(180, 9);
  });

  it('許容差以内なら「ぴたりと合う」と判定する', () => {
    expect(isExactAspect('同宮', 100, 100 + ASPECT_ORB_DEG - 0.1)).toBe(true);
    expect(isExactAspect('同宮', 100, 100 + ASPECT_ORB_DEG + 0.1)).toBe(false);
    expect(isExactAspect('三合', 100, 220)).toBe(true);   // ちょうど120°
    expect(isExactAspect('三合', 100, 228)).toBe(false);  // 128°はずれすぎ
    expect(isExactAspect('対照', 10, 190)).toBe(true);
  });
});

describe('会合表', () => {
  it('同宮でも度数が離れていれば exact にならない', () => {
    // 同じ天蝎宮(210〜240)だが28°離れている
    const a = getAspect(star('A', 211), star('B', 239))!;
    expect(a.kind).toBe('同宮');
    expect(a.exact).toBe(false);
    expect(a.separation).toBeCloseTo(28, 6);
  });

  it('宮が違えば近い度数でも同宮にならない (宮位ベース)', () => {
    // 239.9°と240.1°は0.2°しか離れていないが天蝎と人馬で宮が違う
    const a = getAspect(star('A', 239.9), star('B', 240.1));
    expect(a).toBeNull();
  });

  it('総当たり表は a<b の一方向のみを返す', () => {
    const grid = buildAspectGrid([star('A', 0), star('B', 120), star('C', 240)]);
    expect(grid).toHaveLength(3); // A-B, A-C, B-C がすべて三合
    expect(grid.every(x => x.kind === '三合')).toBe(true);
  });

  it('ある黄経に対する会合をまとめられる', () => {
    const positions = [star('太陽', 118.9), star('木星', 39.9), star('土星', 242.4), star('紫氣', 235.0)];
    const grouped = groupByKind(getAspectsTo(238.907, positions, '命宮'));
    expect(grouped['三合']).toBe('太陽');
    expect(grouped['対照']).toBe('木星');
    expect(grouped['同宮']).toBe('紫氣');
    expect(grouped['方照']).toBeUndefined(); // 該当なし
    // 土星(人馬=寅)は命宮(天蝎=卯)の隣で、六合の組でもないので会合しない
    expect(grouped['六合']).toBeUndefined();
  });

  it('方照と六合を兼ねる組は、まとめたとき両方に載る', () => {
    // 人馬(寅)の命宮に対し、双魚(亥)の星
    const grouped = groupByKind(getAspectsTo(250, [star('木星', 340)], '命宮'));
    expect(grouped['方照']).toBe('木星');
    expect(grouped['六合']).toBe('木星');
  });
});

describe('会合ルールのAPI検証', () => {
  it('正規の星曜名の並びは通る', () => {
    const hit = buildCanonicalRuleHit('r_ming_gong_aspects', { 三合: '太陽・火星', 対照: '木星' })!;
    expect(hit).not.toBeNull();
    expect(hit.evidence).toContain('命宮と太陽・火星が三合');
    expect(hit.interpretation).toContain('三合');
  });

  it('ホワイトリスト外の星曜名が混ざると全体を拒否する', () => {
    expect(buildCanonicalRuleHit('r_ming_gong_aspects', { 三合: '太陽・偽星' })).toBeNull();
    expect(buildCanonicalRuleHit('r_ming_gong_aspects', { 三合: 'constructor' })).toBeNull();
    expect(buildCanonicalRuleHit('r_ming_gong_aspects', { 三合: '太陽・太陽' })).toBeNull(); // 重複も拒否
    expect(buildCanonicalRuleHit('r_ming_gong_aspects', {})).toBeNull();
  });
});
