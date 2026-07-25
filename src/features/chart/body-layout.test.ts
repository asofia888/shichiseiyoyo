import { describe, it, expect } from 'vitest';
import { assignBodyLevels, angularGap, minGapAt } from './body-layout';
import { BODY_LEVELS, LABEL_CLEARANCE_PX } from './CelestialChart';
import { AstronomyEngineProvider } from '../../domain/astronomy/astronomy-engine-provider';
import { SCHOOL_PRESETS } from '../../domain/qizhengsiyu/schoolConfig';
import { BirthInput } from '../../domain/astronomy/types';

// 同じ段に置かれた星曜同士の実距離(弦長)を求める
function minSameLevelDistancePx(placements: { longitude: number; radius: number }[]): number {
  let worst = Infinity;
  for (let i = 0; i < placements.length; i++) {
    for (let j = i + 1; j < placements.length; j++) {
      if (placements[i].radius !== placements[j].radius) continue;
      const deg = angularGap(placements[i].longitude, placements[j].longitude);
      const chord = 2 * placements[i].radius * Math.sin((deg / 2) * (Math.PI / 180));
      worst = Math.min(worst, chord);
    }
  }
  return worst;
}

const layout = (lons: number[]) =>
  assignBodyLevels(lons.map(longitude => ({ longitude })), BODY_LEVELS, LABEL_CLEARANCE_PX)
    .map(p => ({ longitude: p.body.longitude, radius: p.radius, level: p.level }));

describe('星曜の段振り分け', () => {
  it('離れている星曜はすべて最外周に置かれる', () => {
    const result = layout([0, 60, 120, 180, 240, 300]);
    expect(result.every(p => p.level === 0)).toBe(true);
  });

  it('黄経が近い星曜は内側の段へ逃げる', () => {
    const result = layout([100, 103, 106, 109]);
    expect(new Set(result.map(p => p.level)).size).toBe(4); // 4天体が別々の段に
  });

  it('段が足りない場合でも、同じ段に置くなら最も離れた組み合わせを選ぶ', () => {
    // 5天体が10°以内 — 4段では収まらないので必ずどこかで同居する
    const result = layout([100, 102, 104, 106, 108]);
    // 同居してもラベル高さ(約11px)以上は離れていること
    expect(minSameLevelDistancePx(result)).toBeGreaterThan(11);
  });

  it('0°をまたぐ近接も正しく検出する', () => {
    const result = layout([358, 1, 4]);
    expect(new Set(result.map(p => p.level)).size).toBe(3);
  });

  it('必要角度は内側の段ほど大きい', () => {
    const gaps = BODY_LEVELS.map(r => minGapAt(r, LABEL_CLEARANCE_PX));
    for (let i = 1; i < gaps.length; i++) {
      expect(gaps[i]).toBeGreaterThan(gaps[i - 1]);
    }
  });
});

describe('実命盤での重なり (回帰テスト)', () => {
  const provider = new AstronomyEngineProvider();

  async function worstOverlapOver(years: number[], config = SCHOOL_PRESETS.traditional) {
    let worst = { distance: Infinity, when: '' };
    for (const year of years) {
      for (const [month, day, time] of [[1, 15, '03:00'], [5, 20, '11:30'], [9, 8, '19:45']] as const) {
        const input: BirthInput = {
          name: 't',
          birthDate: `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
          birthTime: time, timeAccuracy: 'exact',
          latitude: 35.6581, longitude: 139.7414, timezoneOffset: 9,
        };
        const bodies = await provider.calculateBodies(input, config);
        const placements = layout(bodies.map(b => b.longitude));
        const d = minSameLevelDistancePx(placements);
        if (d < worst.distance) worst = { distance: d, when: `${input.birthDate} ${time}` };
      }
    }
    return worst;
  }

  it('伝統古法(10天体): 同じ段の星曜がラベル高さ以上離れている', async () => {
    const years = Array.from({ length: 40 }, (_, i) => 1930 + i * 2.5).map(Math.round);
    const worst = await worstOverlapOver(years);
    expect(worst.distance, `最悪ケース: ${worst.when}`).toBeGreaterThan(11);
  });

  it('紫氣あり(11天体): 同じ段の星曜がラベル高さ以上離れている', async () => {
    const years = Array.from({ length: 40 }, (_, i) => 1930 + i * 2.5).map(Math.round);
    const worst = await worstOverlapOver(years, { ...SCHOOL_PRESETS.traditional, ziqiOption: 'cycle_28' });
    expect(worst.distance, `最悪ケース: ${worst.when}`).toBeGreaterThan(11);
  });
});
