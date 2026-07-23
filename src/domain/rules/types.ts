import { CelestialPosition, ChartAngles } from '../astronomy/types';

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
  evaluate: (positions: CelestialPosition[], angles: ChartAngles) => RuleHit | null;
}
