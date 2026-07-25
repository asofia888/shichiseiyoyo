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

// ルールセットの版。判定条件や文言を変えたら必ず上げること。
// 保存済みの鑑定文がどの版で生成されたかを後から辿れるようにするため。
// 2.0.0: 人事十二宮・入宿度・命主/命度主・廟旺・五行生剋・三方四正・格局・大限流年を追加し、
//        r_sun_leo / r_moon_cancer / r_asc_sun_conjunct を r_star_placement に統合
const RULE_SET_VERSION = '2.0.0';

// 十二宮名 → 地支 の正規対応 (パラメータ検証にも使う)。
// 参照には必ず lookupBranch() を使うこと。素の添字参照だと "constructor" 等の
// Object.prototype 由来の名前が truthy を返し、ホワイトリストをすり抜ける。
export const HOUSE_BRANCHES: Record<string, string> = {
  白羊: '戌', 金牛: '酉', 陰陽: '申', 巨蟹: '未', 獅子: '午', 双女: '巳',
  天秤: '辰', 天蝎: '卯', 人馬: '寅', 磨羯: '丑', 宝瓶: '子', 双魚: '亥',
};

// 人事十二宮の正規名 (命宮から黄経順行の並び)。パラメータ検証のホワイトリストを兼ねる。
export const PERSON_HOUSE_NAMES: string[] = [
  '命宮', '財帛宮', '兄弟宮', '田宅宮', '男女宮', '奴僕宮',
  '妻妾宮', '疾厄宮', '遷移宮', '官禄宮', '福徳宮', '相貌宮',
];

// 二十八宿の正規名 (パラメータ検証用)。角を起点とする円環順。
export const MANSION_NAMES: string[] = [
  '角', '亢', '氐', '房', '心', '尾', '箕', '斗', '牛', '女', '虚', '危', '室', '壁',
  '奎', '婁', '胃', '昴', '畢', '参', '觜', '井', '鬼', '柳', '星', '張', '翼', '軫',
];

// 十二次の黄経順の並び (対宮の算出に使う)
export const HOUSE_ORDER: string[] = [
  '白羊', '金牛', '陰陽', '巨蟹', '獅子', '双女',
  '天秤', '天蝎', '人馬', '磨羯', '宝瓶', '双魚',
];

// 星曜の正規名 (パラメータ検証のホワイトリストを兼ねる)
export const STAR_NAMES: string[] = [
  '太陽', '月', '水星', '金星', '火星', '木星', '土星', '羅睺', '計都', '月孛', '紫氣',
];
export const SEVEN_GOVERNORS: string[] = ['太陽', '月', '水星', '金星', '火星', '木星', '土星'];

// 十二次の宮主星 (古典の宮主配当)。命主の算出に使う。
export const HOUSE_LORDS: Record<string, string> = {
  白羊: '火星', 金牛: '金星', 陰陽: '水星', 巨蟹: '月', 獅子: '太陽', 双女: '水星',
  天秤: '金星', 天蝎: '火星', 人馬: '木星', 磨羯: '土星', 宝瓶: '土星', 双魚: '木星',
};

// 七政の旺宮 (七政以外の四余は古典の廟旺表に載らないため対象外)
export const EXALTATIONS: Record<string, string> = {
  太陽: '白羊', 月: '金牛', 水星: '双女', 金星: '双魚', 火星: '磨羯', 木星: '巨蟹', 土星: '天秤',
};

// 二十八宿の七曜配当 (角木蛟・亢金龍…の「木」「金」の部分)。
// 実データは src/domain/qizhengsiyu/constants.ts の SIDEREAL_MANSIONS.element と同一で、
// 両者が一致することを constants.test.ts で検証している
// (api/_lib はサーバー関数として自己完結させる必要があるため、ここに正規表を置く)。
export const MANSION_LORDS: Record<string, string> = {
  角: '木', 亢: '金', 氐: '土', 房: '日', 心: '月', 尾: '火', 箕: '水',
  斗: '木', 牛: '金', 女: '土', 虚: '日', 危: '月', 室: '火', 壁: '水',
  奎: '木', 婁: '金', 胃: '土', 昴: '日', 畢: '月', 参: '水', 觜: '火',
  井: '木', 鬼: '金', 柳: '土', 星: '日', 張: '月', 翼: '火', 軫: '水',
};

