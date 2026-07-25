import { BirthInput, CelestialPosition, ChartAngles } from '../astronomy/types';

// 命盤そのもの以外に判定へ必要な情報 (大限・流年は生年と鑑定年が要る)
export interface RuleContext {
  input: BirthInput;
  /** 運勢を見る年。未指定なら大限・流年は判定しない。 */
  targetYear?: number;
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
  evaluate: (positions: CelestialPosition[], angles: ChartAngles, ctx?: RuleContext) => RuleHit | null;
}
