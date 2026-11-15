import * as Astronomy from 'astronomy-engine';
import { BirthInput, CelestialPosition, ChartAngles, EphemerisProvider, EphemerisProviderInfo } from './types';
import { SchoolConfig, DEFAULT_SCHOOL_CONFIG } from '../qizhengsiyu/schoolConfig';
import { SIDEREAL_MANSIONS } from '../qizhengsiyu/constants';

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

const J2000_MS = Date.UTC(2000, 0, 1, 12, 0, 0);
const centuriesSinceJ2000 = (date: Date) => (date.getTime() - J2000_MS) / (1000 * 60 * 60 * 24 * 36525);

/** J2000 からの黄経の一般歳差 (度)。IAU 2006: p = 5028.796195″T + 1.1054348″T² (Tはユリウス世紀) */
function precessionSinceJ2000(T: number): number {
  return (5028.796195 * T + 1.1054348 * T * T) / 3600;
}

// Lahiri の J2000 元期値。二十八宿の境界表 (constants.ts) もこの値で作っているので、変えるなら表も作り直す
const LAHIRI_AT_J2000 = 23.857;
// Fagan/Bradley は 1950年1月1日 (JD 2433282.5) に 24°02′31.36″ = 24.04204°
// (スイス・エフェメリスの定義値を載せた表による。saravali.github.io/astrology/aya_basics.html、2026-11-16 参照)。
// 以前は「Lahiri＋0.9°」としていたが、実際の差は約0.883°で、約1′ずれていた。
const FAGAN_BRADLEY_AT_1950 = 24.04204;
const T_1950 = (Date.UTC(1950, 0, 1) - J2000_MS) / (1000 * 60 * 60 * 24 * 36525);

function getAyanamsha(date: Date, config: SchoolConfig): number {
  if (config.zodiacSystem === 'tropical') {
    return 0;
  }
  if (config.zodiacSystem === 'sidereal_custom') {
    return config.ayanamshaValue ?? 24.0;
  }
  const precession = precessionSinceJ2000(centuriesSinceJ2000(date));
  if (config.zodiacSystem === 'sidereal_fagan') {
    return FAGAN_BRADLEY_AT_1950 - precessionSinceJ2000(T_1950) + precession;
  }
  return LAHIRI_AT_J2000 + precession; // sidereal_lahiri
}