export type Wuxing = '木' | '火' | '土' | '金' | '水';

// 星曜の五行。四余は 紫氣=木・月孛=水・羅睺=火・計都=土 の通説による。
export const STAR_WUXING: Record<string, Wuxing> = {
  太陽: '火', 月: '水', 水星: '水', 金星: '金', 火星: '火', 木星: '木', 土星: '土',
  羅睺: '火', 計都: '土', 月孛: '水', 紫氣: '木',
};

// 七曜を五行に読み替える (生剋を見るとき日は火、月は水として扱う)
export const LUMINARY_WUXING: Record<string, Wuxing> = {
  日: '火', 月: '水', 火: '火', 水: '水', 木: '木', 金: '金', 土: '土',
};

const GENERATES: Record<Wuxing, Wuxing> = { 木: '火', 火: '土', 土: '金', 金: '水', 水: '木' };
const CONTROLS: Record<Wuxing, Wuxing> = { 木: '土', 土: '水', 水: '火', 火: '金', 金: '木' };

// 星から見た宿との関係
export type WuxingRelation = '比和' | '得生' | '洩気' | '受剋' | '剋出';

export function wuxingRelation(star: Wuxing, other: Wuxing): WuxingRelation {
  if (star === other) return '比和';
  if (GENERATES[other] === star) return '得生'; // 宿が星を生じる
  if (GENERATES[star] === other) return '洩気'; // 星が宿を生じる(気が漏れる)
  if (CONTROLS[other] === star) return '受剋';  // 宿が星を剋する
  return '剋出';                                 // 星が宿を剋する
}

// 星宿生剋の解釈文。落宿が結論にどう効くかを言葉にする。
const RELATION_TEXTS: Record<WuxingRelation, string> = {
  比和: '宿と星の五行が同じで気が揃うため、この星の性質が素直に、そして強めに出ます。',
  得生: '宿が星を生じるため、この星の働きが後押しされ、無理なく力を発揮できます。',
  洩気: '星が宿を生じて気が流れ出るため、力を出し切って疲れやすく、使いどころを絞ると安定します。',
  受剋: '宿が星を剋するため、この星の働きが抑えられやすく、思うように運ばない場面が生じます。',
  剋出: '星が宿を剋するため、力の向け方が強引になりやすく、周囲との折り合いが課題になります。',
};

// ---- 三方四正の会合 --------------------------------------------------------
// 古法は宮で会合を見て、度数で精める。ここでは宮差で種別を決め、
// 度数が近いものは「同度」「正対」として一段強く扱う。
export type AspectKind = '同宮' | '六合' | '方照' | '三合' | '対照';

// 宮差 → 会合の種別 (該当しない宮差は会合なし)
const ASPECT_BY_HOUSE_DIFF: Record<number, AspectKind> = {
  0: '同宮',
  2: '六合', 10: '六合',
  3: '方照', 9: '方照',   // 90度。三方四正の「四正」はこの方照と対照を指す
  4: '三合', 8: '三合',   // 120度。三方四正の「三方」
  6: '対照',              // 180度
};

// 会合が「ぴたりと合う」とみなす度数の許容差
export const ASPECT_ORB_DEG = 5;

export const ASPECT_DESCRIPTIONS: Record<AspectKind, string> = {
  同宮: '同じ宮に同居し、二つの星の性質が混ざり合って働きます。',
  六合: 'ゆるやかに助け合う関係で、無理のない形で力を貸します。',
  方照: '互いに角を突き合わせる関係で、緊張と行き違いを生みますが、鍛えられる関係でもあります。',
  三合: '最もよく通じ合う関係で、二つの星の良い面が素直に結びつきます。',
  対照: '真向かいから照らし合う関係で、強く引き合うと同時に、どちらかに偏りやすくなります。',
};

/** 宮差(0〜11)から会合の種別を返す。会合しない宮差は null。 */
export function aspectByHouseDiff(houseDiff: number): AspectKind | null {
  const d = ((houseDiff % 12) + 12) % 12;
  return Object.prototype.hasOwnProperty.call(ASPECT_BY_HOUSE_DIFF, d) ? ASPECT_BY_HOUSE_DIFF[d] : null;
}

const EXACT_ASPECT_ANGLES: Record<AspectKind, number> = { 同宮: 0, 六合: 60, 方照: 90, 三合: 120, 対照: 180 };

