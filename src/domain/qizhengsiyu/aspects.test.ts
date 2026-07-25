import { describe, it, expect } from 'vitest';
import { getAspect, buildAspectGrid, getAspectsTo, groupByKind } from './aspects';
import { aspectByHouseDiff, isExactAspect, separationDeg, ASPECT_ORB_DEG, buildCanonicalRuleHit } from '../../../api/_lib/rule-texts';
import { CelestialPosition } from '../astronomy/types';

const star = (name: string, longitude: number): CelestialPosition =>
  ({ id: name, name, longitude, latitude: 0, isRetrograde: false });

describe('会合の宮差判定', () => {
  it('宮差ごとの種別が三方四正の定義どおり', () => {
    expect(aspectByHouseDiff(0)).toBe('同宮');
    expect(aspectByHouseDiff(2)).toBe('六合');
    expect(aspectByHouseDiff(10)).toBe('六合');
    expect(aspectByHouseDiff(3)).toBe('方照');
    expect(aspectByHouseDiff(9)).toBe('方照');
    expect(aspectByHouseDiff(4)).toBe('三合');
    expect(aspectByHouseDiff(8)).toBe('三合');
    expect(aspectByHouseDiff(6)).toBe('対照');
  });

  it('会合しない宮差は null', () => {
    for (const d of [1, 5, 7, 11]) {
      expect(aspectByHouseDiff(d), `宮差${d}`).toBeNull();
    }
  });

  it('負の宮差・12以上の宮差も正しく丸める', () => {
    expect(aspectByHouseDiff(-6)).toBe('対照');
    expect(aspectByHouseDiff(-4)).toBe('三合');
    expect(aspectByHouseDiff(16)).toBe('三合');
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
    // 土星(人馬)は命宮(天蝎)の隣なので会合しない
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
