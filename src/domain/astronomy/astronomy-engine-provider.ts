import * as Astronomy from 'astronomy-engine';
import { BirthInput, CelestialPosition, ChartAngles, EphemerisProvider, EphemerisProviderInfo } from './types';
import { SchoolConfig, DEFAULT_SCHOOL_CONFIG } from '../qizhengsiyu/schoolConfig';

function getMeanLunarNode(date: Date): number {
  const T = (date.getTime() - Date.UTC(2000, 0, 1, 12, 0, 0)) / (1000 * 60 * 60 * 24 * 36525);
  let Ω = 125.04452 - 1934.136261 * T;
  Ω = Ω % 360;
  if (Ω < 0) Ω += 360;
  return Ω;
}

function getMeanLunarApogee(date: Date): number {
  const T = (date.getTime() - Date.UTC(2000, 0, 1, 12, 0, 0)) / (1000 * 60 * 60 * 24 * 36525);
  // 83.353 + 4069.014*T は月の平均「近地点」黄経 (Meeus: 月平均黄経218.316 - 平均近点角134.963)。
  // 月孛 = 遠地点なので +180° する。
  const perigee = 83.35324 + 4069.0137287 * T;
  let apogee = (perigee + 180) % 360;
  if (apogee < 0) apogee += 360;
  return apogee;
}

function getAyanamsha(date: Date, config: SchoolConfig): number {
  if (config.zodiacSystem === 'tropical') {
    return 0;
  }
  if (config.zodiacSystem === 'sidereal_custom') {
    return config.ayanamshaValue ?? 24.0;
  }
  const T = (date.getTime() - Date.UTC(2000, 0, 1, 12, 0, 0)) / (1000 * 60 * 60 * 24 * 36525);
  // 歳差レートは約50.29″/年 = 1.397°/ユリウス世紀 (Tは世紀単位)。Lahiri J2000元期値 ≈ 23.857°
  const lahiri = 23.857 + T * 1.397;
  if (config.zodiacSystem === 'sidereal_fagan') {
    return lahiri + 0.9;
  }
  return lahiri; // sidereal_lahiri
}

// 真交点(接触軌道の昇交点): 月の地心位置・速度ベクトルから瞬時軌道面を求める。
// 軌道面法線 h = r × v に対し昇交点方向は n = ẑ × h (軌道力学の標準定義。
// Swiss Ephemeris の True Node と同種の接触軌道要素)。戻り値は当日春分点基準のトロピカル黄経。
function getOsculatingNodeLongitude(time: Astronomy.AstroTime): number {
  const rot = Astronomy.Rotation_EQJ_ECL(); // 赤道J2000 → 黄道J2000
  const vecAt = (t: Astronomy.AstroTime) =>
    Astronomy.RotateVector(rot, Astronomy.GeoVector(Astronomy.Body.Moon, t, false));
  const dt = 0.02; // 日 (中心差分)
  const r0 = vecAt(time);
  const rm = vecAt(time.AddDays(-dt));
  const rp = vecAt(time.AddDays(dt));
  const vx = rp.x - rm.x, vy = rp.y - rm.y, vz = rp.z - rm.z; // 速度の方向(比例定数は不要)
  const hx = r0.y * vz - r0.z * vy;
  const hy = r0.z * vx - r0.x * vz;
  // n = ẑ × h = (−hy, hx, 0) → 黄経 = atan2(n_y, n_x) = atan2(hx, −hy)
  const lonJ2000 = Math.atan2(hx, -hy) * (180 / Math.PI);
  // J2000黄道座標の経度 → 当日春分点基準 (歳差 約1.397°/ユリウス世紀)
  const T = (time.date.getTime() - Date.UTC(2000, 0, 1, 12, 0, 0)) / (1000 * 60 * 60 * 24 * 36525);
  let lon = (lonJ2000 + 1.397 * T) % 360;
  if (lon < 0) lon += 360;
  return lon;
}

// 真月孛: 出生時刻の前後にある実際の遠地点イベントの月黄経を時間比例で補間する
// (Swiss Ephemeris の interpolated lunar apogee と同種の定義)。戻り値はトロピカル黄経。
function getInterpolatedApogeeLongitude(time: Astronomy.AstroTime): number {
  const moonLonAt = (t: Astronomy.AstroTime) =>
    Astronomy.Ecliptic(Astronomy.GeoVector(Astronomy.Body.Moon, t, true)).elon;
  // 40日前から探索すれば、直前の遠地点(近点月27.55日周期)を必ず含む
  let apsis = Astronomy.SearchLunarApsis(time.AddDays(-40));
  let prev: Astronomy.Apsis | null = null;
  let next: Astronomy.Apsis | null = null;
  while (!next) {
    if (apsis.kind === Astronomy.ApsisKind.Apocenter) {
      if (apsis.time.ut <= time.ut) {
        prev = apsis;
      } else {
        next = apsis;
      }
    }
    if (!next) apsis = Astronomy.NextLunarApsis(apsis);
  }
  if (!prev) return moonLonAt(next.time); // 探索開始位置の設計上ここには到達しない
  const lonPrev = moonLonAt(prev.time);
  const lonNext = moonLonAt(next.time);
  const frac = (time.ut - prev.time.ut) / (next.time.ut - prev.time.ut);
  const delta = ((((lonNext - lonPrev) % 360) + 540) % 360) - 180; // 最短経路の符号付き差
  return (((lonPrev + frac * delta) % 360) + 360) % 360;
}

