import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import * as Astronomy from 'astronomy-engine';
import { AstronomyEngineProvider, getZiqiDatongSiderealLongitude } from './astronomy-engine-provider';
import { BirthInput } from './types';
import { SCHOOL_PRESETS, SchoolConfig, DEFAULT_SCHOOL_CONFIG } from '../qizhengsiyu/schoolConfig';

const provider = new AstronomyEngineProvider();

const base: BirthInput = {
  name: 'test', birthDate: '2000-01-01', birthTime: '12:00', timeAccuracy: 'exact',
  latitude: 35.6581, longitude: 139.7414, timezoneOffset: 0,
};
const input = (o: Partial<BirthInput>): BirthInput => ({ ...base, ...o });
// トロピカル基準の設定 (modernプリセット) に上書きを乗せる
const cfg = (o: Partial<SchoolConfig>): SchoolConfig => ({ ...SCHOOL_PRESETS.modern, ...o });
// 伝統古法プリセットに上書きを乗せる
const trad = (o: Partial<SchoolConfig> = {}): SchoolConfig => ({ ...SCHOOL_PRESETS.traditional, ...o });

const circDiff = (a: number, b: number) => Math.abs((((a - b) % 360) + 540) % 360 - 180);
const moonLon = (t: Astronomy.AstroTime) =>
  Astronomy.Ecliptic(Astronomy.GeoVector(Astronomy.Body.Moon, t, true)).elon;
const moonLat = (t: Astronomy.AstroTime) =>
  Astronomy.Ecliptic(Astronomy.GeoVector(Astronomy.Body.Moon, t, true)).elat;

describe('時刻変換', () => {
  it('半端タイムゾーン(+5.5)でも正しくUTC変換される', async () => {
    const a = await provider.calculateBodies(input({ birthDate: '2000-01-02', birthTime: '03:00', timezoneOffset: 5.5 }), cfg({}));
    const b = await provider.calculateBodies(input({ birthDate: '2000-01-01', birthTime: '21:30', timezoneOffset: 0 }), cfg({}));
    a.forEach((body, i) => expect(body.longitude).toBeCloseTo(b[i].longitude, 9));
  });

  it('夏時刻フラグは実効オフセット+1時間として扱われる', async () => {
    const dst = await provider.calculateBodies(input({ birthDate: '1950-07-15', birthTime: '15:30', timezoneOffset: 9, isDaylightSaving: true }), cfg({}));
    const std = await provider.calculateBodies(input({ birthDate: '1950-07-15', birthTime: '14:30', timezoneOffset: 9 }), cfg({}));
    dst.forEach((body, i) => expect(body.longitude).toBeCloseTo(std[i].longitude, 9));
  });

  it('夏時刻は標準時基準の時辰決定でも補正される(命宮が同一になる)', async () => {
    const dstAng = await provider.calculateAngles(
      input({ birthDate: '1950-07-15', birthTime: '15:30', timezoneOffset: 9, isDaylightSaving: true }),
      { ...SCHOOL_PRESETS.traditional, shichenBasis: 'standard' }
    );
    const stdAng = await provider.calculateAngles(
      input({ birthDate: '1950-07-15', birthTime: '14:30', timezoneOffset: 9 }),
      { ...SCHOOL_PRESETS.traditional, shichenBasis: 'standard' }
    );
    expect(dstAng.ascendant).toBeCloseTo(stdAng.ascendant, 9);
  });
});

describe('アヤナムシャ (Lahiri)', () => {
  async function effectiveAyanamsha(date: string): Promise<number> {
    const sid = await provider.calculateBodies(input({ birthDate: date }), cfg({ zodiacSystem: 'sidereal_lahiri' }));
    const time = Astronomy.MakeTime(new Date(date + 'T12:00:00Z'));
    const trop = Astronomy.Ecliptic(Astronomy.GeoVector(Astronomy.Body.Sun, time, true)).elon;
    return (((trop - sid.find(b => b.id === 'Sun')!.longitude) % 360) + 360) % 360;
  }

  it('既知のLahiri値と一致する (1950≈23.15° / 2025≈24.21°)', async () => {
    expect(await effectiveAyanamsha('1950-01-01')).toBeCloseTo(23.15, 1);
    expect(await effectiveAyanamsha('2025-01-01')).toBeCloseTo(24.21, 1);
  });
});

