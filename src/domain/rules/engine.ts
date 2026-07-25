import { CelestialPosition, ChartAngles } from '../astronomy/types';
import { QzsyRule, RuleHit, RuleContext } from './types';
import { MVP_RULES } from './rule-sets/mvp-rules';

export class RuleEngine {
  private rules: QzsyRule[] = MVP_RULES;

  evaluateAll(positions: CelestialPosition[], angles: ChartAngles, ctx?: RuleContext): RuleHit[] {
    const hits: RuleHit[] = [];
    for (const rule of this.rules) {
      const hit = rule.evaluate(positions, angles, ctx);
      if (hit) {
        hits.push(hit);
      }
    }
    return hits;
  }
}
