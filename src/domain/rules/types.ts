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
}

export interface QzsyRule {
  id: string;
  title: string;
  category: string;
  evaluate: (positions: CelestialPosition[], angles: ChartAngles) => RuleHit | null;
}
