// 鑑定ルールの正規テキストテーブル (単一情報源)
//
// クライアント(src/domain/rules/rule-sets/mvp-rules.ts)の表示と、
// サーバー(appraisal-core.ts)のAI鑑定プロンプト再構成の両方がここを参照する。
// /api/appraisal はルールIDと限定パラメータのみを受け付け、文章は必ずこの
// テーブルから再構成するため、任意テキストの注入(プロンプトインジェクション)が
// 構造的に不可能になる。

export interface CanonicalRuleHit {
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

const RULE_SET_VERSION = '1.0.0';

// 十二宮名 → 地支 の正規対応 (パラメータ検証にも使う)
export const HOUSE_BRANCHES: Record<string, string> = {
  白羊: '戌', 金牛: '酉', 陰陽: '申', 巨蟹: '未', 獅子: '午', 双女: '巳',
  天秤: '辰', 天蝎: '卯', 人馬: '寅', 磨羯: '丑', 宝瓶: '子', 双魚: '亥',
};

type RuleBuilder = (params: Record<string, string>) => CanonicalRuleHit | null;

const RULE_BUILDERS: Record<string, RuleBuilder> = {
  r_sun_leo: () => ({
    ruleId: 'r_sun_leo',
    title: '太陽が獅子宮に在中',
    category: 'nature',
    evidence: ['太陽在午(獅子)宮', '昇殿'],
    interpretation: '太陽が本来の座にあり、強いエネルギーを持ちます。積極性と明快さ、リーダーシップを発揮しやすい傾向にあります。',
    strength: 5,
    priority: 10,
    sourceId: '果老星宗',
    ruleSetVersion: RULE_SET_VERSION,
  }),
  r_moon_cancer: () => ({
    ruleId: 'r_moon_cancer',
    title: '月が巨蟹宮に在中',
    category: 'nature',
    evidence: ['月在未(巨蟹)宮', '昇殿'],
    interpretation: '月が本来の座にあり、感受性と共感力が高まります。周囲への配慮が行き届き、家庭や帰属するコミュニティを大切にします。',
    strength: 5,
    priority: 9,
    sourceId: '果老星宗',
    ruleSetVersion: RULE_SET_VERSION,
  }),
  r_asc_sun_conjunct: () => ({
    ruleId: 'r_asc_sun_conjunct',
    title: '命宮に太陽が位置',
    category: 'nature',
    evidence: ['太陽在命宮'],
    interpretation: '自己表現力が強く、他者から注目されやすい性質を持ちます。公の場での活躍が期待されます。',
    strength: 4,
    priority: 8,
    sourceId: '星学大成',
    ruleSetVersion: RULE_SET_VERSION,
  }),
  r_jupiter_angle: () => ({
    ruleId: 'r_jupiter_angle',
    title: '木星が四正宮に位置',
    category: 'career',
    evidence: ['木星在四正宮'],
    interpretation: '教育、法律、あるいは精神的な指導者としての適性が高い配置です。組織の調整役としても秀でています。',
    strength: 4,
    priority: 7,
    sourceId: '果老星宗',
    ruleSetVersion: RULE_SET_VERSION,
  }),
  r_general_asc: (params) => {
    const houseName = params.houseName;
    // 宮名はホワイトリストで検証し、地支はサーバー側の正規対応から導出する
    const branch = houseName ? HOUSE_BRANCHES[houseName] : undefined;
    if (!houseName || !branch) return null;
    return {
      ruleId: 'r_general_asc',
      title: `命宮が${houseName}宮`,
      category: 'nature',
      evidence: [`命宮在${branch}`],
      interpretation: `人生の主軸となる命宮が${houseName}宮（${branch}）に位置しています。この宮の支配星の影響を強く受けます。`,
      strength: 3,
      priority: 5,
      sourceId: '共通',
      ruleSetVersion: RULE_SET_VERSION,
    };
  },
};

// ruleId と限定パラメータから正規のRuleHitを再構成する。
// 未知のruleId・不正なパラメータは null (呼び出し側で400にする)。
export function buildCanonicalRuleHit(
  ruleId: string,
  params: Record<string, string> = {}
): CanonicalRuleHit | null {
  const builder = RULE_BUILDERS[ruleId];
  if (!builder) return null;
  return builder(params);
}
