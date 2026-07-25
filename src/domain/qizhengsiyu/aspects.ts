import { CelestialPosition } from '../astronomy/types';
import { AspectKind, aspectByHouseDiff, isExactAspect, separationDeg } from '../../../api/_lib/rule-texts';

export interface Aspect {
  a: string; // 星曜名
  b: string;
  kind: AspectKind;
  /** 度数でもぴたりと合っているか (同宮なら「同度」、対照なら「正対」) */
  exact: boolean;
  /** 離角 (0〜180°) */
  separation: number;
}

const signOf = (lon: number) => Math.floor(((((lon % 360) + 360) % 360)) / 30);

/** 2天体の会合を判定する。会合しない組み合わせは null。 */
export function getAspect(
  a: { name: string; longitude: number },
  b: { name: string; longitude: number }
): Aspect | null {
  const kind = aspectByHouseDiff(signOf(a.longitude) - signOf(b.longitude));
  if (!kind) return null;
  return {
    a: a.name,
    b: b.name,
    kind,
    exact: isExactAspect(kind, a.longitude, b.longitude),
    separation: separationDeg(a.longitude, b.longitude),
  };
}

/** 全天体の総当たりで会合表を作る (a<b の一方向のみ) */
export function buildAspectGrid(positions: CelestialPosition[]): Aspect[] {
  const out: Aspect[] = [];
  for (let i = 0; i < positions.length; i++) {
    for (let j = i + 1; j < positions.length; j++) {
      const aspect = getAspect(positions[i], positions[j]);
      if (aspect) out.push(aspect);
    }
  }
  return out;
}

/** ある黄経(命宮・命度など)に対して、どの天体がどう会合するかを求める */
export function getAspectsTo(
  longitude: number,
  positions: CelestialPosition[],
  label: string
): Aspect[] {
  const target = { name: label, longitude };
  return positions
    .map(p => getAspect(target, p))
    .filter((x): x is Aspect => x !== null);
}

/** 会合を種別ごとにまとめ、星曜名を「・」でつないだ表にする (ルールのパラメータ用) */
export function groupByKind(aspects: Aspect[]): Partial<Record<AspectKind, string>> {
  const out: Partial<Record<AspectKind, string>> = {};
  for (const kind of ['同宮', '三合', '対照', '方照', '六合'] as AspectKind[]) {
    const names = aspects.filter(x => x.kind === kind).map(x => x.b);
    if (names.length) out[kind] = names.join('・');
  }
  return out;
}