/** 黄道傾斜角 (平均、度)。IAU 2006 の一次項まで: ε = 23.4392911° − 0.0130042°T */
function meanObliquityDeg(T: number): number {
  return 23.4392911 - 0.0130042 * T;
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
  // J2000黄道座標の経度 → 当日春分点基準 (黄経の一般歳差)
  let lon = (lonJ2000 + precessionSinceJ2000(centuriesSinceJ2000(time.date))) % 360;
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

// 紫氣 (大統暦法)。『明史』巻36 暦志「步四餘」(中国語版ウィキソース、2026-11-15 参照):
//   「紫氣週日一萬零二百二十七日一七九二。」「紫氣度率二十八日」
//   「紫氣至後策八千一百九十四萬九六二三。」(分単位。1日=1万分なので 8194.9623日)
//   「推四餘至後策　置中積，加各餘至後策，滿週日去之，即得。」
//   「紫氣宿次日分立成入箕初度。」「氣孛順行，羅計逆行。」
// 中積は洪武十七年甲子(1384)歳前の天正冬至からの日数 (巻35「置距洪武甲子積年減一，以歲周乘之爲中積」)。
// つまり紫氣は、暦元の冬至の時点で箕宿初度に入ってから 8194.9623日が経っており、
// 10227.1792日 (約28.001年) で周天を一巡する。
//
// 検算 (この読み方が正しいことの裏付け): 同じ節の月孛・羅睺の定数を同じ手順で解くと、
// 暦元の冬至における実際の位置から逆算した起点が 月孛 246.0°・羅睺(降交点) 247.1° となり、
// 距星実測の箕宿初度 247.4° (Lahiri恒星黄経) に 1.4°以内で一致する。暦元を至元辛巳(1281)と
// 読むと 16°・261° と散らばり一致しない。羅睺が降交点である点も宋明式の割当と合う。
//
// 注意: ウィキソースの本文は校正前の版で、立成 (各宿に入る積日の表) は省略されている。
// ここでは宿ごとの零分を使わず、周天を等速で進むものとして求める (差は1°未満)。
const DAY_MS = 24 * 60 * 60 * 1000;
// 洪武十七年甲子歳前の天正冬至 (1383年12月。現代の天文計算による太陽黄経270°の瞬間、先発グレゴリオ暦)
const DATONG_EPOCH_MS = Date.UTC(1383, 11, 21, 18, 21);
const ZIQI_PERIOD_DAYS = 10227.1792;
const ZIQI_DAYS_AFTER_SOLSTICE = 8194.9623;

/** 大統暦法による紫氣の位置。戻り値は Lahiri 恒星黄経 (二十八宿の境界表と同じ座標系) */
export function getZiqiDatongSiderealLongitude(date: Date): number {
  const jiStart = SIDEREAL_MANSIONS.find(m => m.id === 'ji')!.startLongitude; // 箕宿初度
  const days = (date.getTime() - DATONG_EPOCH_MS) / DAY_MS + ZIQI_DAYS_AFTER_SOLSTICE;
  const elapsed = ((days % ZIQI_PERIOD_DAYS) + ZIQI_PERIOD_DAYS) % ZIQI_PERIOD_DAYS;
  return (jiStart + (elapsed / ZIQI_PERIOD_DAYS) * 360) % 360;
}

// 旧試験式。起点の出典がなく、この方式で保存した履歴の再現のためだけに残す
function getZiqiLongitude(date: Date): number {
  const T = (date.getTime() - Date.UTC(2000, 0, 1, 12, 0, 0)) / (1000 * 60 * 60 * 24 * 36525);
  // 紫氣は28年周天 = 12.857°/年 = 1285.71°/ユリウス世紀 (Tは世紀単位)。元期値45.0°(J2000)は出典なし。
  let ziqi = (45.0 + T * 1285.714) % 360;
  if (ziqi < 0) ziqi += 360;
  return ziqi;
}

// 日の出・日の入りとみなす太陽中心の高度 (大気差34′＋視半径16′)
const SUNRISE_ALTITUDE_DEG = -0.833;

export class AstronomyEngineProvider implements EphemerisProvider {
  getProviderInfo(): EphemerisProviderInfo {
    return {
      name: 'astronomy-engine',
      // 手書きの値。package.json の実際の版とずれたら astronomy-engine-provider.test.ts が落ちる
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
    if (config.ziqiOption !== 'none') {
      // 大統暦法は恒星(宿)基準の位置を返すので、Lahiri値を足して当日春分点基準に直してから命盤座標へ写す
      const ziqiRaw = config.ziqiOption === 'datong'
        ? getZiqiDatongSiderealLongitude(jsDate) + getAyanamsha(jsDate, { ...config, zodiacSystem: 'sidereal_lahiri' })
        : getZiqiLongitude(jsDate);
      const ziqiLon = (((ziqiRaw - ayanamsha) % 360) + 360) % 360;
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
    // 黄道傾斜角は出生日の値を使う (J2000 の固定値だと1900年頃で約0.013°ずれる)
    const e = meanObliquityDeg(centuriesSinceJ2000(jsDate)) * (Math.PI / 180);
    // 極点ちょうど (±90°) では tan が発散し、地平線と黄道の交点が定まらない。直前の緯度で止める
    const lat_rad = Math.max(-89.99, Math.min(89.99, input.latitude)) * (Math.PI / 180);
    
    let asc_rad = Math.atan2(Math.cos(lst_rad), -Math.sin(lst_rad) * Math.cos(e) - Math.tan(lat_rad) * Math.sin(e));
    let asc_deg = asc_rad * (180 / Math.PI);
    if (asc_deg < 0) asc_deg += 360;
    
    let mc_rad = Math.atan2(Math.sin(lst_rad), Math.cos(lst_rad) * Math.cos(e));
    let mc_deg = mc_rad * (180 / Math.PI);
    if (mc_deg < 0) mc_deg += 360;

    // 極圏 (緯度が 90°−黄道傾斜角 を超える土地) では、上の式が上昇点ではなく下降点を返す時間帯がある。
    // 上昇点は必ず天頂(MC)から黄経の進む向きに 0〜180° の側にあるので、反対側に出たら 180° 回す
    // (スイス・エフェメリスの houses 計算と同じ扱い)。
    if ((((asc_deg - mc_deg) % 360) + 360) % 360 > 180) {
      asc_deg = (asc_deg + 180) % 360;
    }
    
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
      // 命度は太陽の宮内度数をそのまま命宮に写す「同絡」による
      // (例: 太陽が酉宮15度なら命度は命宮の15度)。時辰内の刻・分で度数を加減する算法は
      // 典拠を確認できていないため採らない。同じ日の同じ時辰の生まれは命度も同じになる。
      const offsetHouses = (shichenIndex - 3 + 12) % 12;
      ascendantLon = (sunSiderealLon + offsetHouses * 30) % 360;
    }

    // 宿境界テーブル(Lahiriサイデリアル固定)を命盤座標系へ写すためのずれ:
    // 命盤黄経 = トロピカル黄経 − ayanamsha なので、ずれ = Lahiri値 − 使用中のayanamsha値
    const lahiriAyanamsha = getAyanamsha(jsDate, { ...config, zodiacSystem: 'sidereal_lahiri' });
    const mansionOffset = ((lahiriAyanamsha - ayanamsha) % 360 + 360) % 360;

    // 昼夜: 出生の瞬間の太陽高度 (大気差なしの幾何高度) で決める
    const sunObserver = new Astronomy.Observer(input.latitude, input.longitude, 0);
    const sunTopo = Astronomy.Equator(Astronomy.Body.Sun, time, sunObserver, true, true);
    const sunAltitude = Astronomy.Horizon(time, sunObserver, sunTopo.ra, sunTopo.dec).altitude;

    return {
      ascendant: ascendantLon,
      midheaven: midheavenLon,
      mansionOffset,
      isDaytime: sunAltitude > SUNRISE_ALTITUDE_DEG,
    };
  }
}
