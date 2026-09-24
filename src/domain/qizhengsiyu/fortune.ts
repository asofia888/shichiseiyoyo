import * as Astronomy from 'astronomy-engine';
import { BirthInput } from '../astronomy/types';
import { MVP_HOUSES, PERSON_HOUSES } from './constants';
import { FortuneMethod } from './schoolConfig';

// 大限・小限・流年。
//
// 大限の方式は流派設定 (SchoolConfig.fortuneMethod) で切り替える:
// - guolao (既定): 『果老星宗』十二宮年分歌。命宮から相貌宮→福徳宮→官禄宮…と逆行し、
//   宮ごとに年数が異なる。命宮の年数は童限の算法で決まる。男女で方向は変わらない。
// - yinyang_decade: 命宮を第1大限とし一宮十年。陽男陰女＝順行、陰男陽女＝逆行。
//   紫微斗数・子平の大運に近い運用で、本アプリが当初採用していた方式。
// 小限: 一年一宮。guolao では出生の年(一歳)を命宮とし、財帛宮→兄弟宮…と進む (男女共通)。
//       yinyang_decade では当初の実装どおり大限と同じ向きに進む。
// 流年: その年の太歳(年支)が入る十二次を流年宮とする (方式によらない)。
// 「順行」は人事宮の順 (命宮→財帛宮→兄弟宮…) で、黄経が +30° 進む向き。

export const HEAVENLY_STEMS = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'];
export const EARTHLY_BRANCHES = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];

const DAY_MS = 24 * 60 * 60 * 1000;

/** 立春(太陽の視黄経が315°に達する瞬間)。干支年はここで切り替わる。 */
export function getRisshunUtc(year: number): Date {
  // 2月上旬なので1月20日から探せば必ず見つかる
  const start = Astronomy.MakeTime(new Date(Date.UTC(year, 0, 20)));
  const found = Astronomy.SearchSunLongitude(315, start, 40);
  if (!found) throw new Error(`立春が求められませんでした (${year}年)`);
  return found.date;
}

export interface YearGanzhi {
  year: number;      // 干支年 (立春基準)
  stem: string;
  branch: string;
  stemIndex: number;
  branchIndex: number;
  isYang: boolean;   // 陽干(甲丙戊庚壬)かどうか
}

/** 暦年から干支を求める (立春前かどうかの補正は呼び出し側で済ませておく) */
export function ganzhiOfYear(year: number): YearGanzhi {
  const stemIndex = ((year - 4) % 10 + 10) % 10;
  const branchIndex = ((year - 4) % 12 + 12) % 12;
  return {
    year,
    stem: HEAVENLY_STEMS[stemIndex],
    branch: EARTHLY_BRANCHES[branchIndex],
    stemIndex,
    branchIndex,
    isYang: stemIndex % 2 === 0,
  };
}

/** 出生時刻をUTCに直す。日付・時刻が壊れている・範囲外のレコードでは null。 */
function getBirthUtc(input: BirthInput): Date | null {
  const [y, m, d] = (input.birthDate ?? '').split('-').map(Number);
  const [hh, mm] = (input.birthTime ?? '').split(':').map(Number);
  if (![y, m, d, hh, mm].every(Number.isFinite)) return null;
  if (y < 1600 || y > 2400) return null; // 立春・中氣の探索が保証できる範囲外
  const offset = input.timezoneOffset + (input.isDaylightSaving ? 1 : 0);
  const birthUtc = new Date(Date.UTC(y, m - 1, d, hh, mm) - offset * 3600 * 1000);
  return Number.isNaN(birthUtc.getTime()) ? null : birthUtc;
}

/**
 * 生年月日から、立春を境にした干支年を求める。
 * 日付・時刻が壊れているレコードでは null を返す (呼び出し側が運勢の表示を諦められるようにする)。
 */
export function getBirthYearGanzhi(input: BirthInput): YearGanzhi | null {
  const birthUtc = getBirthUtc(input);
  if (!birthUtc) return null;
  const year = Number(input.birthDate.slice(0, 4));
  // 立春より前に生まれた場合、干支年は前年になる
  return ganzhiOfYear(birthUtc < getRisshunUtc(year) ? year - 1 : year);
}

/**
 * 童限 = 命宮にとどまる年数 (大限の第1限)。『果老星宗』:
 * 「以當生日時，逆數至太陽交中氣時，以三日為一年，一日為四個月，一時為十日，外加十年，即是出童限年數」
 * 中氣は太陽の視黄経(当日春分点基準)が30°の倍数に達する瞬間 (春分・穀雨・小満…)。
 * 暦の節気としての定義なので、命盤の黄道体系(恒星/移動)の設定にはよらない。
 * 値は10〜約20.5年になり、歌訣の「命宮十五」はその平均にあたる。
 */