/** 2つの黄経の離角 (0〜180°) */
export function separationDeg(longitudeA: number, longitudeB: number): number {
  return Math.abs((((longitudeA - longitudeB) % 360) + 540) % 360 - 180);
}

/** 会合が度数でも合っているか (同宮なら「同度」、対照なら「正対」) */
export function isExactAspect(kind: AspectKind, longitudeA: number, longitudeB: number): boolean {
  return Math.abs(separationDeg(longitudeA, longitudeB) - EXACT_ASPECT_ANGLES[kind]) <= ASPECT_ORB_DEG;
}

// 宮名から地支を引く。自身のプロパティでない名前は未知として扱う。
export function lookupBranch(houseName: string | undefined): string | undefined {
  if (!houseName || !Object.prototype.hasOwnProperty.call(HOUSE_BRANCHES, houseName)) return undefined;
  return HOUSE_BRANCHES[houseName];
}

/** 十二次の対宮 */
export function oppositeHouse(houseName: string): string {
  const i = HOUSE_ORDER.indexOf(houseName);
  return i < 0 ? houseName : HOUSE_ORDER[(i + 6) % 12];
}

export type Dignity = '廟' | '旺' | '陥' | '落' | '平';

/** 七政の廟旺。四余は古典の廟旺表に載らないので常に「平」を返す。 */
export function getDignity(starName: string, houseName: string): Dignity {
  if (!SEVEN_GOVERNORS.includes(starName)) return '平';
  const lordOf = (h: string) => (Object.prototype.hasOwnProperty.call(HOUSE_LORDS, h) ? HOUSE_LORDS[h] : undefined);
  if (lordOf(houseName) === starName) return '廟';
  if (EXALTATIONS[starName] === houseName) return '旺';
  const opposite = oppositeHouse(houseName);
  if (lordOf(opposite) === starName) return '陥';
  if (EXALTATIONS[starName] === opposite) return '落';
  return '平';
}

const DIGNITY_TEXTS: Record<Dignity, string> = {
  廟: '自らが主る宮にあり(廟)、この星の力が最もよく通ります。',
  旺: '旺じる宮にあり(旺)、この星の良い面が引き立ちます。',
  陥: '主る宮の対にあり(陥)、この星は本来の働きを出しにくく、意識して補う必要があります。',
  落: '旺じる宮の対にあり(落)、この星の力が弱まり、焦ると空回りしやすくなります。',
  平: '廟旺にも陥落にも当たらず(平)、この星は周囲の配置に応じて働きます。',
};

/** 星宿生剋の判定結果 (根拠表示にも使う) */
export function getStarMansionRelation(starName: string, mansionName: string): {
  relation: WuxingRelation;
  starWuxing: Wuxing;
  mansionWuxing: Wuxing;
  evidence: string;
} | null {
  const starWuxing = Object.prototype.hasOwnProperty.call(STAR_WUXING, starName) ? STAR_WUXING[starName] : undefined;
  const lord = Object.prototype.hasOwnProperty.call(MANSION_LORDS, mansionName) ? MANSION_LORDS[mansionName] : undefined;
  if (!starWuxing || !lord) return null;
  const mansionWuxing = LUMINARY_WUXING[lord];
  const relation = wuxingRelation(starWuxing, mansionWuxing);
  return {
    relation,
    starWuxing,
    mansionWuxing,
    evidence: `${mansionName}宿(${lord}=${mansionWuxing})と${starName}(${starWuxing})は${relation}`,
  };
}

type RuleBuilder = (params: Record<string, string>) => CanonicalRuleHit | null;

