import { CelestialPosition, ChartAngles } from '../astronomy/types';
import { QzsyRule, RuleHit } from './types';
import { MVP_RULES } from './rule-sets/mvp-rules';

export class RuleEngine {
  private rules: QzsyRule[] = MVP_RULES;

  evaluateAll(positions: CelestialPosition[], angles: ChartAngles): RuleHit[] {
    const hits: RuleHit[] = [];
    for (const rule of this.rules) {
      const hit = rule.evaluate(positions, angles);
      if (hit) {
        hits.push(hit);
      }
    }
    return hits;
  }
}
