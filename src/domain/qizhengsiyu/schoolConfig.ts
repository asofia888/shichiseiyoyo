export type ZodiacSystem = 'tropical' | 'sidereal_lahiri' | 'sidereal_fagan' | 'sidereal_custom';

export type NodeCalculation = 'mean' | 'true';

export type ApogeeCalculation = 'mean' | 'true';

// 紫氣の算法。
// - 'datong': 『明史』暦志・大統暦法「步四餘」の定数による (出典と検算は astronomy-engine-provider.ts)
// - 'cycle_28': 28年周天・起点45°(J2000) の旧試験式。起点の出典がなく、この方式で保存した
//   履歴を同じ位置で再現するためだけに残している
export type ZiqiOption = 'none' | 'datong' | 'cycle_28';

// 大限・小限の年齢の数え方。
// - 'nominal': 数え年。生まれた年を一歳とし、年が改まるごとに一歳を加える (古法の通例)
// - 'full': 満年齢。本アプリが当初採用していた数え方 (それ以前の履歴の再現に使う)
export type AgeReckoning = 'nominal' | 'full';

export const AGE_RECKONING_LABELS: Record<AgeReckoning, string> = {
  nominal: '数え年（生まれた年を一歳とする）',
  full: '満年齢',
};

export type MingGongMethod = 'ascendant' | 'sun_mao_traditional';

// 羅睺・計都の割当。歴史的に定義が変遷しており流派で異なる:
// - 印度伝来当初(『七曜攘災決』・九執暦の系統): 羅睺=昇交点、計都=月の遠地点(後の月孛に相当)
// - 唐末〜宋(沈括)〜明の暦書系統: 羅睺=降交点・計都=昇交点 (星命家は清代以降も多くこの旧法を踏襲)
// - 清・時憲暦(湯若望以降)および現行インド占星術: 羅睺=昇交点・計都=降交点
// 出典: 中国語版Wikipedia「七政四餘」「計都」「羅睺」(2026-07-23参照)
export type RahuKetuAssignment = 'rahu_ascending' | 'rahu_descending';

// 時辰の決定基準。伝統的な安命法は真太陽時(視太陽時)で時辰を取るのが通例。
// 'apparent_solar' は太陽の時角から算出するため、均時差と経度差を自動的に含む。
export type ShichenBasis = 'standard' | 'apparent_solar';

// 大限の方式。
// - 'guolao': 『果老星宗』十二宮年分歌。命宮から相貌宮→福徳宮→官禄宮…と逆行し、宮ごとに年数が異なる。
//   命宮の年数は童限の算法で決まる。男女で方向は変わらない。
// - 'yinyang_decade': 命宮を第1大限とし一宮十年、陽男陰女＝順行・陰男陽女＝逆行。
//   紫微斗数・子平の大運に近い運用で、本アプリが当初採用していた方式 (それ以前の履歴の再現に使う)。
export type FortuneMethod = 'guolao' | 'yinyang_decade';

export const FORTUNE_METHOD_LABELS: Record<FortuneMethod, string> = {
  guolao: '果老星宗式（命宮から逆行・宮ごとに年数が異なる）',
  yinyang_decade: '陽男陰女・一宮十年',
};

export interface SchoolConfig {
  id: string;
  name: string;
  description: string;
  zodiacSystem: ZodiacSystem;
  ayanamshaValue?: number; // degree for custom
  nodeCalc: NodeCalculation;
  apogeeCalc: ApogeeCalculation;
  ziqiOption: ZiqiOption;
  mingGongMethod: MingGongMethod;
  rahuKetuAssignment: RahuKetuAssignment;
  shichenBasis: ShichenBasis;
  fortuneMethod: FortuneMethod;
  ageReckoning: AgeReckoning;
}

export const SCHOOL_PRESETS: Record<string, SchoolConfig> = {
  traditional: {
    id: 'traditional',
    name: '伝統古法 (明清流派)',
    description: '『星学大成』等の明清古籍に則る流派。恒星黄道(Lahiri)、距星実測の二十八宿、安命法(卯時太陽・真太陽時)、宋明式の羅計(羅睺=降交点・計都=昇交点)、大統暦法の紫氣、数え年の行限を使用します。',
    zodiacSystem: 'sidereal_lahiri',
    nodeCalc: 'mean',
    apogeeCalc: 'mean',
    ziqiOption: 'datong',
    mingGongMethod: 'sun_mao_traditional',
    rahuKetuAssignment: 'rahu_descending',
    shichenBasis: 'apparent_solar',
    fortuneMethod: 'guolao',
    ageReckoning: 'nominal',
  },
  modern: {
    id: 'modern',
    name: '現代天文学流派',
    description: '現代西洋天文学の移動黄道(Tropical)・実測アセンダント(ASC)を基礎とし、真位置の羅計・月孛(接触軌道・イベント補間)で精密な現在星空を描画する現代的流派。羅計は印度・時憲式(羅睺=昇交点)。紫氣は大統暦法による。',
    zodiacSystem: 'tropical',
    nodeCalc: 'true',
    apogeeCalc: 'true',
    ziqiOption: 'datong',
    mingGongMethod: 'ascendant',
    rahuKetuAssignment: 'rahu_ascending',
    shichenBasis: 'standard',
    fortuneMethod: 'guolao',
    ageReckoning: 'full',
  },
  sidereal_mixed: {
    id: 'sidereal_mixed',
    name: '印度・西域融合流派',
    description: 'サイデリアル黄道と実測ASCアセンダント法を組み合わせ、四余の真位置(True Node/Apogee)を採用する精密恒星流派。羅計は印度式(羅睺=昇交点)。紫氣は大統暦法による。',
    zodiacSystem: 'sidereal_lahiri',
    nodeCalc: 'true',
    apogeeCalc: 'true',
    ziqiOption: 'datong',
    mingGongMethod: 'ascendant',
    rahuKetuAssignment: 'rahu_ascending',
    shichenBasis: 'standard',
    fortuneMethod: 'guolao',
    ageReckoning: 'full',
  },
};

export const DEFAULT_SCHOOL_CONFIG: SchoolConfig = SCHOOL_PRESETS.traditional;
