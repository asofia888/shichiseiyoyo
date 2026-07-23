import { describe, it, expect } from 'vitest';
import * as Astronomy from 'astronomy-engine';
import { AstronomyEngineProvider } from './astronomy-engine-provider';
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
  it('28年周天で移動し、伝統プリセットでは既定無効', async () => {
    const g = (r: { id: string; longitude: number }[]) => r.find(b => b.id === 'Ziqi')!.longitude;
    const z0 = await provider.calculateBodies(input({ birthDate: '2000-01-01' }), cfg({ ziqiOption: 'cycle_28' }));
    const z1 = await provider.calculateBodies(input({ birthDate: '2001-01-01' }), cfg({ ziqiOption: 'cycle_28' }));
    const z28 = await provider.calculateBodies(input({ birthDate: '2028-01-01' }), cfg({ ziqiOption: 'cycle_28' }));
    const yearMove = (((g(z1) - g(z0)) % 360) + 360) % 360;
    expect(yearMove).toBeCloseTo(12.857, 0);
    expect(circDiff(g(z28), g(z0))).toBeLessThan(1);
    expect(DEFAULT_SCHOOL_CONFIG.ziqiOption).toBe('none');
    const def = await provider.calculateBodies(input({}), DEFAULT_SCHOOL_CONFIG);
    expect(def.some(b => b.id === 'Ziqi')).toBe(false);
  });
});

describe('mansionOffset (宿境界の座標系補正)', () => {
  it('恒星黄道(Lahiri)命盤では0、トロピカル命盤では当日のLahiri値になる', async () => {
    const t = await provider.calculateAngles(input({}), SCHOOL_PRESETS.traditional);
    expect(t.mansionOffset).toBeCloseTo(0, 9);
    const m = await provider.calculateAngles(input({ birthDate: '2025-01-01' }), SCHOOL_PRESETS.modern);
    expect(m.mansionOffset).toBeCloseTo(24.21, 1);
  });
});