export function getTongXianYears(birthUtc: Date): number | null {
  const sunLon = Astronomy.SunPosition(birthUtc).elon;
  const zhongqiLon = Math.floor(sunLon / 30) * 30;
  // 太陽が30°進むのは長くても31.5日ほどなので、32日前から探せば直前の中氣が最初に見つかる
  const start = Astronomy.MakeTime(new Date(birthUtc.getTime() - 32 * DAY_MS));
  const found = Astronomy.SearchSunLongitude(zhongqiLon, start, 33);
  if (!found) return null;
  // 中氣ちょうどの生まれでは探索の丸めでわずかに負になりうるので0で止める
  const days = Math.max(0, (birthUtc.getTime() - found.date.getTime()) / DAY_MS);
  return 10 + days / 3;
}

// 『果老星宗』十二宮年分歌:
// 「命宮十五貌宮十，福德妻宮十一詳。官禄十五星高位，遷移止有八年糧。
//   疾厄七兮共六六，財帛兄弟五年強。田宅子孫並奴僕，四年之半定毫芒。」
// 「共六六」は命宮から疾厄宮までの累計 (15+10+11+15+8+7=66) で、
// 大限が命宮→相貌宮→福徳宮→官禄宮→遷移宮→疾厄宮…と逆行することを示している。
// 命宮の年数は童限で決まるので (getTongXianYears)、この表には入れない。
const GUOLAO_YEARS: Record<string, number> = {
  相貌宮: 10,
  福徳宮: 11,
  官禄宮: 15,
  遷移宮: 8,
  疾厄宮: 7,
  妻妾宮: 11,
  奴僕宮: 4.5,
  男女宮: 4.5, // 歌の「子孫」
  田宅宮: 4.5,
  兄弟宮: 5,
  財帛宮: 5,
};

export type FortuneDirection = '順行' | '逆行';

/** 陽男陰女＝順行、陰男陽女＝逆行。性別未指定のレコードは順行とする。 */
export function getFortuneDirection(input: BirthInput, ganzhi: YearGanzhi): {
  direction: FortuneDirection;
  assumed: boolean;
} {
  if (!input.gender) return { direction: '順行', assumed: true };
  const isMale = input.gender === 'male';
  const forward = (ganzhi.isYang && isMale) || (!ganzhi.isYang && !isMale);
  return { direction: forward ? '順行' : '逆行', assumed: false };
}

export interface FortunePeriod {
  /** 十二次の名 (白羊〜双魚) */
  houseName: string;
  branch: string;
  /** 命宮から数えた人事宮の名 */
  personHouseName: string;
  /** 命宮から何宮目か */
  offset: number;
}

export interface DaXianPeriod extends FortunePeriod {
  /** 第何大限か (1始まり) */
  index: number;
  /** 出生からの経過年数での範囲 [始め, 終わり)。果老式では童限により端数が出る */
  range: [number, number];
}

function periodAt(ascendant: number, offset: number, direction: FortuneDirection): FortunePeriod {
  const step = direction === '順行' ? 1 : -1;
  const ascSign = Math.floor((((ascendant % 360) + 360) % 360) / 30);
  const sign = ((ascSign + step * offset) % 12 + 12) % 12;
  const house = MVP_HOUSES[sign];
  // 人事宮は命宮から黄経順行に数えるので、逆行の大限では宮名も逆に進む
  const personIndex = ((sign - ascSign) % 12 + 12) % 12;
  return {
    houseName: house.name,
    branch: house.branch,
    personHouseName: PERSON_HOUSES[personIndex],
    offset,
  };
}

/** 果老式の大限一覧 (命宮から逆行で12宮) */
function listGuolaoDaXian(ascendant: number, tongXianYears: number): DaXianPeriod[] {
  let start = 0;
  return Array.from({ length: 12 }, (_, i) => {
    const period = periodAt(ascendant, i, '逆行');
    const years = i === 0 ? tongXianYears : GUOLAO_YEARS[period.personHouseName];
    const range: [number, number] = [start, start + years];
    start += years;
    return { ...period, index: i + 1, range };
  });
}