describe('アヤナムシャ (Fagan/Bradley)', () => {
  async function sunLongitude(date: string, zodiacSystem: SchoolConfig['zodiacSystem']) {
    const r = await provider.calculateBodies(input({ birthDate: date, birthTime: '00:00', timezoneOffset: 0 }), cfg({ zodiacSystem }));
    return r.find(b => b.id === 'Sun')!.longitude;
  }

  it('1950年1月1日に 24°02′31.36″ (スイス・エフェメリスの定義値)', async () => {
    const ayanamsha = circDiff(await sunLongitude('1950-01-01', 'tropical'), await sunLongitude('1950-01-01', 'sidereal_fagan'));
    expect(ayanamsha).toBeCloseTo(24.04204, 4);
  });

  it('Lahiri との差は年代によらず約0.883° (以前の「＋0.9°」は約1′大きかった)', async () => {
    for (const date of ['1900-06-01', '1988-08-15', '2026-01-01']) {
      const diff = circDiff(await sunLongitude(date, 'sidereal_lahiri'), await sunLongitude(date, 'sidereal_fagan'));
      expect(diff, date).toBeCloseTo(0.8834, 3);
    }
  });
});

describe('上昇点 (実測ASC)', () => {
  // 黄道上の点 (黄緯0) が、その土地・その瞬間に東の地平線上にあるかを球面三角で確かめる
  async function risingCheck(latitude: number, birthTime: string) {
    const inp = input({ birthDate: '2000-06-21', birthTime, timezoneOffset: 0, latitude, longitude: 0 });
    const angles = await provider.calculateAngles(inp, cfg({ zodiacSystem: 'tropical', mingGongMethod: 'ascendant' }));
    const rad = Math.PI / 180;
    const eps = 23.4392911 * rad;
    const lam = angles.ascendant * rad;
    const ra = Math.atan2(Math.sin(lam) * Math.cos(eps), Math.cos(lam));
    const dec = Math.asin(Math.sin(eps) * Math.sin(lam));
    const [hh, mm] = birthTime.split(':').map(Number);
    const lst = Astronomy.SiderealTime(Astronomy.MakeTime(new Date(Date.UTC(2000, 5, 21, hh, mm)))) * 15 * rad;
    const hourAngle = lst - ra;
    const phi = latitude * rad;
    const sinAlt = Math.sin(phi) * Math.sin(dec) + Math.cos(phi) * Math.cos(dec) * Math.cos(hourAngle);
    return { altitude: Math.asin(sinAlt) / rad, east: Math.sin(hourAngle) < 0, angles };
  }

  it('中緯度: 上昇点は地平線上にあり、東側にある', async () => {
    for (const time of ['00:00', '06:00', '12:00', '18:00']) {
      const r = await risingCheck(35, time);
      expect(Math.abs(r.altitude), time).toBeLessThan(0.05);
      expect(r.east, time).toBe(true);
    }
  });

  it('極圏 (北緯75°・南緯75°): 一日のどの時刻でも、下降点ではなく上昇点を返す', async () => {
    for (const latitude of [75, -75]) {
      for (let h = 0; h < 24; h += 2) {
        const time = `${String(h).padStart(2, '0')}:00`;
        const r = await risingCheck(latitude, time);
        expect(Math.abs(r.altitude), `${latitude}° ${time}`).toBeLessThan(0.05);
        expect(r.east, `${latitude}° ${time}`).toBe(true);
      }
    }
  });

  it('極点 (±90°) でも数値を返す', async () => {
    for (const latitude of [90, -90]) {
      const { angles } = await risingCheck(latitude, '12:00');
      expect(Number.isFinite(angles.ascendant), String(latitude)).toBe(true);
      expect(Number.isFinite(angles.midheaven), String(latitude)).toBe(true);
    }
  });
});