function getZiqiLongitude(date: Date): number {
  const T = (date.getTime() - Date.UTC(2000, 0, 1, 12, 0, 0)) / (1000 * 60 * 60 * 24 * 36525);
  // 紫氣は28年周天 = 12.857°/年 = 1285.71°/ユリウス世紀 (Tは世紀単位)。
  // 注意: 元期値45.0°(J2000)は出典未確認のため、設計書§3に従いデフォルトの流派設定では無効。
  let ziqi = (45.0 + T * 1285.714) % 360;
  if (ziqi < 0) ziqi += 360;
  return ziqi;
}

export class AstronomyEngineProvider implements EphemerisProvider {
  getProviderInfo(): EphemerisProviderInfo {
    return {
      name: 'astronomy-engine',
      version: '2.1.19',
      description: 'Open-source astronomical calculation library with customizable school settings (Zodiac system, Node/Apogee models, Traditional Ming-Gong calculation).'
    };
  }

  private getJsDate(input: BirthInput): Date {
    const [year, month, day] = input.birthDate.split('-').map(Number);
    const [hour, minute] = input.birthTime.split(':').map(Number);
    // サマータイム(夏時刻)中の時刻は実効オフセットが+1時間 (例: 日本の1948〜51年)
    const effectiveOffset = input.timezoneOffset + (input.isDaylightSaving ? 1 : 0);
    // 現地時刻をミリ秒で直接UTCへ換算する (半端なタイムゾーン・負の端数でも正確)
    return new Date(Date.UTC(year, month - 1, day, hour, minute) - effectiveOffset * 3600 * 1000);
  }

  private createAstroTime(input: BirthInput): Astronomy.AstroTime {
    return Astronomy.MakeTime(this.getJsDate(input));
  }

  async calculateBodies(input: BirthInput, config: SchoolConfig = DEFAULT_SCHOOL_CONFIG): Promise<CelestialPosition[]> {
    const time = this.createAstroTime(input);
    const jsDate = this.getJsDate(input);
    const ayanamsha = getAyanamsha(jsDate, config);

    const bodiesToCalc = [
      { id: 'Sun', name: '太陽', body: Astronomy.Body.Sun },
      { id: 'Moon', name: '月', body: Astronomy.Body.Moon },
      { id: 'Mercury', name: '水星', body: Astronomy.Body.Mercury },
      { id: 'Venus', name: '金星', body: Astronomy.Body.Venus },
      { id: 'Mars', name: '火星', body: Astronomy.Body.Mars },
      { id: 'Jupiter', name: '木星', body: Astronomy.Body.Jupiter },
      { id: 'Saturn', name: '土星', body: Astronomy.Body.Saturn },
    ];

    const results: CelestialPosition[] = [];
    const dt = 1 / 24; // 1 hour
    const nextTime = time.AddDays(dt);

    for (const b of bodiesToCalc) {
      const v = Astronomy.GeoVector(b.body, time, true);
      const ecl = Astronomy.Ecliptic(v);
      
      const vNext = Astronomy.GeoVector(b.body, nextTime, true);
      const eclNext = Astronomy.Ecliptic(vNext);
      
      let isRetrograde = false;
      let diff = eclNext.elon - ecl.elon;
      if (diff > 180) diff -= 360;
      if (diff < -180) diff += 360;
      if (diff < 0) {
        isRetrograde = true;
      }

      const siderealLon = (ecl.elon - ayanamsha + 360) % 360;

      results.push({
        id: b.id,
        name: b.name,
        longitude: siderealLon,
        latitude: ecl.elat,
        isRetrograde
      });
    }

    // Nodes and Apogee according to school config
    const ascendingNodeTropical = config.nodeCalc === 'true'
      ? getOsculatingNodeLongitude(time)
      : getMeanLunarNode(jsDate);
    const ascendingNodeLon = (ascendingNodeTropical - ayanamsha + 360) % 360;
    const descendingNodeLon = (ascendingNodeLon + 180) % 360;

    // 羅計の割当は流派設定に従う (rahu_descending = 宋明式: 羅睺=降交点・計都=昇交点)
    const rahuIsDescending = config.rahuKetuAssignment === 'rahu_descending';
    const rahuLon = rahuIsDescending ? descendingNodeLon : ascendingNodeLon;
    const ketuLon = rahuIsDescending ? ascendingNodeLon : descendingNodeLon;

    results.push({
      id: 'Rahu',
      name: '羅睺',
      longitude: rahuLon,
      latitude: 0,
      isRetrograde: true
    });

    results.push({
      id: 'Ketu',
      name: '計都',
      longitude: ketuLon,
      latitude: 0,
      isRetrograde: true
    });

    const yuebeiTropical = config.apogeeCalc === 'true'
      ? getInterpolatedApogeeLongitude(time)
      : getMeanLunarApogee(jsDate);
    const yuebeiLon = (yuebeiTropical - ayanamsha + 360) % 360;

    results.push({
      id: 'Yuebei',
      name: '月孛',
      longitude: yuebeiLon,
      latitude: 0,
      isRetrograde: false
    });

    // Ziqi if enabled
    if (config.ziqiOption === 'cycle_28') {
      const ziqiRaw = getZiqiLongitude(jsDate);
      const ziqiLon = (ziqiRaw - ayanamsha + 360) % 360;
      results.push({
        id: 'Ziqi',
        name: '紫氣',
        longitude: ziqiLon,
        latitude: 0,
        isRetrograde: false
      });
    }

    return results;
  }

