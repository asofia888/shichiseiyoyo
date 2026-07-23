export interface Mansion {
  id: string;
  name: string;
  star: string; // 距星 (清・時憲暦の距星同定)
  startLongitude: number; // サイデリアル(Lahiri)黄経 = 距星のJ2000黄経 − 23.857°
  width: number; // 次の距星までの幅 (28宿で円環360°を隙間なく分割)
  element: string; // 木, 金, 土, 日, 月, 火, 水
}

export interface House {
  id: string;
  name: string;
  branch: string; // 子丑寅卯辰巳午未申酉戌亥
  startLongitude: number;
  width: number;
}

// 二十八宿境界テーブル (距星実測に基づくサイデリアル境界)
//
// 出典・生成方法:
// - 距星の同定: 清・時憲暦の距星 (中国語版Wikipedia「二十八宿」距星欄, 2026-07-22参照)
// - 座標: SIMBAD (simbad.cds.unistra.fr) の ICRS J2000 座標 (2026-07-22取得)
// - 変換: 赤道座標(J2000) → 黄道座標(J2000, ε=23.4392911°) → サイデリアル黄経 = λ − 23.857°(Lahiri J2000元期値)
// - 検証: 角宿距星スピカのサイデリアル黄経 = 179.984° ≈ 180° (Lahiri/Citra Paksha の定義と一致)、宿幅合計 = 360.000°
//
// 注意:
// - 配列は角宿を起点とする円環順(黄経の前進順)。歳差により参宿距星(δ Ori)が觜宿距星(φ¹ Ori)より先行するため
//   「参→觜」の順になっている。これは乾隆17年(1752)時憲暦の「参前觜後」改暦と同じ現象で正常。
// - この境界はサイデリアル(Lahiri)基準の固定値。トロピカル等の他座標系の命盤で照合する場合は
//   ChartAngles.mansionOffset を介して getMansionAtLongitude() を使うこと。
export const SIDEREAL_MANSIONS: Mansion[] = [
  { id: 'jiao', name: '角', star: 'α Vir (Spica)', startLongitude: 179.984, width: 10.652, element: '木' },
  { id: 'kang', name: '亢', star: 'κ Vir', startLongitude: 190.637, width: 10.589, element: '金' },
  { id: 'di', name: '氐', star: 'α² Lib', startLongitude: 201.226, width: 17.857, element: '土' },
  { id: 'fang', name: '房', star: 'π Sco', startLongitude: 219.083, width: 4.860, element: '日' },
  { id: 'xin', name: '心', star: 'σ Sco', startLongitude: 223.943, width: 8.356, element: '月' },
  { id: 'wei', name: '尾', star: 'μ¹ Sco', startLongitude: 232.299, width: 15.106, element: '火' },
  { id: 'ji', name: '箕', star: 'γ² Sgr', startLongitude: 247.404, width: 8.920, element: '水' },
  { id: 'dou', name: '斗', star: 'φ Sgr', startLongitude: 256.324, width: 23.866, element: '木' },
  { id: 'niu', name: '牛', star: 'β¹ Cap', startLongitude: 280.190, width: 7.676, element: '金' },
  { id: 'nu', name: '女', star: 'ε Aqr', startLongitude: 287.866, width: 11.672, element: '土' },
  { id: 'xu', name: '虚', star: 'β Aqr', startLongitude: 299.538, width: 9.957, element: '日' },
  { id: 'wei2', name: '危', star: 'α Aqr', startLongitude: 309.495, width: 20.133, element: '月' },
  { id: 'shi', name: '室', star: 'α Peg', startLongitude: 329.629, width: 15.670, element: '火' },
  { id: 'bi', name: '壁', star: 'γ Peg', startLongitude: 345.299, width: 11.424, element: '水' },
  { id: 'kui', name: '奎', star: 'ζ And', startLongitude: 356.723, width: 13.390, element: '木' },
  { id: 'lou', name: '婁', star: 'β Ari', startLongitude: 10.113, width: 12.965, element: '金' },
  { id: 'wei3', name: '胃', star: '35 Ari', startLongitude: 23.078, width: 12.477, element: '土' },
  { id: 'mao', name: '昴', star: '17 Tau (Electra)', startLongitude: 35.555, width: 9.053, element: '日' },
  { id: 'bi2', name: '畢', star: 'ε Tau', startLongitude: 44.608, width: 13.897, element: '月' },
  { id: 'shen', name: '参', star: 'δ Ori (Mintaka)', startLongitude: 58.505, width: 1.244, element: '水' },
  { id: 'zi', name: '觜', star: 'φ¹ Ori', startLongitude: 59.749, width: 11.696, element: '火' },
  { id: 'jing', name: '井', star: 'μ Gem', startLongitude: 71.445, width: 30.427, element: '木' },
  { id: 'gui', name: '鬼', star: 'θ Cnc', startLongitude: 101.871, width: 4.576, element: '金' },
  { id: 'liu', name: '柳', star: 'δ Hya', startLongitude: 106.447, width: 16.975, element: '土' },
  { id: 'xing', name: '星', star: 'α Hya (Alphard)', startLongitude: 123.422, width: 8.412, element: '日' },
  { id: 'zhang', name: '張', star: 'υ¹ Hya', startLongitude: 131.834, width: 17.998, element: '月' },
  { id: 'yi', name: '翼', star: 'α Crt', startLongitude: 149.832, width: 17.036, element: '火' },
  { id: 'zhen', name: '軫', star: 'γ Crv', startLongitude: 166.869, width: 13.116, element: '水' },
];

