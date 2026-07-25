import { QzsyRule } from '../types';
import {
  getHouseAtLongitude,
  getMansionAtLongitude,
  getPersonHouseAt,
  getMingZhu,
  getMingDuZhu,
  MVP_HOUSES,
} from '../../qizhengsiyu/constants';
import { getAspectsTo, groupByKind } from '../../qizhengsiyu/aspects';
import { computeFortune } from '../../qizhengsiyu/fortune';
import { buildCanonicalRuleHit, SEVEN_GOVERNORS } from '../../../../api/_lib/rule-texts';

// 下の七政の対表が rule-texts.ts 側の正規名と食い違っていないことを起動時に確かめる
const PAIRED_STAR_NAMES = ['太陽', '月', '水星', '金星', '火星', '木星', '土星'];
if (PAIRED_STAR_NAMES.join() !== SEVEN_GOVERNORS.join()) {
  throw new Error('七政の星曜名が rule-texts.ts の SEVEN_GOVERNORS と一致しません');
}

// 各ルールの判定条件はここに置くが、鑑定テキストは api/_lib/rule-texts.ts の
// 正規テーブルを単一情報源とする (表示とAI鑑定プロンプトの食い違いを防ぐ)。
//
// 星曜1つにつきRuleHitは1件にまとめている。廟旺・落宮・人事宮・星宿生剋を
// 別々のルールに割ると、AI鑑定APIの上限(20件)を超えてしまうため。

const getHouse = getHouseAtLongitude;
const signOf = (lon: number) => Math.floor(((lon % 360) + 360) % 360 / 30);

/** 星曜の落宮・人事宮・落宿をルールのパラメータに変換する */
function placementParams(
  positions: { id: string; name: string; longitude: number }[],
  bodyId: string,
  angles: { ascendant: number; mansionOffset: number }
) {
  const body = positions.find(p => p.id === bodyId);
  if (!body) return null;
  return {
    body,
    params: {
      houseName: getHouse(body.longitude).name,
      personHouseName: getPersonHouseAt(body.longitude, angles.ascendant).name,
      mansionName: getMansionAtLongitude(body.longitude, angles.mansionOffset).name,
    },
  };
}

// 七政(太陽〜土星)の落宮ルール。廟旺と星宿生剋はサーバー側の正規表から導出される。
function sevenGovernorRule(bodyId: string, starName: string): QzsyRule {
  return {
    id: `r_star_placement_${bodyId}`,
    title: `${starName}の落宮と廟旺`,
    category: 'nature',
    evaluate: (positions, angles) => {
      const found = placementParams(positions, bodyId, angles);
      if (!found) return null;
      const params = { starName, ...found.params };
      const hit = buildCanonicalRuleHit('r_star_placement', params);
      return hit ? { ...hit, params } : null;
    },
  };
}

// 四余(羅睺・計都・月孛・紫氣)の落宮ルール。
// 星曜が存在しない場合 (紫氣は流派設定で無効にできる) は判定しない。
function siyuPlacementRule(bodyId: string, ruleId: string, title: string): QzsyRule {
  return {
    id: ruleId,
    title,
    category: 'theme',
    evaluate: (positions, angles) => {
      const found = placementParams(positions, bodyId, angles);
      if (!found) return null;
      const hit = buildCanonicalRuleHit(ruleId, found.params);
      return hit ? { ...hit, params: found.params } : null;
    },
  };
}

