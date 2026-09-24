import { CelestialPosition, ChartAngles } from '../astronomy/types';
import { QzsyRule, RuleHit, RuleContext } from './types';
import { MVP_RULES } from './rule-sets/mvp-rules';
import { isBirthTimeUnknown } from '../qizhengsiyu/birth-time';

export class RuleEngine {
  private rules: QzsyRule[] = MVP_RULES;

  evaluateAll(positions: CelestialPosition[], angles: ChartAngles, ctx?: RuleContext): RuleHit[] {
    const hits: RuleHit[] = [];
    // 出生時刻が不明なら命宮が定まらないので、命宮から導く判定は出さない
    const timeUnknown = !!ctx && isBirthTimeUnknown(ctx.input);
    for (const rule of this.rules) {
      if (timeUnknown && rule.requiresBirthTime) continue;
      const hit = rule.evaluate(positions, angles, ctx);
      if (hit) {
        hits.push(hit);
      }
    }
    return hits;
  }
}
