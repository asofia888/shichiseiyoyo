import { describe, it, expect } from 'vitest';
import { AstronomyEngineProvider } from './astronomy-engine-provider';
import { BirthInput } from './types';
import { SCHOOL_PRESETS } from '../qizhengsiyu/schoolConfig';
import { getMansionAtLongitude, MVP_HOUSES } from '../qizhengsiyu/constants';

// ゴールデンテスト (システム設計書 §11)
// 基準命盤の計算結果を固定値と照合し、計算ロジックの意図しない変化(回帰)を検出する。
// 基準値は 2026-07-22 時点の検証済み実装から採取した回帰基準。採取時の検証内容:
// - 天体黄経: astronomy-engine の実測値 − Lahiriアヤナムシャ(既知値と照合済み)
// - 羅睺=降交点(宋明式)・月孛=遠地点+180°修正・安命法の方向修正を反映
// 意図して計算方式を変更した場合は、変更根拠と共にこの基準値を更新すること。

const provider = new AstronomyEngineProvider();

const GOLDEN_INPUT: BirthInput = {
  name: '基準命盤', birthDate: '1988-08-15', birthTime: '14:30', timeAccuracy: 'exact',
  latitude: 35.6581, longitude: 139.7414, timezoneOffset: 9,
};

// 1988-08-15 14:30 JST 東京 (伝統古法プリセット: Lahiri恒星黄道・宋明式羅計・真太陽時・平均交点/遠地点)
const GOLDEN = {
  ascendant: 238.9074,
  midheaven: 162.9307,
  mansionOffset: 0.0,
  ascendantHouse: '天蝎', // 命宮: 天蝎(卯)
  bodies: {
    Sun: { lon: 118.9074, house: '巨蟹', mansion: '柳', retro: false },
    Moon: { lon: 148.269, house: '獅子', mansion: '張', retro: false },
    Mercury: { lon: 130.9043, house: '獅子', mansion: '星', retro: false },
    Venus: { lon: 73.3748, house: '陰陽', mansion: '井', retro: false },
    Mars: { lon: 346.8779, house: '双魚', mansion: '壁', retro: false },
    Jupiter: { lon: 39.8728, house: '金牛', mansion: '昴', retro: false },
    Saturn: { lon: 242.4159, house: '人馬', mansion: '尾', retro: true },
    Rahu: { lon: 141.4367, house: '獅子', mansion: '張', retro: true },
    Ketu: { lon: 321.4367, house: '宝瓶', mansion: '危', retro: true },
    Yuebei: { lon: 136.632, house: '獅子', mansion: '張', retro: false },
  } as Record<string, { lon: number; house: string; mansion: string; retro: boolean }>,
};

const getHouse = (lon: number) =>
  MVP_HOUSES.find(h => lon >= h.startLongitude && lon < h.startLongitude + h.width) || MVP_HOUSES[0];

describe('ゴールデンテスト: 基準命盤 (1988-08-15 14:30 JST 東京・伝統古法)', () => {
  it('全天体の黄経・落宮・落宿・順逆が基準値と一致する (許容0.01°)', async () => {
    const config = SCHOOL_PRESETS.traditional;
    const bodies = await provider.calculateBodies(GOLDEN_INPUT, config);
    const angles = await provider.calculateAngles(GOLDEN_INPUT, config);

    expect(bodies).toHaveLength(10); // 七政7 + 羅計2 + 月孛1 (紫氣は既定無効)
    for (const body of bodies) {
      const g = GOLDEN.bodies[body.id];
      expect(g, `基準値に ${body.id} がない`).toBeDefined();
      expect(body.longitude, `${body.id} の黄経`).toBeCloseTo(g.lon, 2);
      expect(getHouse(body.longitude).name, `${body.id} の落宮`).toBe(g.house);
      expect(getMansionAtLongitude(body.longitude, angles.mansionOffset).name, `${body.id} の落宿`).toBe(g.mansion);
      expect(body.isRetrograde, `${body.id} の順逆`).toBe(g.retro);
    }
  });

  it('命宮・天頂が基準値と一致する', async () => {
    const angles = await provider.calculateAngles(GOLDEN_INPUT, SCHOOL_PRESETS.traditional);
    expect(angles.ascendant).toBeCloseTo(GOLDEN.ascendant, 2);
    expect(angles.midheaven).toBeCloseTo(GOLDEN.midheaven, 2);
    expect(angles.mansionOffset).toBeCloseTo(GOLDEN.mansionOffset, 6);
    expect(getHouse(angles.ascendant).name).toBe(GOLDEN.ascendantHouse);
  });
});

describe('外部アンカー: 天文現象との整合', () => {
  it('2020-06-21の金環日食(食甚06:40UTC)は夏至直後: 日月が会合し太陽黄経≈90.4°', async () => {
    // 日食=朔(日月の黄経会合)。夏至(6/20 21:43UTC)の太陽黄経は定義上ちょうど90°。
    const bi: BirthInput = {
      name: 'eclipse', birthDate: '2020-06-21', birthTime: '06:40', timeAccuracy: 'exact',
      latitude: 0, longitude: 0, timezoneOffset: 0,
    };
    const bodies = await provider.calculateBodies(bi, SCHOOL_PRESETS.modern); // トロピカル
    const sun = bodies.find(b => b.id === 'Sun')!.longitude;
    const moon = bodies.find(b => b.id === 'Moon')!.longitude;
    const conj = Math.abs((((sun - moon) % 360) + 540) % 360 - 180);
    expect(conj).toBeLessThan(0.6);
    expect(sun).toBeGreaterThan(90.0);
    expect(sun).toBeLessThan(90.6);
  });
});