// ---- 四余 (羅睺・計都・月孛・紫氣) の落宮ルール ----------------------------
// 注意: 四余の吉凶解釈は流派差が大きく、明清古籍の該当箇所を特定できていない。
// ここでは広く流布する通説を採り、出典欄に「通説（典拠未確定）」と明記する。
// 典拠が確定したら、下の SIYU_MEANINGS の文言と sourceId を差し替えること。
const SIYU_MEANINGS: Record<string, { star: string; core: string; mingGong: string; priority: number }> = {
  rahu: {
    star: '羅睺',
    core: '物事の進みが遅れやすく、また一つの対象に執着が向かいやすい領域です。急がず手順を踏むこと、抱え込みに気づくことが要になります。',
    mingGong: '人生の主軸そのものに羅睺が乗るため、若い時期ほど回り道を経験しやすく、その分だけ粘り強さが育ちます。',
    priority: 7,
  },
  ketu: {
    star: '計都',
    core: '急な動きや途切れが起きやすく、また表に出にくい形で事が進みやすい領域です。予定に余白を持たせておくと安定します。',
    mingGong: '人生の主軸に計都が乗るため、転機が突然の形で訪れやすく、身の振り方を切り替える力が問われます。',
    priority: 7,
  },
  yuebei: {
    star: '月孛',
    core: '感情の起伏が大きく出やすく、思い入れの深さがそのまま結果を左右しやすい領域です。距離の取り方が鍵になります。',
    mingGong: '人生の主軸に月孛が乗るため、感受性が強く、内面の波がそのまま生き方の色になります。',
    priority: 6,
  },
  ziqi: {
    star: '紫氣',
    core: '援助や好機が及びやすく、和合が生まれやすい領域です。人からの引き立てを受け取る構えがあるとよく働きます。',
    mingGong: '人生の主軸に紫氣が乗るため、節目ごとに助けが入りやすく、周囲との縁が道を開きます。',
    priority: 6,
  },
};

// 四余の落宮ルールの共通ビルダー。宮名・人事宮名・宿名はすべてホワイトリストで検証する。
// 落宿は「根拠に並べるだけ」にせず、星宿生剋として解釈文に反映する。
function buildSiyuPlacement(key: string, ruleId: string): RuleBuilder {
  return (params) => {
    const meaning = SIYU_MEANINGS[key];
    const { houseName, personHouseName, mansionName } = params;
    const branch = lookupBranch(houseName);
    if (!branch) return null;
    if (!personHouseName || !PERSON_HOUSE_NAMES.includes(personHouseName)) return null;
    if (!mansionName || !MANSION_NAMES.includes(mansionName)) return null;
    const wuxing = getStarMansionRelation(meaning.star, mansionName);
    if (!wuxing) return null;

    const isMingGong = personHouseName === '命宮';
    return {
      ruleId,
      title: `${meaning.star}が${personHouseName}に在中（${mansionName}宿・${wuxing.relation}）`,
      category: isMingGong ? 'nature' : 'theme',
      evidence: [
        `${meaning.star}在${branch}(${houseName})宮`,
        `${personHouseName}`,
        `${mansionName}宿`,
        wuxing.evidence,
      ],
      interpretation:
        `${meaning.star}が${houseName}宮（${branch}）の${personHouseName}に在り、${mansionName}宿に落ちます。` +
        `${isMingGong ? meaning.mingGong : meaning.core}` +
        RELATION_TEXTS[wuxing.relation],
      strength: isMingGong ? 4 : 3,
      priority: isMingGong ? meaning.priority + 2 : meaning.priority,
      sourceId: '通説（典拠未確定）',
      ruleSetVersion: RULE_SET_VERSION,
    };
  };
}

// 七政の落宮ルール。廟旺・落宮・人事宮・星宿生剋を1件にまとめる
// (星ごとに複数のRuleHitへ分けるとAI鑑定の上限20件を超えるため)。
const SEVEN_GOVERNOR_TRAITS: Record<string, string> = {
  太陽: '志の立て方、表に出る場面での在り方、父や上位者との関わりを表します。',
  月: '感受性と日々の暮らし方、母や身近な人との関わりを表します。',
  水星: '考え方と言葉の使い方、学びや商いの筋道を表します。',
  金星: '好むもの、和合の作り方、財と縁の結び方を表します。',
  火星: '決断と行動の強さ、争いや急ぎごとへの向き合い方を表します。',
  木星: '伸びる方向と度量、援助や教えを受け渡す力を表します。',
  土星: '持続と忍耐、責任の負い方と時間のかけ方を表します。',
};

