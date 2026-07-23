import { CelestialPosition, ChartAngles } from '../../astronomy/types';
import { QzsyRule } from '../types';
import { MVP_HOUSES } from '../../qizhengsiyu/constants';
import { buildCanonicalRuleHit } from '../../../../api/_lib/rule-texts';

// 各ルールの判定条件はここに置くが、鑑定テキストは api/_lib/rule-texts.ts の
// 正規テーブルを単一情報源とする (表示とAI鑑定プロンプトの食い違いを防ぐ)。

function getHouse(lon: number) {
  return MVP_HOUSES.find(h => lon >= h.startLongitude && lon < h.startLongitude + h.width) || MVP_HOUSES[0];
}

export const MVP_RULES: QzsyRule[] = [
  {
    id: 'r_sun_leo',
    title: '太陽・獅子宮（升殿）',
    category: 'nature',
    evaluate: (positions) => {
      const sun = positions.find(p => p.id === 'Sun');
      if (!sun) return null;
      const house = getHouse(sun.longitude);
      if (house.id === 'leo') {
        return buildCanonicalRuleHit('r_sun_leo');
      }
      return null;
    }
  },
  {
    id: 'r_moon_cancer',
    title: '月・巨蟹宮（升殿）',
    category: 'nature',
    evaluate: (positions) => {
      const moon = positions.find(p => p.id === 'Moon');
      if (!moon) return null;
      const house = getHouse(moon.longitude);
      if (house.id === 'cancer') {
        return buildCanonicalRuleHit('r_moon_cancer');
      }
      return null;
    }
  },
  {
    id: 'r_asc_sun_conjunct',
    title: '命宮と太陽の同宮',
    category: 'nature',
    evaluate: (positions, angles) => {
      const sun = positions.find(p => p.id === 'Sun');
      if (!sun) return null;
      const ascHouse = getHouse(angles.ascendant);
      const sunHouse = getHouse(sun.longitude);
      if (ascHouse.id === sunHouse.id) {
        return buildCanonicalRuleHit('r_asc_sun_conjunct');
      }
      return null;
    }
  },
  {
    id: 'r_jupiter_angle',
    title: '木星の好配置',
    category: 'career',
    evaluate: (positions, angles) => {
      const jup = positions.find(p => p.id === 'Jupiter');
      if (!jup) return null;
      const ascHouse = getHouse(angles.ascendant);
      const jupHouse = getHouse(jup.longitude);

      // Rough check if Jupiter is in angular houses (1, 4, 7, 10) relative to Ascendant
      const diff = Math.abs(jupHouse.startLongitude - ascHouse.startLongitude);
      const diffHouses = Math.round(diff / 30);

      if (diffHouses === 0 || diffHouses === 3 || diffHouses === 6 || diffHouses === 9) {
        return buildCanonicalRuleHit('r_jupiter_angle');
      }
      return null;
    }
  },
  {
    id: 'r_general_asc',
    title: '命宮の基本性質',
    category: 'nature',
    evaluate: (positions, angles) => {
      const ascHouse = getHouse(angles.ascendant);
      const params = { houseName: ascHouse.name };
      const hit = buildCanonicalRuleHit('r_general_asc', params);
      return hit ? { ...hit, params } : null;
    }
  }
];