describe('計算エンジンの表示', () => {
  it('画面に出す版が、実際に入っている astronomy-engine の版と一致する', () => {
    const pkg = JSON.parse(readFileSync(resolve(process.cwd(), 'node_modules/astronomy-engine/package.json'), 'utf8'));
    expect(provider.getProviderInfo().version).toBe(pkg.version);
  });
});

describe('安命法 (太陽卯時起算)', () => {
  it('標準時基準: 一時辰(2時間)ごとに命宮が黄経+30°前進する', async () => {
    const jst = { birthDate: '1988-08-15', timezoneOffset: 9 };
    const mao = await provider.calculateAngles(input({ ...jst, birthTime: '06:00' }), trad({ shichenBasis: 'standard' }));
    const chen = await provider.calculateAngles(input({ ...jst, birthTime: '08:00' }), trad({ shichenBasis: 'standard' }));
    const step = (((chen.ascendant - mao.ascendant) % 360) + 360) % 360;
    expect(step).toBeCloseTo(30, 0);
  });

  it('標準時基準: 時辰境界(01:00=丑の始まり)で命宮が1宮切り替わる', async () => {
    const a = await provider.calculateAngles(input({ birthTime: '00:59', timezoneOffset: 9 }), trad({ shichenBasis: 'standard' }));
    const b = await provider.calculateAngles(input({ birthTime: '01:00', timezoneOffset: 9 }), trad({ shichenBasis: 'standard' }));
    const step = (((b.ascendant - a.ascendant) % 360) + 360) % 360;
    expect(step).toBeCloseTo(30, 1);
  });

  it('真太陽時基準: 太陽南中の瞬間は午時(命宮=太陽+90°)になる', async () => {
    // 東京の実際の南中時刻(時計では11時25分頃)を天文計算で求めて入力にする
    const observer = new Astronomy.Observer(35.6581, 139.7414, 0);
    const transit = Astronomy.SearchHourAngle(Astronomy.Body.Sun, observer, 0, Astronomy.MakeTime(new Date('1990-11-02T12:00:00Z')));
    const jst = new Date(transit.time.date.getTime() + 9 * 3600 * 1000);
    const birthDate = jst.toISOString().slice(0, 10);
    const birthTime = jst.toISOString().slice(11, 16);
    const bi = input({ birthDate, birthTime, timezoneOffset: 9 });

    const ang = await provider.calculateAngles(bi, trad({ shichenBasis: 'apparent_solar' }));
    const sun = (await provider.calculateBodies(bi, trad())).find(b => b.id === 'Sun')!.longitude;
    const rel = (((ang.ascendant - sun) % 360) + 360) % 360;
    expect(rel).toBeCloseTo(90, 1);
  });

  it('真太陽時と標準時で時辰が変わるケース (東京・11月・時計10:40)', async () => {
    // 東京の11月上旬: 真太陽時 ≈ 時計+35分(経度+19分・均時差+16分)。
    // 時計10:40 → 標準時基準では巳時(+60°)、真太陽時11:15相当 → 午時(+90°)。
    const bi = input({ birthDate: '1990-11-03', birthTime: '10:40', timezoneOffset: 9 });
    const sun = (await provider.calculateBodies(bi, trad())).find(b => b.id === 'Sun')!.longitude;
    const std = await provider.calculateAngles(bi, trad({ shichenBasis: 'standard' }));
    const app = await provider.calculateAngles(bi, trad({ shichenBasis: 'apparent_solar' }));
    expect((((std.ascendant - sun) % 360) + 360) % 360).toBeCloseTo(60, 1);
    expect((((app.ascendant - sun) % 360) + 360) % 360).toBeCloseTo(90, 1);
  });
});