export const MVP_RULES: QzsyRule[] = [
  // 命主: 命宮の宮主星がどこに在るか。七政四余で最も重く見る一つ。
  {
    id: 'r_ming_zhu',
    title: '命主の在処',
    category: 'nature',
    evaluate: (positions, angles) => {
      const houseName = getHouse(angles.ascendant).name;
      const lordName = getMingZhu(angles.ascendant);
      const lord = positions.find(p => p.name === lordName);
      if (!lord) return null; // 命主が七政にない構成では判定しない
      const params = {
        houseName,
        lordName,
        lordHouseName: getHouse(lord.longitude).name,
        lordPersonHouseName: getPersonHouseAt(lord.longitude, angles.ascendant).name,
      };
      const hit = buildCanonicalRuleHit('r_ming_zhu', params);
      return hit ? { ...hit, params } : null;
    },
  },
  // 命度主: 命度が落ちる宿の宿主星。命主と同じく、その星がどこに在り
  // どんな状態かまで渡す (宿名だけでは読み手に判断を丸投げすることになる)。
  {
    id: 'r_ming_du_zhu',
    title: '命度主',
    category: 'nature',
    evaluate: (positions, angles) => {
      const { mansionName, star } = getMingDuZhu(angles.ascendant, angles.mansionOffset);
      const lord = positions.find(p => p.name === star);
      if (!lord) return null;
      const params = {
        mansionName,
        lordHouseName: getHouse(lord.longitude).name,
        lordPersonHouseName: getPersonHouseAt(lord.longitude, angles.ascendant).name,
        lordMansionName: getMansionAtLongitude(lord.longitude, angles.mansionOffset).name,
      };
      const hit = buildCanonicalRuleHit('r_ming_du_zhu', params);
      return hit ? { ...hit, params } : null;
    },
  },
  {
    id: 'r_general_asc',
    title: '命宮の基本性質',
    category: 'nature',
    evaluate: (_positions, angles) => {
      const ascHouse = getHouse(angles.ascendant);
      const params = { houseName: ascHouse.name };
      const hit = buildCanonicalRuleHit('r_general_asc', params);
      return hit ? { ...hit, params } : null;
    },
  },
  {
    id: 'r_jupiter_angle',
    title: '木星の好配置',
    category: 'career',
    evaluate: (positions, angles) => {
      const jup = positions.find(p => p.id === 'Jupiter');
      if (!jup) return null;
      // 命宮から見て四正(1・4・7・10宮)に当たるか
      const diffHouses = getPersonHouseAt(jup.longitude, angles.ascendant).index;
      if (diffHouses % 3 !== 0) return null;
      return buildCanonicalRuleHit('r_jupiter_angle');
    },
  },
  // 大限・小限・流年。鑑定年が渡されたときだけ判定する。
  {
    id: 'r_da_xian',
    title: '大限',
    category: 'fortune',
    evaluate: (_positions, angles, ctx) => {
      if (!ctx?.targetYear) return null;
      const f = computeFortune(ctx.input, angles.ascendant, ctx.targetYear);
      if (!f) return null;
      const params = {
        houseName: f.daXian.houseName,
        personHouseName: f.daXian.personHouseName,
        direction: f.direction,
        ageRange: `${f.daXianRange[0]}〜${f.daXianRange[1]}歳`,
        index: String(f.daXianIndex),
        xiaoXianHouse: f.xiaoXian.personHouseName,
      };
      const hit = buildCanonicalRuleHit('r_da_xian', params);
      return hit ? { ...hit, params } : null;
    },
  },
  {
    id: 'r_liu_nian',
    title: '流年',
    category: 'fortune',
    evaluate: (_positions, angles, ctx) => {
      if (!ctx?.targetYear) return null;
      const f = computeFortune(ctx.input, angles.ascendant, ctx.targetYear);
      if (!f) return null;
      const params = {
        houseName: f.liuNian.houseName,
        personHouseName: f.liuNian.personHouseName,
        yearGanzhi: `${f.liuNianGanzhi.stem}${f.liuNianGanzhi.branch}`,
        year: String(f.targetYear),
      };
      const hit = buildCanonicalRuleHit('r_liu_nian', params);
      return hit ? { ...hit, params } : null;
    },
  },
  // 命宮・命主の会合 (三方四正)。総当たり55組は会合表としてUIに出し、
  // AIには要になるこの2件だけを渡す。
  {
    id: 'r_ming_gong_aspects',
    title: '命宮の会合',
    category: 'nature',
    evaluate: (positions, angles) => {
      const params = groupByKind(getAspectsTo(angles.ascendant, positions, '命宮'));
      if (Object.keys(params).length === 0) return null;
      const hit = buildCanonicalRuleHit('r_ming_gong_aspects', params);
      return hit ? { ...hit, params } : null;
    },
  },
  {
    id: 'r_ming_zhu_aspects',
    title: '命主の会合',
    category: 'nature',
    evaluate: (positions, angles) => {
      const lord = positions.find(p => p.name === getMingZhu(angles.ascendant));
      if (!lord) return null;
      // 命主自身は除いて会合を見る
      const others = positions.filter(p => p.id !== lord.id);
      const params = groupByKind(getAspectsTo(lord.longitude, others, '命主'));
      if (Object.keys(params).length === 0) return null;
      const hit = buildCanonicalRuleHit('r_ming_zhu_aspects', params);
      return hit ? { ...hit, params } : null;
    },
  },
  // 格局
  {
    id: 'r_geju_sun_moon_embrace',
    title: '格局: 日月夾命',
    category: 'nature',
    evaluate: (positions, angles) => {
      const sun = positions.find(p => p.id === 'Sun');
      const moon = positions.find(p => p.id === 'Moon');
      if (!sun || !moon) return null;
      const ascSign = signOf(angles.ascendant);
      const prev = (ascSign + 11) % 12;
      const next = (ascSign + 1) % 12;
      const sunSign = signOf(sun.longitude);
      const moonSign = signOf(moon.longitude);
      const embraced =
        (sunSign === prev && moonSign === next) || (sunSign === next && moonSign === prev);
      if (!embraced) return null;
      const params = { stars: '太陽・月' };
      const hit = buildCanonicalRuleHit('r_geju_sun_moon_embrace', params);
      return hit ? { ...hit, params } : null;
    },
  },
  {
    id: 'r_geju_sun_moon_same',
    title: '格局: 日月同宮',
    category: 'nature',
    evaluate: (positions) => {
      const sun = positions.find(p => p.id === 'Sun');
      const moon = positions.find(p => p.id === 'Moon');
      if (!sun || !moon) return null;
      if (signOf(sun.longitude) !== signOf(moon.longitude)) return null;
      const params = { stars: '太陽・月', houseName: getHouse(sun.longitude).name };
      const hit = buildCanonicalRuleHit('r_geju_sun_moon_same', params);
      return hit ? { ...hit, params } : null;
    },
  },
  {
    id: 'r_geju_lord_in_ming',
    title: '格局: 命主居命',
    category: 'nature',
    evaluate: (positions, angles) => {
      const lordName = getMingZhu(angles.ascendant);
      const lord = positions.find(p => p.name === lordName);
      if (!lord) return null;
      if (signOf(lord.longitude) !== signOf(angles.ascendant)) return null;
      const params = { stars: lordName, houseName: getHouse(angles.ascendant).name };
      const hit = buildCanonicalRuleHit('r_geju_lord_in_ming', params);
      return hit ? { ...hit, params } : null;
    },
  },
  {
    id: 'r_geju_cluster',
    title: '格局: 聚星',
    category: 'nature',
    evaluate: (positions) => {
      // 七政のうち3つ以上が同一宮に集まるか
      const sevens = positions.filter(p => PAIRED_STAR_NAMES.includes(p.name));
      const bySign = new Map<number, string[]>();
      for (const p of sevens) {
        const s = signOf(p.longitude);
        bySign.set(s, [...(bySign.get(s) ?? []), p.name]);
      }
      let best: { sign: number; names: string[] } | null = null;
      for (const [sign, names] of bySign) {
        if (names.length >= 3 && (!best || names.length > best.names.length)) best = { sign, names };
      }
      if (!best) return null;
      const params = { stars: best.names.join('・'), houseName: MVP_HOUSES[best.sign].name };
      const hit = buildCanonicalRuleHit('r_geju_cluster', params);
      return hit ? { ...hit, params } : null;
    },
  },
  {
    id: 'r_geju_toward_ming',
    title: '格局: 七政朝命',
    category: 'nature',
    evaluate: (positions, angles) => {
      const sevens = positions.filter(p => PAIRED_STAR_NAMES.includes(p.name));
      const toward = getAspectsTo(angles.ascendant, sevens, '命宮')
        .filter(x => x.kind === '三合' || x.kind === '対照')
        .map(x => x.b);
      if (toward.length < 3) return null;
      const params = { stars: toward.join('・') };
      const hit = buildCanonicalRuleHit('r_geju_toward_ming', params);
      return hit ? { ...hit, params } : null;
    },
  },
  // 七政の落宮・廟旺・星宿生剋。
  // 天体IDと星曜名は添字で結び付けず対で書く (別ファイルの並び順に依存させると、
  // そちらを並べ替えたときに星が入れ替わっても誰も気づけない)。
  ...([
    ['Sun', '太陽'], ['Moon', '月'], ['Mercury', '水星'], ['Venus', '金星'],
    ['Mars', '火星'], ['Jupiter', '木星'], ['Saturn', '土星'],
  ] as const).map(([bodyId, starName]) => sevenGovernorRule(bodyId, starName)),
  // 四余の落宮。七政と同格に扱う。
  siyuPlacementRule('Rahu', 'r_rahu_placement', '羅睺の落宮'),
  siyuPlacementRule('Ketu', 'r_ketu_placement', '計都の落宮'),
  siyuPlacementRule('Yuebei', 'r_yuebei_placement', '月孛の落宮'),
  siyuPlacementRule('Ziqi', 'r_ziqi_placement', '紫氣の落宮'),
];