const buildStarPlacement: RuleBuilder = (params) => {
  const { starName, houseName, personHouseName, mansionName } = params;
  if (!starName || !SEVEN_GOVERNORS.includes(starName)) return null;
  const branch = lookupBranch(houseName);
  if (!branch) return null;
  if (!personHouseName || !PERSON_HOUSE_NAMES.includes(personHouseName)) return null;
  if (!mansionName || !MANSION_NAMES.includes(mansionName)) return null;
  const wuxing = getStarMansionRelation(starName, mansionName);
  if (!wuxing) return null;

  // 廟旺と生剋はクライアントの申告ではなく、正規表からサーバー側で導出する
  const dignity = getDignity(starName, houseName);
  const strong = dignity === '廟' || dignity === '旺';

  return {
    ruleId: 'r_star_placement',
    title: `${starName}が${houseName}宮（${dignity}）・${personHouseName}`,
    category: 'nature',
    evidence: [
      `${starName}在${branch}(${houseName})宮`,
      `${dignity}`,
      `${personHouseName}`,
      `${mansionName}宿`,
      wuxing.evidence,
    ],
    interpretation:
      `${starName}が${houseName}宮（${branch}）の${personHouseName}に在り、${mansionName}宿に落ちます。` +
      `${SEVEN_GOVERNOR_TRAITS[starName]}` +
      `${DIGNITY_TEXTS[dignity]}${RELATION_TEXTS[wuxing.relation]}`,
    strength: strong ? 5 : dignity === '平' ? 3 : 2,
    priority: (personHouseName === '命宮' ? 4 : 0) + (strong ? 3 : 0) + 6,
    sourceId: '果老星宗（廟旺）／通説（五行生剋・典拠未確定）',
    ruleSetVersion: RULE_SET_VERSION,
  };
};

// 命主 (命宮の宮主星) と命度主 (命度が落ちる宿の宿主星)
const buildMingZhu: RuleBuilder = (params) => {
  const { houseName, lordName, lordHouseName, lordPersonHouseName } = params;
  const branch = lookupBranch(houseName);
  if (!branch) return null;
  if (!lordName || HOUSE_LORDS[houseName] !== lordName) return null; // 命主は宮から一意に決まる
  const lordBranch = lookupBranch(lordHouseName);
  if (!lordBranch) return null;
  if (!lordPersonHouseName || !PERSON_HOUSE_NAMES.includes(lordPersonHouseName)) return null;

  const dignity = getDignity(lordName, lordHouseName);
  return {
    ruleId: 'r_ming_zhu',
    title: `命主は${lordName}（${lordHouseName}宮・${dignity}）`,
    category: 'nature',
    evidence: [`命宮在${branch}(${houseName})`, `${houseName}宮の宮主=${lordName}`, `${lordName}在${lordHouseName}宮`, `${dignity}`],
    interpretation:
      `命宮が${houseName}宮（${branch}）なので、生涯の主星である命主は${lordName}です。` +
      `その${lordName}は${lordHouseName}宮の${lordPersonHouseName}に在ります。` +
      `${DIGNITY_TEXTS[dignity]}命主の在る${lordPersonHouseName}の領域が、人生の力点になりやすいと読みます。`,
    strength: 5,
    priority: 12,
    sourceId: '果老星宗',
    ruleSetVersion: RULE_SET_VERSION,
  };
};

// 「木星・土星」のように「・」区切りで渡された星曜名を検証して配列にする。
// 1つでも正規名でなければ null (ホワイトリスト方式を保つ)。
function parseStarList(value: string | undefined): string[] | null {
  if (!value) return null;
  const names = value.split('・');
  if (names.length === 0 || names.length > STAR_NAMES.length) return null;
  if (!names.every(n => STAR_NAMES.includes(n))) return null;
  if (new Set(names).size !== names.length) return null;
  return names;
}

// 命宮・命主に対する会合をまとめて1件のRuleHitにする。
// 11天体の総当たり(55組)を個別ルールにすると上限を即超えるため、要になる2点に絞る。
function buildAspectSummary(ruleId: string, subjectLabel: string, subjectNote: string): RuleBuilder {
  return (params) => {
    const kinds: AspectKind[] = ['同宮', '三合', '対照', '方照', '六合'];
    const found: { kind: AspectKind; names: string[] }[] = [];
    for (const kind of kinds) {
      if (params[kind] === undefined) continue;
      const names = parseStarList(params[kind]);
      if (!names) return null; // 不正な星曜名が混じっていたら全体を拒否
      found.push({ kind, names });
    }
    if (found.length === 0) return null;

    return {
      ruleId,
      title: `${subjectLabel}の会合`,
      category: 'nature',
      evidence: found.map(f => `${subjectLabel}と${f.names.join('・')}が${f.kind}`),
      interpretation:
        `${subjectNote}` +
        found
          .map(f => `${f.names.join('・')}が${f.kind}で向かいます。${ASPECT_DESCRIPTIONS[f.kind]}`)
          .join(''),
      strength: 4,
      priority: ruleId === 'r_ming_gong_aspects' ? 10 : 9,
      // 三方(三合)・四正(方照/対照)は古典の枠組みだが、六合(60°)と許容差5°は
      // その枠外の運用なので、出典をまとめて古典名だけにはしない。
      sourceId: '果老星宗（三方四正）／通説（六合・許容度）',
      ruleSetVersion: RULE_SET_VERSION,
    };
  };
}