describe('羅睺・計都の割当', () => {
  it('印度式と宋明式で羅睺・計都が入れ替わる(180°差)', async () => {
    const ind = await provider.calculateBodies(input({}), cfg({ nodeCalc: 'mean', rahuKetuAssignment: 'rahu_ascending' }));
    const sm = await provider.calculateBodies(input({}), cfg({ nodeCalc: 'mean', rahuKetuAssignment: 'rahu_descending' }));
    const rahuInd = ind.find(b => b.id === 'Rahu')!.longitude;
    const ketuInd = ind.find(b => b.id === 'Ketu')!.longitude;
    const rahuSm = sm.find(b => b.id === 'Rahu')!.longitude;
    const ketuSm = sm.find(b => b.id === 'Ketu')!.longitude;
    expect(rahuSm).toBeCloseTo(ketuInd, 6);
    expect(ketuSm).toBeCloseTo(rahuInd, 6);
    expect(circDiff(rahuInd, rahuSm)).toBeCloseTo(180, 6);
  });

  it('印度式の羅睺(平均・トロピカル)はJ2000でMeeus標準値125.04°になる', async () => {
    const ind = await provider.calculateBodies(input({}), cfg({ nodeCalc: 'mean', rahuKetuAssignment: 'rahu_ascending' }));
    expect(ind.find(b => b.id === 'Rahu')!.longitude).toBeCloseTo(125.04, 1);
  });

  it('伝統古法プリセットの既定は宋明式(羅睺=降交点)', () => {
    expect(DEFAULT_SCHOOL_CONFIG.rahuKetuAssignment).toBe('rahu_descending');
  });
});

describe('真位置 (接触軌道・イベント補間)', () => {
  // 月の黄緯が南→北へゼロ交差する瞬間(=実際の昇交点通過)を二分法で検出する
  function findAscendingCrossings(startIso: string, count: number): Astronomy.AstroTime[] {
    const out: Astronomy.AstroTime[] = [];
    let t = Astronomy.MakeTime(new Date(startIso));
    let prev = moonLat(t);
    while (out.length < count) {
      const t2 = t.AddDays(0.5);
      const cur = moonLat(t2);
      if (prev < 0 && cur >= 0) {
        let lo = t, hi = t2;
        for (let i = 0; i < 45; i++) {
          const mid = lo.AddDays((hi.ut - lo.ut) / 2);
          if (moonLat(mid) < 0) lo = mid; else hi = mid;
        }
        out.push(hi);
      }
      t = t2;
      prev = cur;
    }
    return out;
  }

  it('真交点は実際の昇交点通過時の月黄経と一致し、平均交点より正確', async () => {
    const crossings = findAscendingCrossings('2019-01-01T00:00:00Z', 5);
    let errTrue = 0;
    let errMean = 0;
    for (const c of crossings) {
      const d = c.date;
      const bi = input({ birthDate: d.toISOString().slice(0, 10), birthTime: d.toISOString().slice(11, 16) });
      const tB = await provider.calculateBodies(bi, cfg({ nodeCalc: 'true', rahuKetuAssignment: 'rahu_ascending' }));
      const mB = await provider.calculateBodies(bi, cfg({ nodeCalc: 'mean', rahuKetuAssignment: 'rahu_ascending' }));
      const target = moonLon(c);
      errTrue += circDiff(tB.find(b => b.id === 'Rahu')!.longitude, target);
      errMean += circDiff(mB.find(b => b.id === 'Rahu')!.longitude, target);
    }
    errTrue /= crossings.length;
    errMean /= crossings.length;
    expect(errTrue).toBeLessThan(0.25);
    expect(errTrue).toBeLessThan(errMean);
  });

  it('真月孛は実際の遠地点イベント時の月黄経と一致する', async () => {
    let apsis = Astronomy.SearchLunarApsis(Astronomy.MakeTime(new Date('2021-03-01T00:00:00Z')));
    const events: Astronomy.Apsis[] = [];
    while (events.length < 3) {
      if (apsis.kind === Astronomy.ApsisKind.Apocenter) events.push(apsis);
      apsis = Astronomy.NextLunarApsis(apsis);
    }
    for (const ev of events) {
      const d = ev.time.date;
      const bi = input({ birthDate: d.toISOString().slice(0, 10), birthTime: d.toISOString().slice(11, 16) });
      const bodies = await provider.calculateBodies(bi, cfg({ apogeeCalc: 'true' }));
      const yuebei = bodies.find(b => b.id === 'Yuebei')!.longitude;
      expect(circDiff(yuebei, moonLon(ev.time))).toBeLessThan(0.1);
    }
  });
});

