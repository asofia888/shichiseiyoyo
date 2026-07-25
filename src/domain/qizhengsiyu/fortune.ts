import * as Astronomy from 'astronomy-engine';
import { BirthInput } from '../astronomy/types';
import { MVP_HOUSES, PERSON_HOUSES } from './constants';

// 大限・小限・流年。
//
// 定義 (流派差が大きいため、採用した説を明記する):
// - 大限: 命宮を第1大限とし、一宮十年。方向は陽男陰女＝順行、陰男陽女＝逆行。
// - 小限: 一年一宮。命宮から起こし、大限と同じ方向へ進む。
// - 流年: その年の太歳(年支)が入る十二次を流年宮とする。
// 「順行」は人事宮の順 (命宮→財帛宮→兄弟宮…) で、黄経が +30° 進む向き。

export const HEAVENLY_STEMS = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'];
export const EARTHLY_BRANCHES = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];

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

/**
 * 生年月日から、立春を境にした干支年を求める。
 * 日付・時刻が壊れているレコードでは null を返す (呼び出し側が運勢の表示を諦められるようにする)。
 */
export function getBirthYearGanzhi(input: BirthInput): YearGanzhi | null {
  const [y, m, d] = (input.birthDate ?? '').split('-').map(Number);
  const [hh, mm] = (input.birthTime ?? '').split(':').map(Number);
  if (![y, m, d, hh, mm].every(Number.isFinite)) return null;
  if (y < 1600 || y > 2400) return null; // 立春探索が保証できる範囲外
  const offset = input.timezoneOffset + (input.isDaylightSaving ? 1 : 0);
  const birthUtc = new Date(Date.UTC(y, m - 1, d, hh, mm) - offset * 3600 * 1000);
  if (Number.isNaN(birthUtc.getTime())) return null;
  // 立春より前に生まれた場合、干支年は前年になる
  return ganzhiOfYear(birthUtc < getRisshunUtc(y) ? y - 1 : y);
}

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

export interface FortuneResult {
  targetYear: number;
  age: number;                 // 鑑定年の誕生日を迎えた時点の満年齢
  ganzhi: YearGanzhi;          // 生年の干支
  direction: FortuneDirection;
  directionAssumed: boolean;   // 性別未指定で順行と仮定したか
  daXian: FortunePeriod;       // 大限 (一宮十年)
  daXianIndex: number;         // 第何大限か (1始まり)
  daXianRange: [number, number]; // その大限の年齢範囲
  xiaoXian: FortunePeriod;     // 小限 (一年一宮)
  liuNian: FortunePeriod;      // 流年 (太歳の入る宮)
  liuNianGanzhi: YearGanzhi;   // 鑑定年の干支
}

/** 生年月日が壊れている・範囲外のときは null。呼び出し側は運勢の表示を省く。 */
export function computeFortune(input: BirthInput, ascendant: number, targetYear: number): FortuneResult | null {
  const birthGanzhi = getBirthYearGanzhi(input);
  if (!birthGanzhi) return null;
  if (!Number.isFinite(targetYear) || targetYear < 1800 || targetYear > 2200) return null;
  const { direction, assumed } = getFortuneDirection(input, birthGanzhi);

  const birthYear = Number(input.birthDate.slice(0, 4));
  const age = Math.max(0, targetYear - birthYear); // 鑑定年の誕生日基準

  const daXianIndex = Math.floor(age / 10) + 1;
  const liuNianGanzhi = ganzhiOfYear(targetYear);
  // 流年は太歳(年支)が入る十二次。地支から十二次を逆引きする。
  const liuNianHouse = MVP_HOUSES.find(h => h.branch === liuNianGanzhi.branch) ?? MVP_HOUSES[0];
  const ascSign = Math.floor((((ascendant % 360) + 360) % 360) / 30);
  const liuNianSign = MVP_HOUSES.indexOf(liuNianHouse);

  return {
    targetYear,
    age,
    ganzhi: birthGanzhi,
    direction,
    directionAssumed: assumed,
    daXian: periodAt(ascendant, daXianIndex - 1, direction),
    daXianIndex,
    daXianRange: [(daXianIndex - 1) * 10, daXianIndex * 10],
    xiaoXian: periodAt(ascendant, age % 12, direction),
    liuNian: {
      houseName: liuNianHouse.name,
      branch: liuNianHouse.branch,
      personHouseName: PERSON_HOUSES[((liuNianSign - ascSign) % 12 + 12) % 12],
      offset: ((liuNianSign - ascSign) % 12 + 12) % 12,
    },
    liuNianGanzhi,
  };
}

/** 命宮から数えた大限の一覧 (表示用・12宮ぶん) */
export function listDaXian(ascendant: number, direction: FortuneDirection): (FortunePeriod & { range: [number, number] })[] {
  return Array.from({ length: 12 }, (_, i) => ({
    ...periodAt(ascendant, i, direction),
    range: [i * 10, (i + 1) * 10] as [number, number],
  }));
}
