import { CelestialPosition, ChartAngles } from '../../astronomy/types';
import { QzsyRule, RuleHit } from '../types';
import { MVP_HOUSES } from '../../qizhengsiyu/constants';

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
        return {
          ruleId: 'r_sun_leo',
          title: '太陽が獅子宮に在中',
          category: 'nature',
          evidence: ['太陽在午(獅子)宮', '昇殿'],
          interpretation: '太陽が本来の座にあり、強いエネルギーを持ちます。積極性と明快さ、リーダーシップを発揮しやすい傾向にあります。',
          strength: 5,
          priority: 10,
          sourceId: '果老星宗',
          ruleSetVersion: '1.0.0'
        };
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
        return {
          ruleId: 'r_moon_cancer',
          title: '月が巨蟹宮に在中',
          category: 'nature',
          evidence: ['月在未(巨蟹)宮', '昇殿'],
          interpretation: '月が本来の座にあり、感受性と共感力が高まります。周囲への配慮が行き届き、家庭や帰属するコミュニティを大切にします。',
          strength: 5,
          priority: 9,
          sourceId: '果老星宗',
          ruleSetVersion: '1.0.0'
        };
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
        return {
          ruleId: 'r_asc_sun_conjunct',
          title: '命宮に太陽が位置',
          category: 'nature',
          evidence: ['太陽在命宮'],
          interpretation: '自己表現力が強く、他者から注目されやすい性質を持ちます。公の場での活躍が期待されます。',
          strength: 4,
          priority: 8,
          sourceId: '星学大成',
          ruleSetVersion: '1.0.0'
        };
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
      // We will just do a simple check for MVP: if it's in the same house or 90/180 degrees away
      const diff = Math.abs(jupHouse.startLongitude - ascHouse.startLongitude);
      const diffHouses = Math.round(diff / 30);
      
      if (diffHouses === 0 || diffHouses === 3 || diffHouses === 6 || diffHouses === 9) {
        return {
          ruleId: 'r_jupiter_angle',
          title: '木星が四正宮に位置',
          category: 'career',
          evidence: ['木星在四正宮'],
          interpretation: '教育、法律、あるいは精神的な指導者としての適性が高い配置です。組織の調整役としても秀でています。',
          strength: 4,
          priority: 7,
          sourceId: '果老星宗',
          ruleSetVersion: '1.0.0'
        };
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
      return {
        ruleId: 'r_general_asc',
        title: `命宮が${ascHouse.name}宮`,
        category: 'nature',
        evidence: [`命宮在${ascHouse.branch}`],
        interpretation: `人生の主軸となる命宮が${ascHouse.name}宮（${ascHouse.branch}）に位置しています。この宮の支配星の影響を強く受けます。`,
        strength: 3,
        priority: 5,
        sourceId: '共通',
        ruleSetVersion: '1.0.0'
      };
    }
  }
];
