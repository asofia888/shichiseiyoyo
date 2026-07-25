// 命盤上の星曜の描画位置(段)を決める。
//
// 星曜は必ず真の黄経に描く (描画角をずらすと落宮が変わって見えてしまうため)。
// 黄経が近いもの同士はラベルが重なるので、内側の段へ逃がして距離を稼ぐ。
// 同じ段では「一文字ラベルが重ならない角度」を満たすものだけを並べる。

export interface BodyPlacement<T> {
  body: T;
  radius: number;
  level: number;
}

const normalize = (deg: number) => ((deg % 360) + 360) % 360;

/** 円環上の2つの黄経の角度差 (0〜180°) */
export function angularGap(a: number, b: number): number {
  return Math.abs(normalize(a - b + 180) - 180);
}

/** 半径 radius の円周上で clearancePx 離れるために必要な角度 */
export function minGapAt(radius: number, clearancePx: number): number {
  return 2 * Math.asin(Math.min(1, clearancePx / (2 * radius))) * (180 / Math.PI);
}

/**
 * 各星曜を段(半径)へ振り分ける。
 * 空いている段から順に使い、どの段も満たせない場合は「最も近い星曜との角度が最大になる段」に置く
 * (無条件に最内周へ入れると、そこで完全に重なってしまうため)。
 */
export function assignBodyLevels<T extends { longitude: number }>(
  bodies: T[],
  levelRadii: number[],
  clearancePx: number
): BodyPlacement<T>[] {
  const sorted = [...bodies].sort((a, b) => a.longitude - b.longitude);
  const placed: number[][] = levelRadii.map(() => []);

  return sorted.map((body) => {
    let level = -1;
    for (let i = 0; i < levelRadii.length; i++) {
      const required = minGapAt(levelRadii[i], clearancePx);
      if (placed[i].every(lon => angularGap(lon, body.longitude) >= required)) {
        level = i;
        break;
      }
    }
    if (level < 0) {
      // どの段にも空きがない: 一番マシな段 (最近接星曜との実距離が最大になる段) を選ぶ
      let bestScore = -Infinity;
      level = levelRadii.length - 1;
      for (let i = 0; i < levelRadii.length; i++) {
        const nearestDeg = Math.min(...placed[i].map(lon => angularGap(lon, body.longitude)));
        // 角度ではなく実際の弦長で比べる (内側の段は同じ角度でも距離が短いため)
        const chordPx = 2 * levelRadii[i] * Math.sin((nearestDeg / 2) * (Math.PI / 180));
        if (chordPx > bestScore) {
          bestScore = chordPx;
          level = i;
        }
      }
    }
    placed[level].push(body.longitude);
    return { body, radius: levelRadii[level], level };
  });
}