// 命盤座標系の黄経から宿を判定する。
// chartLon: 命盤の座標系(流派設定に依存)での黄経
// mansionOffset: サイデリアル(Lahiri)境界を命盤座標系へ写すためのずれ (ChartAngles.mansionOffset)
export function getMansionAtLongitude(chartLon: number, mansionOffset: number): Mansion {
  // Lahiriサイデリアルに戻して照合 (不要な+360の往復を避け、境界ちょうどの値の浮動小数点誤差を防ぐ)
  let lon = (chartLon - mansionOffset) % 360;
  if (lon < 0) lon += 360;
  // 「lonを超えない直近のstartLongitudeを持つ宿」を円環上で選ぶ。
  // width との照合だと小数第3位の丸めで±0.001°の隙間・重複が生じうるため、この方式で隙間ゼロを保証する。
  let best: Mansion = SIDEREAL_MANSIONS[0];
  let bestForward = Infinity;
  for (const m of SIDEREAL_MANSIONS) {
    let forward = (lon - m.startLongitude) % 360; // 宿の起点からlonまでの前進量
    if (forward < 0) forward += 360;
    if (forward > 360 - 1e-9) forward = 0; // 境界ちょうどの値の浮動小数点ジッタを吸収
    if (forward < bestForward) {
      bestForward = forward;
      best = m;
    }
  }
  return best;
}

export const MVP_HOUSES: House[] = [
  { id: 'aries', name: '白羊', branch: '戌', startLongitude: 0, width: 30 },
  { id: 'taurus', name: '金牛', branch: '酉', startLongitude: 30, width: 30 },
  { id: 'gemini', name: '陰陽', branch: '申', startLongitude: 60, width: 30 },
  { id: 'cancer', name: '巨蟹', branch: '未', startLongitude: 90, width: 30 },
  { id: 'leo', name: '獅子', branch: '午', startLongitude: 120, width: 30 },
  { id: 'virgo', name: '双女', branch: '巳', startLongitude: 150, width: 30 },
  { id: 'libra', name: '天秤', branch: '辰', startLongitude: 180, width: 30 },
  { id: 'scorpio', name: '天蝎', branch: '卯', startLongitude: 210, width: 30 },
  { id: 'sagittarius', name: '人馬', branch: '寅', startLongitude: 240, width: 30 },
  { id: 'capricorn', name: '磨羯', branch: '丑', startLongitude: 270, width: 30 },
  { id: 'aquarius', name: '宝瓶', branch: '子', startLongitude: 300, width: 30 },
  { id: 'pisces', name: '双魚', branch: '亥', startLongitude: 330, width: 30 },
];