// ---- 格局 -------------------------------------------------------------------
// 注意: 七政四余の格局は流派差が大きく、明清古籍の該当箇所を特定できていない。
// ここでは条件が一義的に定まるものだけを採り、出典は「通説（典拠未確定）」と明記する。
// 名称・条件を先生の流儀に合わせる場合は、この表だけを差し替えればよい。
const GEJU: Record<string, { name: string; text: string; priority: number }> = {
  r_geju_sun_moon_embrace: {
    name: '日月夾命',
    text: '命宮の前後の宮に太陽と月が並び、命宮を挟んでいます。表と裏、公と私の両面から支えが入る形で、周囲の人に恵まれやすい配置とされます。',
    priority: 14,
  },
  r_geju_sun_moon_same: {
    name: '日月同宮',
    text: '太陽と月が同じ宮に在ります。志と情、外向きの顔と内向きの顔が一つの領域に集まるため、その宮の事柄に力が集中します。反面、公私の切り替えが課題になりやすい形です。',
    priority: 13,
  },
  r_geju_lord_in_ming: {
    name: '命主居命（星曜守垣）',
    text: '命主が命宮そのものに在ります。生涯の主星が本来の座を守る形で、自分の軸が定まりやすく、他人に流されにくい構えになります。',
    priority: 15,
  },
  r_geju_cluster: {
    name: '聚星',
    text: '七政のうち三つ以上が同じ宮に集まっています。その宮が示す領域に人生の重みが偏り、良くも悪くもそこが人生の主題になります。',
    priority: 13,
  },
  r_geju_toward_ming: {
    name: '七政朝命',
    text: '七政のうち三つ以上が命宮に三合・対照で向かっています。多方面から力が命宮に集まる形で、支えを受けやすい配置とされます。',
    priority: 14,
  },
};

function buildGeju(ruleId: string): RuleBuilder {
  return (params) => {
    const geju = GEJU[ruleId];
    const stars = parseStarList(params.stars);
    if (!stars) return null;
    const houseName = params.houseName;
    // 宮を伴う格局(日月同宮・聚星)は宮名も検証する
    const branch = houseName ? lookupBranch(houseName) : undefined;
    if (houseName && !branch) return null;

    return {
      ruleId,
      title: `格局: ${geju.name}`,
      category: 'nature',
      evidence: [
        geju.name,
        `該当星曜: ${stars.join('・')}`,
        ...(branch ? [`${branch}(${houseName})宮`] : []),
      ],
      interpretation:
        `${geju.name}が成立しています（${stars.join('・')}${branch ? `／${houseName}宮`: ''}）。${geju.text}`,
      strength: 5,
      priority: geju.priority,
      sourceId: '通説（典拠未確定）',
      ruleSetVersion: RULE_SET_VERSION,
    };
  };
}

// ---- 大限・小限・流年 --------------------------------------------------------
// 採用した説: 大限=命宮を第1とし一宮十年、小限=一年一宮、いずれも陽男陰女＝順行。
// 流年=その年の太歳(年支)が入る十二次。流派差が大きいため出典は通説とする。
const FORTUNE_DIRECTIONS = ['順行', '逆行'];

