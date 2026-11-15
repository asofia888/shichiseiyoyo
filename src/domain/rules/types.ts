import { BirthInput, CelestialPosition, ChartAngles } from '../astronomy/types';
import { FortuneMethod, AgeReckoning, ZiqiOption } from '../qizhengsiyu/schoolConfig';

// 命盤そのもの以外に判定へ必要な情報 (大限・流年は生年と鑑定年が要る)
export interface RuleContext {
  input: BirthInput;
  /** 運勢を見る年。未指定なら大限・流年は判定しない。 */
  targetYear?: number;
  /** 大限の方式 (流派設定)。既定値を持たせず、必ず呼び出し側の流派設定から渡す */
  fortuneMethod: FortuneMethod;
  /** 大限・小限の年齢の数え方 (流派設定)。未指定は満年齢 (この項目を設ける前の数え方) */
  ageReckoning?: AgeReckoning;
  /** 紫氣の算法 (流派設定)。旧試験式の位置には但し書きを付けるために渡す */
  ziqiOption?: ZiqiOption;
  /** 時刻不明の命盤で、出生日のうちに落宮・落宿が変わる星曜のID (findDayUncertainBodies) */
  uncertainBodyIds?: string[];
}

export interface RuleHit {
  ruleId: string;
  title: string;
  category: string;
  evidence: string[];
  interpretation: string;
  strength: number;
  priority: number;
  sourceId: string;
  ruleSetVersion: string;
  // AI鑑定APIへ送る限定パラメータ (例: r_general_asc の宮名)。
  // APIには文章ではなく ruleId + params のみを送り、サーバー側で正規テーブルから再構成する。
  params?: Record<string, string>;
}

export interface QzsyRule {
  id: string;
  title: string;
  category: string;
  /** 命宮から導く判定。出生時刻が不明な命盤では評価しない */
  requiresBirthTime?: boolean;
  evaluate: (positions: CelestialPosition[], angles: ChartAngles, ctx?: RuleContext) => RuleHit | null;
}