  async calculateAngles(input: BirthInput, config: SchoolConfig = DEFAULT_SCHOOL_CONFIG): Promise<ChartAngles> {
    const time = this.createAstroTime(input);
    const jsDate = this.getJsDate(input);
    const ayanamsha = getAyanamsha(jsDate, config);
    
    // Calculate LST and Ascendant / Midheaven
    const lst = Astronomy.SiderealTime(time) + (input.longitude / 15);
    const lst_rad = (lst * 15) * (Math.PI / 180);
    const e = 23.4392911 * (Math.PI / 180);
    const lat_rad = input.latitude * (Math.PI / 180);
    
    let asc_rad = Math.atan2(Math.cos(lst_rad), -Math.sin(lst_rad) * Math.cos(e) - Math.tan(lat_rad) * Math.sin(e));
    let asc_deg = asc_rad * (180 / Math.PI);
    if (asc_deg < 0) asc_deg += 360;
    
    let mc_rad = Math.atan2(Math.sin(lst_rad), Math.cos(lst_rad) * Math.cos(e));
    let mc_deg = mc_rad * (180 / Math.PI);
    if (mc_deg < 0) mc_deg += 360;
    
    let ascendantLon = (asc_deg - ayanamsha + 360) % 360;
    let midheavenLon = (mc_deg - ayanamsha + 360) % 360;

    // Traditional Sun-Mao Ming-Gong method
    if (config.mingGongMethod === 'sun_mao_traditional') {
      const vSun = Astronomy.GeoVector(Astronomy.Body.Sun, time, true);
      const eclSun = Astronomy.Ecliptic(vSun);
      const sunSiderealLon = (eclSun.elon - ayanamsha + 360) % 360;

      // 時辰の決定基準 (流派設定):
      // - apparent_solar: 真太陽時 = 太陽の時角 + 12h。均時差と経度差を天文計算で内包する伝統的基準。
      // - standard: 標準時の時計時刻 (夏時刻中は1時間戻して標準時に揃える)
      let timeDec: number;
      if (config.shichenBasis === 'apparent_solar') {
        const observer = new Astronomy.Observer(input.latitude, input.longitude, 0);
        const sunEq = Astronomy.Equator(Astronomy.Body.Sun, time, observer, true, true);
        const lstHours = ((Astronomy.SiderealTime(time) + input.longitude / 15) % 24 + 24) % 24;
        const hourAngle = ((lstHours - sunEq.ra) % 24 + 24) % 24;
        timeDec = (hourAngle + 12) % 24;
      } else {
        const [hour, minute] = input.birthTime.split(':').map(Number);
        timeDec = hour + minute / 60 - (input.isDaylightSaving ? 1 : 0);
      }
      const shichenIndex = Math.floor((((timeDec + 1) % 24 + 24) % 24) / 2); // 0=子, 1=丑, ..., 3=卯

      // 実際のアセンダントは一時辰(2時間)ごとに黄経が約+30°前進する。
      // 卯時(日の出)に命宮=太陽宮、以降は一時辰ごとに+1宮。
      const offsetHouses = (shichenIndex - 3 + 12) % 12;
      ascendantLon = (sunSiderealLon + offsetHouses * 30) % 360;
    }

    // 宿境界テーブル(Lahiriサイデリアル固定)を命盤座標系へ写すためのずれ:
    // 命盤黄経 = トロピカル黄経 − ayanamsha なので、ずれ = Lahiri値 − 使用中のayanamsha値
    const lahiriAyanamsha = getAyanamsha(jsDate, { ...config, zodiacSystem: 'sidereal_lahiri' });
    const mansionOffset = ((lahiriAyanamsha - ayanamsha) % 360 + 360) % 360;

    return {
      ascendant: ascendantLon,
      midheaven: midheavenLon,
      mansionOffset
    };
  }
}