const buildDaXian: RuleBuilder = (params) => {
  const { houseName, personHouseName, direction, ageRange, index } = params;
  const branch = lookupBranch(houseName);
  if (!branch) return null;
  if (!personHouseName || !PERSON_HOUSE_NAMES.includes(personHouseName)) return null;
  if (!direction || !FORTUNE_DIRECTIONS.includes(direction)) return null;
  if (!ageRange || !/^\d{1,3}〜\d{1,3}歳$/.test(ageRange)) return null;
  if (!index || !/^\d{1,2}$/.test(index)) return null;

  const xiaoXianHouse = params.xiaoXianHouse;
  const hasXiaoXian = !!xiaoXianHouse && PERSON_HOUSE_NAMES.includes(xiaoXianHouse);

  return {
    ruleId: 'r_da_xian',
    title: `第${index}大限（${ageRange}）は${houseName}宮・${personHouseName}`,
    category: 'fortune',
    evidence: [
      `大限は命宮より${direction}・一宮十年`,
      `第${index}大限=${branch}(${houseName})宮`,
      personHouseName,
      ...(hasXiaoXian ? [`小限=${xiaoXianHouse}`] : []),
    ],
    interpretation:
      `${ageRange}は第${index}大限で、${houseName}宮（${branch}）＝${personHouseName}が主題になります。` +
      `大限は命宮から${direction}に一宮十年で進みます。` +
      `この十年は${personHouseName}が示す領域に物事が集まりやすく、ここを整えることが全体の底上げになります。` +
      (hasXiaoXian ? `この年の小限は${xiaoXianHouse}で、一年単位ではそちらの事柄が前に出ます。` : ''),
    strength: 4,
    priority: 16,
    sourceId: '通説（典拠未確定）',
    ruleSetVersion: RULE_SET_VERSION,
  };
};

const buildLiuNian: RuleBuilder = (params) => {
  const { houseName, personHouseName, yearGanzhi, year } = params;
  const branch = lookupBranch(houseName);
  if (!branch) return null;
  if (!personHouseName || !PERSON_HOUSE_NAMES.includes(personHouseName)) return null;
  if (!yearGanzhi || !/^[甲乙丙丁戊己庚辛壬癸][子丑寅卯辰巳午未申酉戌亥]$/.test(yearGanzhi)) return null;
  if (!year || !/^\d{4}$/.test(year)) return null;

  return {
    ruleId: 'r_liu_nian',
    title: `${year}年（${yearGanzhi}）の流年は${personHouseName}`,
    category: 'fortune',
    evidence: [`${year}年の太歳=${yearGanzhi}`, `太歳${branch}が入る宮=${houseName}`, personHouseName],
    interpretation:
      `${year}年は${yearGanzhi}の年で、太歳${branch}が${houseName}宮に入ります。` +
      `命宮から数えると${personHouseName}にあたるため、この一年は${personHouseName}が示す事柄が動きやすくなります。` +
      `大限が十年の底流を示すのに対し、流年はその年に表面化する事柄を示します。`,
    strength: 3,
    priority: 15,
    sourceId: '通説（典拠未確定）',
    ruleSetVersion: RULE_SET_VERSION,
  };
};

// 七曜の名から星曜名を引く (宿の七曜配当 → 命度主)
const LUMINARY_TO_STAR: Record<string, string> = {
  日: '太陽', 月: '月', 火: '火星', 水: '水星', 木: '木星', 金: '金星', 土: '土星',
};

const buildMingDuZhu: RuleBuilder = (params) => {
  const { mansionName, lordHouseName, lordPersonHouseName, lordMansionName } = params;
  if (!mansionName || !MANSION_NAMES.includes(mansionName)) return null;
  // 命度主はクライアントの申告ではなく、宿の七曜配当からサーバー側で導出する
  const luminary = MANSION_LORDS[mansionName];
  const lordName = LUMINARY_TO_STAR[luminary];
  if (!lordName) return null;

  // 命度主が「どこに在ってどんな状態か」まで示さないと読み手に判断を丸投げすることになる
  const lordBranch = lookupBranch(lordHouseName);
  if (!lordBranch) return null;
  if (!lordPersonHouseName || !PERSON_HOUSE_NAMES.includes(lordPersonHouseName)) return null;
  if (!lordMansionName || !MANSION_NAMES.includes(lordMansionName)) return null;
  const wuxing = getStarMansionRelation(lordName, lordMansionName);
  if (!wuxing) return null;
  const dignity = getDignity(lordName, lordHouseName);

  return {
    ruleId: 'r_ming_du_zhu',
    title: `命度主は${lordName}（${mansionName}宿）・${lordHouseName}宮（${dignity}）`,
    category: 'nature',
    evidence: [
      `命度在${mansionName}宿`,
      `${mansionName}宿の七曜配当=${luminary}`,
      `命度主=${lordName}`,
      `${lordName}在${lordBranch}(${lordHouseName})宮`,
      `${dignity}`,
      wuxing.evidence,
    ],
    interpretation:
      `命度が${mansionName}宿に落ちるため、命度主は${lordName}（${luminary}曜）です。` +
      `命主が人生の大枠を示すのに対し、命度主は生まれ持った資質の色合いを細かく示します。` +
      `その${lordName}は${lordHouseName}宮（${lordBranch}）の${lordPersonHouseName}に在り、${lordMansionName}宿に落ちます。` +
      `${DIGNITY_TEXTS[dignity]}${RELATION_TEXTS[wuxing.relation]}` +
      `この${lordPersonHouseName}の領域に、生来の資質が最も出やすいと読みます。`,
    strength: 4,
    priority: 11,
    sourceId: '通説（典拠未確定）',
    ruleSetVersion: RULE_SET_VERSION,
  };
};

