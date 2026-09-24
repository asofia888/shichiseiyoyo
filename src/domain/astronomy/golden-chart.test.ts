import { describe, it, expect } from 'vitest';
import { AstronomyEngineProvider } from './astronomy-engine-provider';
import { BirthInput } from './types';
import { SCHOOL_PRESETS } from '../qizhengsiyu/schoolConfig';
import { getMansionAtLongitude, MVP_HOUSES } from '../qizhengsiyu/constants';

// ゴールデンテスト (システム設計書 §11)
//
// このファイルには性質の違う2種類の基準がある:
// 1. 回帰基準 (最初の describe): 2026-07-22 時点の実装から採取した値。
//    計算が意図せず変わったことは検出できるが、値そのものの正しさは保証しない。
// 2. 外部基準 (それ以降の describe): JPL Horizons・Meeus『Astronomical Algorithms』・
//    インド天文暦のラヒリ定義など、このアプリの計算と独立した出典の値。正しさはこちらで担保する。
// 意図して計算方式を変更した場合は、変更根拠と共に回帰基準を更新すること。
// 外部基準は出典の値なので、落ちたら計算側を疑う。

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

describe('回帰基準: 基準命盤 (1988-08-15 14:30 JST 東京・伝統古法)', () => {
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

// ---- 外部基準 -----------------------------------------------------------------

const atUtc = (birthDate: string, birthTime: string): BirthInput => ({
  name: 'external', birthDate, birthTime, timeAccuracy: 'exact', latitude: 0, longitude: 0, timezoneOffset: 0,
});
/** 2つの黄経の符号付きの差 (-180〜180°) */
const lonDiff = (a: number, b: number) => ((((a - b) % 360) + 540) % 360) - 180;

// JPL Horizons API (ssd.jpl.nasa.gov, 暦 DE441) から 2026-09-24 に取得。
// 基準命盤と同じ瞬間 1988-08-15 05:30 UT (= 14:30 JST)、地心。
// QUANTITIES=31: 観測者中心・当日黄道(IAU76/80)の視黄経。光行時間・光の偏向・光行差を含む。
const HORIZONS_1988_08_15_0530UT: Record<string, number> = {
  Sun: 142.6056665,
  Moon: 171.9668368,
  Mercury: 154.6022770,
  Venus: 97.0732795,
  Mars: 10.5733165,
  Jupiter: 63.5710642,
  Saturn: 266.1133115,
};

describe('外部基準: JPL Horizons (DE441) との照合', () => {
  it('七政の視黄経 (移動黄道) が Horizons と0.005°以内で一致する', async () => {
    const bodies = await provider.calculateBodies(GOLDEN_INPUT, SCHOOL_PRESETS.modern); // トロピカル
    for (const [id, expected] of Object.entries(HORIZONS_1988_08_15_0530UT)) {
      const body = bodies.find(b => b.id === id)!;
      expect(Math.abs(lonDiff(body.longitude, expected)), `${id}: ${body.longitude}`).toBeLessThan(0.005);
    }
  });

  it('真交点 (接触軌道の昇交点) が Horizons の月の接触軌道要素と一致する', async () => {
    // Horizons ELEMENTS, 月(301)・地心・J2000黄道, 1988-08-15 05:30:55.76 TDB (= 05:30 UT):
    //   OM (昇交点黄経) = 344.2502532°
    // アプリは当日春分点基準で返すので、一般歳差 (IAU 2006: 5028.796195″/ユリウス世紀) で J2000 に戻して比べる
    const OM_J2000 = 344.2502532;
    const bodies = await provider.calculateBodies(GOLDEN_INPUT, SCHOOL_PRESETS.modern); // 真交点・羅睺=昇交点
    const T = (Date.UTC(1988, 7, 15, 5, 30) - Date.UTC(2000, 0, 1, 12)) / (86400000 * 36525);
    const rahuJ2000 = bodies.find(b => b.id === 'Rahu')!.longitude - (5028.796195 / 3600) * T;
    expect(Math.abs(lonDiff(rahuJ2000, OM_J2000))).toBeLessThan(0.005);
  });
});

describe('外部基準: Meeus『Astronomical Algorithms』(1991) の計算例', () => {
  // 平均交点・平均遠地点 (流派設定「平均位置」) は Meeus 第45章 (Chapront) の式による。
  // 例題の日時は 0h TD だが、TD と UT の差 (約1分) による誤差は 0.0001° 未満なので UT で与える。
  const meanTropical = { ...SCHOOL_PRESETS.modern, nodeCalc: 'mean' as const, apogeeCalc: 'mean' as const };

  it('平均昇交点: 例題21.a (1987-04-10 0h TD) の Ω = 11.2531°', async () => {
    const bodies = await provider.calculateBodies(atUtc('1987-04-10', '00:00'), meanTropical);
    // modern は羅睺=昇交点
    expect(Math.abs(lonDiff(bodies.find(b => b.id === 'Rahu')!.longitude, 11.2531))).toBeLessThan(0.001);
  });

  it('平均遠地点 (月孛): 例題45.a (1992-04-12 0h TD) の L′−M′+180° = 309.139347°', async () => {
    // L′ (月の平均黄経) = 134.290186°, M′ (月の平均近点角) = 5.150839° → 平均近地点 = 129.139347°
    const bodies = await provider.calculateBodies(atUtc('1992-04-12', '00:00'), meanTropical);
    expect(Math.abs(lonDiff(bodies.find(b => b.id === 'Yuebei')!.longitude, 309.139347))).toBeLessThan(0.001);
  });
});

describe('外部基準: ラヒリ・アヤナムシャの定義', () => {
  it('1956-03-21 0h ET に 23°15′00.658″ (章動を除いた平均値 23.245525°)', async () => {
    // インド暦改革委員会の定義 (インド天文暦 1989, p.556)。公表値 23°15′00.658″ = 23.250183° は
    // 章動 (16.77″ = 0.004658°) を含むので、平均値で比べる。
    // 出典: Swiss Ephemeris sweph.h の SE_SIDM_LAHIRI 定義 {2435553.5, 23.250182778 - 0.004658035}
    // トロピカル命盤の mansionOffset はその日のラヒリ値そのもの。
    const angles = await provider.calculateAngles(atUtc('1956-03-21', '00:00'), SCHOOL_PRESETS.modern);
    expect(angles.mansionOffset).toBeCloseTo(23.250182778 - 0.004658035, 3);
  });
});

describe('外部基準: 安命法を古法どおり手で立てた結果との照合', () => {
  it('基準命盤: 真太陽時14:44は未時、太陽の巨蟹宮に未を加えて順に卯まで数えると命宮は天蝎', async () => {
    // Horizons QUANTITIES=42 (東京 139.7414°E 35.6581°N、1988-08-15 05:30 UT):
    //   太陽の地方視時角 = 2.741979 h → 真太陽時 = 時角 + 12h = 14.742 h (14:44) → 未時 (13〜15時)
    // 太陽の恒星黄経 = Horizons の視黄経 142.6057° − ラヒリ約23.70° ≈ 118.9° → 巨蟹宮 (未)
    // 「以生時加在太陽所在之宮，順數至卯，即是命宮」: 太陽の宮(巨蟹)に生時の未を置き、
    //   宮を地支の順にたどって 陰陽=申・金牛=酉・白羊=戌・双魚=亥・宝瓶=子・磨羯=丑・人馬=寅・天蝎=卯
    //   と数えると、卯に当たる天蝎が命宮になる
    const angles = await provider.calculateAngles(GOLDEN_INPUT, SCHOOL_PRESETS.traditional);
    const sun = (await provider.calculateBodies(GOLDEN_INPUT, SCHOOL_PRESETS.traditional)).find(b => b.id === 'Sun')!;
    expect(getHouse(sun.longitude).name).toBe('巨蟹');
    expect(getHouse(angles.ascendant).name).toBe('天蝎');
  });
});