/** 一宮十年の大限。index は1始まりで、12を超えると宮が一巡する */
function decadeDaXianAt(ascendant: number, index: number, direction: FortuneDirection): DaXianPeriod {
  return {
    ...periodAt(ascendant, index - 1, direction),
    index,
    range: [(index - 1) * 10, index * 10],
  };
}

export interface FortuneResult {
  method: FortuneMethod;
  targetYear: number;
  age: number;                 // 鑑定年の誕生日を迎えた時点の満年齢
  ganzhi: YearGanzhi;          // 生年の干支
  direction: FortuneDirection; // 大限の進む向き (果老式は常に逆行)
  directionAssumed: boolean;   // 性別未指定で順行と仮定したか (一宮十年式のみ)
  tongXianYears: number | null; // 童限の年数 (果老式のみ)
  daXian: DaXianPeriod | null; // 果老式で年分歌の範囲(約96〜106歳)を超えると null
  daXianList: DaXianPeriod[];  // 表示用の大限一覧 (12宮ぶん)
  xiaoXian: FortunePeriod;     // 小限 (一年一宮)
  liuNian: FortunePeriod;      // 流年 (太歳の入る宮)
  liuNianGanzhi: YearGanzhi;   // 鑑定年の干支
}

/** 生年月日が壊れている・範囲外のときは null。呼び出し側は運勢の表示を省く。 */
export function computeFortune(
  input: BirthInput,
  ascendant: number,
  targetYear: number,
  method: FortuneMethod
): FortuneResult | null {
  const birthUtc = getBirthUtc(input);
  const birthGanzhi = getBirthYearGanzhi(input);
  if (!birthUtc || !birthGanzhi) return null;
  if (!Number.isFinite(targetYear) || targetYear < 1800 || targetYear > 2200) return null;

  const birthYear = Number(input.birthDate.slice(0, 4));
  const age = Math.max(0, targetYear - birthYear); // 鑑定年の誕生日基準

  let direction: FortuneDirection;
  let directionAssumed = false;
  let tongXianYears: number | null = null;
  let daXianList: DaXianPeriod[];
  let daXian: DaXianPeriod | null;
  let xiaoXian: FortunePeriod;

  if (method === 'guolao') {
    tongXianYears = getTongXianYears(birthUtc);
    if (tongXianYears === null) return null;
    direction = '逆行';
    daXianList = listGuolaoDaXian(ascendant, tongXianYears);
    daXian = daXianList.find(d => age >= d.range[0] && age < d.range[1]) ?? null;
    // 小限は一歳(出生の年)を命宮とし、二歳で財帛宮、三歳で兄弟宮へ進む
    xiaoXian = periodAt(ascendant, age % 12, '順行');
  } else {
    const found = getFortuneDirection(input, birthGanzhi);
    direction = found.direction;
    directionAssumed = found.assumed;
    daXianList = Array.from({ length: 12 }, (_, i) => decadeDaXianAt(ascendant, i + 1, direction));
    daXian = decadeDaXianAt(ascendant, Math.floor(age / 10) + 1, direction);
    xiaoXian = periodAt(ascendant, age % 12, direction);
  }

  const liuNianGanzhi = ganzhiOfYear(targetYear);
  // 流年は太歳(年支)が入る十二次。地支から十二次を逆引きする。
  const liuNianHouse = MVP_HOUSES.find(h => h.branch === liuNianGanzhi.branch) ?? MVP_HOUSES[0];
  const ascSign = Math.floor((((ascendant % 360) + 360) % 360) / 30);
  const liuNianSign = MVP_HOUSES.indexOf(liuNianHouse);

  return {
    method,
    targetYear,
    age,
    ganzhi: birthGanzhi,
    direction,
    directionAssumed,
    tongXianYears,
    daXian,
    daXianList,
    xiaoXian,
    liuNian: {
      houseName: liuNianHouse.name,
      branch: liuNianHouse.branch,
      personHouseName: PERSON_HOUSES[((liuNianSign - ascSign) % 12 + 12) % 12],
      offset: ((liuNianSign - ascSign) % 12 + 12) % 12,
    },
    liuNianGanzhi,
  };
}

/** 年齢を小数1桁で表す (整数なら小数点を付けない)。果老式の大限は童限により端数が出る。 */
export function formatAge(years: number): string {
  return String(Math.round(years * 10) / 10);
}

/** 「13.4〜23.4歳」形式。AI鑑定APIのパラメータ検証 (rule-texts.ts) もこの形式を前提にする */
export function formatAgeRange([from, to]: [number, number]): string {
  return `${formatAge(from)}〜${formatAge(to)}歳`;
}