describe('紫氣', () => {
  const g = (r: { id: string; longitude: number }[]) => r.find(b => b.id === 'Ziqi')!.longitude;

  it('大統暦法: 暦元の冬至に、箕宿初度から 8194.9623日ぶん進んだ位置に在る (『明史』暦志「步四餘」)', () => {
    // 洪武十七年甲子歳前の天正冬至。周日 10227.1792日で 360° を一巡する
    const epoch = new Date(Date.UTC(1383, 11, 21, 18, 21));
    const expected = (247.404 + (8194.9623 / 10227.1792) * 360) % 360; // 箕宿初度 = 247.404° (Lahiri)
    expect(getZiqiDatongSiderealLongitude(epoch)).toBeCloseTo(expected, 6);
    // 箕宿初度に入るのは、そこから (10227.1792 − 8194.9623) 日後
    const atJi = new Date(epoch.getTime() + (10227.1792 - 8194.9623) * 86400000);
    expect(circDiff(getZiqiDatongSiderealLongitude(atJi), 247.404)).toBeLessThan(1e-6);
  });

  it('大統暦法: 順行し、度率どおり28日で古度の一度 (360/365.2564°) 進み、周日で元の位置に戻る', () => {
    const t0 = new Date(Date.UTC(2000, 0, 1));
    const z0 = getZiqiDatongSiderealLongitude(t0);
    const z28 = getZiqiDatongSiderealLongitude(new Date(t0.getTime() + 28 * 86400000));
    expect((((z28 - z0) % 360) + 360) % 360).toBeCloseTo(360 / (10227.1792 / 28), 6);
    const zCycle = getZiqiDatongSiderealLongitude(new Date(t0.getTime() + 10227.1792 * 86400000));
    expect(circDiff(zCycle, z0)).toBeLessThan(1e-6);
  });

  it('どの黄道体系でも同じ宿に落ちる (紫氣は宿を基準に位置が決まる)', async () => {
    const lahiri = await provider.calculateBodies(input({}), cfg({ zodiacSystem: 'sidereal_lahiri' }));
    const tropical = await provider.calculateBodies(input({}), cfg({ zodiacSystem: 'tropical' }));
    const aL = await provider.calculateAngles(input({}), cfg({ zodiacSystem: 'sidereal_lahiri' }));
    const aT = await provider.calculateAngles(input({}), cfg({ zodiacSystem: 'tropical' }));
    // 命盤黄経から宿境界のずれを引くと、どちらも同じ Lahiri 恒星黄経になる
    expect(circDiff(g(lahiri) - aL.mansionOffset, g(tropical) - aT.mansionOffset)).toBeLessThan(1e-6);
  });

  it('全プリセットで大統暦法を既定とし、設定で外せる', async () => {
    for (const [key, preset] of Object.entries(SCHOOL_PRESETS)) {
      expect(preset.ziqiOption, key).toBe('datong');
    }
    const off = await provider.calculateBodies(input({}), cfg({ ziqiOption: 'none' }));
    expect(off.some(b => b.id === 'Ziqi')).toBe(false);
  });

  it('旧試験式 (履歴の再現用) は従来どおり28年周天で動く', async () => {
    const z0 = await provider.calculateBodies(input({ birthDate: '2000-01-01' }), cfg({ ziqiOption: 'cycle_28' }));
    const z1 = await provider.calculateBodies(input({ birthDate: '2001-01-01' }), cfg({ ziqiOption: 'cycle_28' }));
    const z28 = await provider.calculateBodies(input({ birthDate: '2028-01-01' }), cfg({ ziqiOption: 'cycle_28' }));
    const yearMove = (((g(z1) - g(z0)) % 360) + 360) % 360;
    expect(yearMove).toBeCloseTo(12.857, 0);
    expect(circDiff(g(z28), g(z0))).toBeLessThan(1);
  });
});
