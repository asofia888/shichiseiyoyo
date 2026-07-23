export type ZodiacSystem = 'tropical' | 'sidereal_lahiri' | 'sidereal_fagan' | 'sidereal_custom';

export type NodeCalculation = 'mean' | 'true';

export type ApogeeCalculation = 'mean' | 'true';

export type ZiqiOption = 'none' | 'cycle_28';

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
}

export const SCHOOL_PRESETS: Record<string, SchoolConfig> = {
  traditional: {
    id: 'traditional',
    name: '伝統古法 (明清流派)',
    description: '『星学大成』等の明清古籍に則る流派。恒星黄道(Lahiri)、距星実測の二十八宿、安命法(卯時太陽・真太陽時)、宋明式の羅計(羅睺=降交点・計都=昇交点)を使用します。紫氣は計算式の出典確認まで既定では無効です(設定で有効化可能)。',
    zodiacSystem: 'sidereal_lahiri',
    nodeCalc: 'mean',
    apogeeCalc: 'mean',
    ziqiOption: 'none',
    mingGongMethod: 'sun_mao_traditional',
    rahuKetuAssignment: 'rahu_descending',
    shichenBasis: 'apparent_solar',
  },
  modern: {
    id: 'modern',
    name: '現代天文学流派',
    description: '現代西洋天文学の移動黄道(Tropical)・実測アセンダント(ASC)を基礎とし、真位置の羅計・月孛(接触軌道・イベント補間)で精密な現在星空を描画する現代的流派。羅計は印度・時憲式(羅睺=昇交点)。',
    zodiacSystem: 'tropical',
    nodeCalc: 'true',
    apogeeCalc: 'true',
    ziqiOption: 'none',
    mingGongMethod: 'ascendant',
    rahuKetuAssignment: 'rahu_ascending',
    shichenBasis: 'standard',
  },
  sidereal_mixed: {
    id: 'sidereal_mixed',
    name: '印度・西域融合流派',
    description: 'サイデリアル黄道と実測ASCアセンダント法を組み合わせ、四余の真位置(True Node/Apogee)を採用する精密恒星流派。羅計は印度式(羅睺=昇交点)。',
    zodiacSystem: 'sidereal_lahiri',
    nodeCalc: 'true',
    apogeeCalc: 'true',
    ziqiOption: 'cycle_28',
    mingGongMethod: 'ascendant',
    rahuKetuAssignment: 'rahu_ascending',
    shichenBasis: 'standard',
  },
};

export const DEFAULT_SCHOOL_CONFIG: SchoolConfig = SCHOOL_PRESETS.traditional;
