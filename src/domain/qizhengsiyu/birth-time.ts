import { BirthInput, EphemerisProvider } from '../astronomy/types';
import { SchoolConfig } from './schoolConfig';
import { getHouseAtLongitude, getMansionAtLongitude } from './constants';

// 出生時刻が不明なときの扱い。
//
// 命宮は時辰(安命法)または実測の上昇点で決まるので、時刻が分からなければ定まらない。
// 命宮から導く項目 (命度・命主・命度主・人事十二宮・命宮の会合・大限・小限・流年の宮) は
// 表示もAI鑑定への受け渡しもしない。星曜の位置だけは日付で大半が決まるので計算する。

/** 時刻不明のときに計算に使う時刻。月の位置の誤差を一日の中で最小 (±約6.5°) にするため正午とする */
export const UNKNOWN_BIRTH_TIME = '12:00';

export function isBirthTimeUnknown(input: Pick<BirthInput, 'timeAccuracy'>): boolean {
  return input.timeAccuracy === 'unknown';
}

/** その日のうちに落宮・落宿が変わりうる星曜 */
export interface DayUncertainBody {
  id: string;
  name: string;
  /** その日の0:00と23:59の十二次 (同じなら1つ) */
  houses: string[];
  /** その日の0:00と23:59の宿 (同じなら1つ) */
  mansions: string[];
}

/**
 * 時刻不明の命盤で、出生日の0:00と23:59 (現地時刻) の間に十二次か宿が変わる星曜を返す。
 * 日中の動きは単調なので両端を比べれば足りる (月は一日に約12〜15°進み、半数近くの日で宮か宿が変わる)。
 */
export async function findDayUncertainBodies(
  provider: EphemerisProvider,
  input: BirthInput,
  config: SchoolConfig
): Promise<DayUncertainBody[]> {
  const [start, end, angles] = await Promise.all([
    provider.calculateBodies({ ...input, birthTime: '00:00' }, config),
    provider.calculateBodies({ ...input, birthTime: '23:59' }, config),
    // 宿境界のずれ (mansionOffset) は日付と流派設定で決まり、時刻にはほぼよらない
    provider.calculateAngles({ ...input, birthTime: UNKNOWN_BIRTH_TIME }, config),
  ]);
  const out: DayUncertainBody[] = [];
  for (const s of start) {
    const e = end.find(b => b.id === s.id);
    if (!e) continue;
    const houses = [getHouseAtLongitude(s.longitude).name, getHouseAtLongitude(e.longitude).name];
    const mansions = [
      getMansionAtLongitude(s.longitude, angles.mansionOffset).name,
      getMansionAtLongitude(e.longitude, angles.mansionOffset).name,
    ];
    if (houses[0] !== houses[1] || mansions[0] !== mansions[1]) {
      out.push({ id: s.id, name: s.name, houses: [...new Set(houses)], mansions: [...new Set(mansions)] });
    }
  }
  return out;
}

/** 「月は出生日のうちに金牛宮から陰陽宮へ、畢宿から觜宿へ移る」形式の説明文 */
export function describeDayUncertainBody(b: DayUncertainBody): string {
  const moves: string[] = [];
  if (b.houses.length > 1) moves.push(`${b.houses[0]}宮から${b.houses[1]}宮へ`);
  if (b.mansions.length > 1) moves.push(`${b.mansions[0]}宿から${b.mansions[1]}宿へ`);
  return `${b.name}は出生日のうちに${moves.join('、')}移ります`;
}