const RULE_BUILDERS: Record<string, RuleBuilder> = {
  // 旧 r_sun_leo / r_moon_cancer は r_star_placement の「廟」判定に統合した
  // (七政すべてを同じ物差しで見るため。個別ルールだと太陽と月だけ扱いが違ってしまう)
  r_star_placement: buildStarPlacement,
  r_ming_zhu: buildMingZhu,
  r_ming_du_zhu: buildMingDuZhu,
  r_da_xian: buildDaXian,
  r_liu_nian: buildLiuNian,
  r_geju_sun_moon_embrace: buildGeju('r_geju_sun_moon_embrace'),
  r_geju_sun_moon_same: buildGeju('r_geju_sun_moon_same'),
  r_geju_lord_in_ming: buildGeju('r_geju_lord_in_ming'),
  r_geju_cluster: buildGeju('r_geju_cluster'),
  r_geju_toward_ming: buildGeju('r_geju_toward_ming'),
  r_ming_gong_aspects: buildAspectSummary(
    'r_ming_gong_aspects',
    '命宮',
    '人生の主軸である命宮に対して、'
  ),
  r_ming_zhu_aspects: buildAspectSummary(
    'r_ming_zhu_aspects',
    '命主',
    '生涯の主星である命主に対して、'
  ),
  // 旧 r_asc_sun_conjunct (命宮に太陽) も削除した。r_star_placement が
  // 「太陽が○宮の命宮に在る」を廟旺・落宿つきで出すので、AIへ同じ配置を二重に渡していた。
  // 「四正」は会合(180°の対照)を指す語なので、角の宮(命・田宅・妻妾・官禄)は「角宮」と呼ぶ。
  // 以前は「四正宮」と表記していたが、三方四正の四正と紛らわしいため改めた。
  r_jupiter_angle: () => ({
    ruleId: 'r_jupiter_angle',
    title: '木星が角宮に位置',
    category: 'career',
    evidence: ['木星在角宮(命・田宅・妻妾・官禄)'],
    interpretation: '教育、法律、あるいは精神的な指導者としての適性が高い配置です。組織の調整役としても秀でています。',
    strength: 4,
    priority: 7,
    sourceId: '果老星宗',
    ruleSetVersion: RULE_SET_VERSION,
  }),
  r_rahu_placement: buildSiyuPlacement('rahu', 'r_rahu_placement'),
  r_ketu_placement: buildSiyuPlacement('ketu', 'r_ketu_placement'),
  r_yuebei_placement: buildSiyuPlacement('yuebei', 'r_yuebei_placement'),
  r_ziqi_placement: buildSiyuPlacement('ziqi', 'r_ziqi_placement'),
  r_general_asc: (params) => {
    const houseName = params.houseName;
    // 宮名はホワイトリストで検証し、地支はサーバー側の正規対応から導出する
    const branch = lookupBranch(houseName);
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
  // 添字参照だけだと "constructor" 等で Object.prototype のメンバが取れてしまうため、
  // 自身のプロパティであることを確認してから引く
  if (!Object.prototype.hasOwnProperty.call(RULE_BUILDERS, ruleId)) return null;
  const builder = RULE_BUILDERS[ruleId];
  if (typeof builder !== 'function') return null;
  return builder(params);
}
