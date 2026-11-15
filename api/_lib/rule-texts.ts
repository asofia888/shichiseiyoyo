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
// 2.1.0: 大限に『果老星宗』式 (命宮から逆行・十二宮年分歌・童限) を追加し既定にした。
//        旧来の陽男陰女・一宮十年は流派設定で選べる方式として残す
// 2.2.0: 出生時刻が不明な命盤では、落宮ルールに人事宮を付けない (命宮が定まらないため)
// 2.3.0: 紫氣の落宮に、位置の計算が試験的であることの但し書きを付ける
// 2.4.0: 「六合」を宮差2(60°)から地支の六合(子丑・寅亥…)に改めた。
//        昼夜の喜忌 (r_day_night)・恩星と難星 (r_en_nan)・身主と身宮 (r_shen) を追加
// 2.5.0: 化曜 (r_hua_yao)・神殺 (r_shen_sha) を追加。落宮に強宮・弱宮の別を加え、
//        r_jupiter_angle を典拠のある r_jupiter_strong (木星が七強宮) に置き換えた。
//        大限に年齢の数え方、流年に生年の神殺との重なり、紫氣に算法の別を加えた
export const RULE_SET_VERSION = '2.5.0';

// 人事宮は任意パラメータ。出生時刻が不明な命盤では命宮が定まらないので送られてこない。
// 送られてきた場合はホワイトリストで検証する (不正なら false)。
function isValidOptionalPersonHouse(personHouseName: string | undefined): boolean {
  return personHouseName === undefined || PERSON_HOUSE_NAMES.includes(personHouseName);
}

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

// 十二次の宮主星。命主の算出と廟の判定に使う。
// 『張果星宗』【乐宫】「土子丑兮木寅亥，火居卯戌最亨通，金居辰酉皆为乐，水到巳申总一同，
// 惟有太阳独居午，太阴未上好相逢。」(同書はこの宮を「本宮」「楽宮」と呼ぶ。本アプリの「廟」)
export const HOUSE_LORDS: Record<string, string> = {
  白羊: '火星', 金牛: '金星', 陰陽: '水星', 巨蟹: '月', 獅子: '太陽', 双女: '水星',
  天秤: '金星', 天蝎: '火星', 人馬: '木星', 磨羯: '土星', 宝瓶: '土星', 双魚: '木星',
};

// 七政の旺宮。『張果星宗』【乘旺】「…水子火丑孛寅当，…辰宫土宿主荣昌，水日巳宫金到午，
// 木居未上紫申方，太阴在酉太阳戌，金木之星亥上藏。」のうち、七政について諸本で揺れのない
// 日戌・月酉・火丑・木未・金亥・水巳・土辰を採る。四余の廟旺は歌訣の本文に乱れがあるため対象外。
// 陥・落 (廟・旺の対宮) を定める文は同書に見当たらず、通説による。
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
//
// 六合だけは宮差ではなく地支の組で決まる (子丑・寅亥・卯戌・辰酉・巳申・午未)。
// 2.3.0 までは宮差2 (60°) を「六合」と呼んでいたが、60°の会合は古法になく、
// 地支の六合とは別物なので改めた。
export type AspectKind = '同宮' | '六合' | '方照' | '三合' | '対照';

// 宮差 → 会合の種別 (該当しない宮差は会合なし)。六合は isLiuHe() で別に判定する
const ASPECT_BY_HOUSE_DIFF: Record<number, AspectKind> = {
  0: '同宮',
  3: '方照', 9: '方照',   // 90度。三方四正の「四正」はこの方照と対照を指す
  4: '三合', 8: '三合',   // 120度。三方四正の「三方」
  6: '対照',              // 180度
};

// 会合が「ぴたりと合う」とみなす度数の許容差
export const ASPECT_ORB_DEG = 5;

export const ASPECT_DESCRIPTIONS: Record<AspectKind, string> = {
  同宮: '同じ宮に同居し、二つの星の性質が混ざり合って働きます。',
  六合: '地支が合する宮どうし（子丑・寅亥・卯戌・辰酉・巳申・午未）に在り、宮主を同じくする縁（午未は日月の対）で、穏やかに結びつきます。',
  方照: '互いに角を突き合わせる関係で、緊張と行き違いを生みますが、鍛えられる関係でもあります。',
  三合: '最もよく通じ合う関係で、二つの星の良い面が素直に結びつきます。',
  対照: '真向かいから照らし合う関係で、強く引き合うと同時に、どちらかに偏りやすくなります。',
};

/** 宮差(0〜11)から会合の種別を返す。会合しない宮差は null。 */
export function aspectByHouseDiff(houseDiff: number): AspectKind | null {
  const d = ((houseDiff % 12) + 12) % 12;
  return Object.prototype.hasOwnProperty.call(ASPECT_BY_HOUSE_DIFF, d) ? ASPECT_BY_HOUSE_DIFF[d] : null;
}

/**
 * 地支の六合か。引数は十二次の番号 (白羊=0 … 双魚=11)。
 * 子丑(宝瓶10・磨羯9)、寅亥(人馬8・双魚11)、卯戌(天蝎7・白羊0)、辰酉(天秤6・金牛1)、
 * 巳申(双女5・陰陽2)、午未(獅子4・巨蟹3) は、いずれも番号の和が 7 か 19 になる。
 */
export function isLiuHe(signA: number, signB: number): boolean {
  return (((signA + signB) % 12) + 12) % 12 === 7;
}

/**
 * 2つの宮 (十二次の番号) の会合。宮差による会合を優先し、無ければ六合を見る。
 * 寅亥・巳申は方照 (3宮差) と六合を兼ねるので、alsoLiuHe で知らせる。
 */
export function aspectBetweenSigns(signA: number, signB: number): { kind: AspectKind; alsoLiuHe: boolean } | null {
  const byDiff = aspectByHouseDiff(signA - signB);
  const liuHe = isLiuHe(signA, signB);
  if (byDiff) return { kind: byDiff, alsoLiuHe: liuHe };
  return liuHe ? { kind: '六合', alsoLiuHe: false } : null;
}

// 六合は宮の組で決まり、離角が組ごとに違う (30°・90°・150°) ので度数の精密判定はしない
const EXACT_ASPECT_ANGLES: Partial<Record<AspectKind, number>> = { 同宮: 0, 方照: 90, 三合: 120, 対照: 180 };

/** 2つの黄経の離角 (0〜180°) */
export function separationDeg(longitudeA: number, longitudeB: number): number {
  return Math.abs((((longitudeA - longitudeB) % 360) + 540) % 360 - 180);
}

/** 会合が度数でも合っているか (同宮なら「同度」、対照なら「正対」) */
export function isExactAspect(kind: AspectKind, longitudeA: number, longitudeB: number): boolean {
  const angle = EXACT_ASPECT_ANGLES[kind];
  if (angle === undefined) return false;
  return Math.abs(separationDeg(longitudeA, longitudeB) - angle) <= ASPECT_ORB_DEG;
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
    if (!isValidOptionalPersonHouse(personHouseName)) return null;
    if (!mansionName || !MANSION_NAMES.includes(mansionName)) return null;
    const wuxing = getStarMansionRelation(meaning.star, mansionName);
    if (!wuxing) return null;

    const isMingGong = personHouseName === '命宮';
    const houseStrength = getHouseStrength(personHouseName);
    // 紫氣の算法。大統暦法なら 'datong' が送られてくる。送られてこないのは旧試験式
    // (古いクライアント・旧試験式で保存した履歴) で、位置が確かでない旨を付ける
    if (params.calc !== undefined && (key !== 'ziqi' || params.calc !== 'datong')) return null;
    const legacyZiqi = key === 'ziqi' && params.calc !== 'datong';
    return {
      ruleId,
      title: personHouseName
        ? `${meaning.star}が${personHouseName}に在中（${mansionName}宿・${wuxing.relation}）`
        : `${meaning.star}が${houseName}宮に在中（${mansionName}宿・${wuxing.relation}）`,
      category: isMingGong ? 'nature' : 'theme',
      evidence: [
        `${meaning.star}在${branch}(${houseName})宮`,
        ...(personHouseName ? [personHouseName] : []),
        ...(houseStrength ? [houseStrength.label] : []),
        `${mansionName}宿`,
        wuxing.evidence,
        ...(key === 'ziqi' && !legacyZiqi ? ['紫氣の位置は大統暦法による'] : []),
      ],
      interpretation:
        `${meaning.star}が${houseName}宮（${branch}）${personHouseName ? `の${personHouseName}` : ''}に在り、${mansionName}宿に落ちます。` +
        `${isMingGong ? meaning.mingGong : meaning.core}` +
        (houseStrength ? houseStrength.text : '') +
        RELATION_TEXTS[wuxing.relation] +
        // 旧試験式の紫氣は起点の値に出典がないので、位置そのものが確かでないことをAIにも伝える
        (legacyZiqi ? 'ただし紫氣の位置は、起点の出典を確認できていない試験的な計算によるため、参考程度に扱います。' : ''),
      strength: isMingGong ? 4 : 3,
      priority: isMingGong ? meaning.priority + 2 : meaning.priority,
      sourceId: '張果星宗（強弱宮）／通説（四余の意味・五行生剋・典拠未確定）',
      ruleSetVersion: RULE_SET_VERSION,
    };
  };
}

// 強宮と弱宮。『張果星宗』【入门看法】
// 「强宫者，谓命宫、官禄、田宅、妻妾、男女、福德、财帛…居强宫者旺。」
// 「弱宫者，谓兄弟、奴仆、疾厄、相貌、迁移…临弱宫者衰。」
export const STRONG_PERSON_HOUSES: string[] = ['命宮', '官禄宮', '田宅宮', '妻妾宮', '男女宮', '福徳宮', '財帛宮'];

/** 人事宮の強弱。人事宮が無い (出生時刻が不明) なら null */
export function getHouseStrength(personHouseName: string | undefined): { label: '強宮' | '弱宮'; text: string } | null {
  if (!personHouseName) return null;
  return STRONG_PERSON_HOUSES.includes(personHouseName)
    ? { label: '強宮', text: `${personHouseName}は強宮で、この星は力を得ます。` }
    : { label: '弱宮', text: `${personHouseName}は弱宮で、この星の力は衰えやすくなります。` };
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
  if (!isValidOptionalPersonHouse(personHouseName)) return null;
  if (!mansionName || !MANSION_NAMES.includes(mansionName)) return null;
  const wuxing = getStarMansionRelation(starName, mansionName);
  if (!wuxing) return null;

  // 廟旺と生剋はクライアントの申告ではなく、正規表からサーバー側で導出する
  const dignity = getDignity(starName, houseName);
  const strong = dignity === '廟' || dignity === '旺';
  const houseStrength = getHouseStrength(personHouseName);

  return {
    ruleId: 'r_star_placement',
    title: `${starName}が${houseName}宮（${dignity}）${personHouseName ? `・${personHouseName}` : ''}`,
    category: 'nature',
    evidence: [
      `${starName}在${branch}(${houseName})宮`,
      `${dignity}`,
      ...(personHouseName ? [personHouseName] : []),
      ...(houseStrength ? [houseStrength.label] : []),
      `${mansionName}宿`,
      wuxing.evidence,
    ],
    interpretation:
      `${starName}が${houseName}宮（${branch}）${personHouseName ? `の${personHouseName}` : ''}に在り、${mansionName}宿に落ちます。` +
      `${SEVEN_GOVERNOR_TRAITS[starName]}` +
      `${DIGNITY_TEXTS[dignity]}${houseStrength ? houseStrength.text : ''}${RELATION_TEXTS[wuxing.relation]}`,
    strength: strong ? 5 : dignity === '平' ? 3 : 2,
    priority: (personHouseName === '命宮' ? 4 : 0) + (strong ? 3 : 0) + 6,
    sourceId: '張果星宗（楽宮歌・乗旺歌・強弱宮）／通説（陥落・五行生剋・典拠未確定）',
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
      // 三方(三合)・四正(方照/対照)は古典の枠組みだが、地支の六合を会合に数えることと
      // 許容差5°はその枠外の運用なので、出典をまとめて古典名だけにはしない。
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
// 大限の方式は流派設定で選ぶ (src/domain/qizhengsiyu/fortune.ts に定義と出典を記す):
// - guolao: 『果老星宗』十二宮年分歌。命宮から相貌→福徳→官禄…と逆行し、宮ごとに年数が異なる
// - yinyang_decade: 命宮を第1とし一宮十年、陽男陰女＝順行 (紫微斗数・子平の大運に近い運用)
// 流年=その年の太歳(年支)が入る十二次。
const FORTUNE_DIRECTIONS = ['順行', '逆行'];
const FORTUNE_METHODS = ['guolao', 'yinyang_decade'];
const AGE_BASES = ['数え年', '満年齢'];

const buildDaXian: RuleBuilder = (params) => {
  const { houseName, personHouseName, direction, ageRange, index } = params;
  // 方式を送らない旧クライアント(キャッシュ済みのPWA等)は一宮十年で計算している
  const method = params.method ?? 'yinyang_decade';
  if (!FORTUNE_METHODS.includes(method)) return null;
  const branch = lookupBranch(houseName);
  if (!branch) return null;
  if (!personHouseName || !PERSON_HOUSE_NAMES.includes(personHouseName)) return null;
  if (!direction || !FORTUNE_DIRECTIONS.includes(direction)) return null;
  // 果老式は童限により年齢の境界に端数が出る (例: 13.4〜23.4歳)
  if (!ageRange || !/^\d{1,3}(\.\d)?〜\d{1,3}(\.\d)?歳$/.test(ageRange)) return null;
  if (!index || !/^\d{1,2}$/.test(index)) return null;

  // 年齢の数え方。送らない旧クライアントは満年齢で計算している
  const ageBasis = params.ageBasis ?? '満年齢';
  if (!AGE_BASES.includes(ageBasis)) return null;
  const nominal = ageBasis === '数え年';

  const xiaoXianHouse = params.xiaoXianHouse;
  const hasXiaoXian = !!xiaoXianHouse && PERSON_HOUSE_NAMES.includes(xiaoXianHouse);
  const isGuolao = method === 'guolao';

  return {
    ruleId: 'r_da_xian',
    title: `第${index}大限（${ageRange}）は${houseName}宮・${personHouseName}`,
    category: 'fortune',
    evidence: [
      isGuolao ? '大限は命宮より逆行・宮ごとの年数は十二宮年分歌による' : `大限は命宮より${direction}・一宮十年`,
      `第${index}大限=${branch}(${houseName})宮`,
      personHouseName,
      ...(hasXiaoXian ? [`小限=${xiaoXianHouse}`] : []),
      ...(nominal ? ['年齢は数え年'] : []),
    ],
    interpretation:
      `${nominal ? '数え年で' : ''}${ageRange}は第${index}大限で、${houseName}宮（${branch}）＝${personHouseName}が主題になります。` +
      (isGuolao
        ? '大限は命宮から相貌宮・福徳宮・官禄宮…と逆行し、宮ごとに受け持つ年数が異なります。'
        : `大限は命宮から${direction}に一宮十年で進みます。`) +
      `この期間は${personHouseName}が示す領域に物事が集まりやすく、ここを整えることが全体の底上げになります。` +
      (hasXiaoXian ? `この年の小限は${xiaoXianHouse}で、一年単位ではそちらの事柄が前に出ます。` : ''),
    strength: 4,
    priority: 16,
    sourceId: isGuolao ? '果老星宗（十二宮年分歌・童限）' : '通説（典拠未確定）',
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

  // 生年の干支が送られてきたら、太歳の入る宮が生年の神殺の宮に重なるかを添える
  const { birthStem, birthBranch } = params;
  let overlap: string[] = [];
  if (birthStem !== undefined || birthBranch !== undefined) {
    const shenSha = getShenSha(birthStem, birthBranch);
    if (!shenSha) return null;
    overlap = shenSha.filter(s => s.branch === branch).map(s => s.name);
  }

  return {
    ruleId: 'r_liu_nian',
    title: `${year}年（${yearGanzhi}）の流年は${personHouseName}`,
    category: 'fortune',
    evidence: [
      `${year}年の太歳=${yearGanzhi}`,
      `太歳${branch}が入る宮=${houseName}`,
      personHouseName,
      ...(overlap.length ? [`生年の${overlap.join('・')}の宮に重なる`] : []),
    ],
    interpretation:
      `${year}年は${yearGanzhi}の年で、太歳${branch}が${houseName}宮に入ります。` +
      `命宮から数えると${personHouseName}にあたるため、この一年は${personHouseName}が示す事柄が動きやすくなります。` +
      `大限が十年の底流を示すのに対し、流年はその年に表面化する事柄を示します。` +
      (overlap.length
        ? `またこの年の太歳は、生年の${overlap.join('・')}の宮に入るため、${overlap.map(n => SHEN_SHA_MEANINGS[n]).join('、')}が表に出やすい年です。`
        : ''),
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

// ---- 昼夜の喜忌・恩星と難星・身主 -------------------------------------------
// 典拠は『張果星宗』(殆知閣本の本文で確認、2026-11-15)。原文にある範囲だけを採る。

// 【分昼夜】「昼生者，喜太阳木土计气水孛于阳宫阳度；夜生者，爱太阴火金罗于阴宫阴度。」
// 【八格赋】「昼生忌火罗，夜生忌土计。」
// 【评人生禀赋分金论】「火罗与日争光」「土计却能掩月」
// 【论十二宫所守拱照活变看法】「夜生人重身度主，日生人重命度主。」
const SECTS: Record<string, { lord: string; likes: string; avoid: [string, string]; reason: string; weigh: string }> = {
  昼生: {
    lord: '太陽',
    likes: '太陽・木星・土星・計都・紫氣・水星・月孛',
    avoid: ['火星', '羅睺'],
    reason: '火星と羅睺は太陽と光を争うため',
    weigh: '昼生は命度主を重く見ます。',
  },
  夜生: {
    lord: '月',
    likes: '月・火星・金星・羅睺',
    avoid: ['土星', '計都'],
    reason: '土星と計都は月を掩うため',
    weigh: '夜生は身度主を重く見ます。',
  },
};

const buildDayNight: RuleBuilder = (params) => {
  const { sect, avoid1House, avoid2House } = params;
  if (!sect || !Object.prototype.hasOwnProperty.call(SECTS, sect)) return null;
  const s = SECTS[sect];
  // 忌星の在る人事宮。星そのものが命盤に無い構成では送られてこない
  if (!isValidOptionalPersonHouse(avoid1House) || !isValidOptionalPersonHouse(avoid2House)) return null;
  const places = [
    ...(avoid1House ? [`${s.avoid[0]}は${avoid1House}`] : []),
    ...(avoid2House ? [`${s.avoid[1]}は${avoid2House}`] : []),
  ];
  return {
    ruleId: 'r_day_night',
    title: `${sect}（${s.lord}に従う）・忌星は${s.avoid.join('と')}`,
    category: 'nature',
    evidence: [
      `出生時に太陽が地平線の${sect === '昼生' ? '上' : '下'}=${sect}`,
      `${sect}の喜ぶ星=${s.likes}`,
      `${sect}の忌む星=${s.avoid.join('・')}`,
      ...places.map(p => `${p}に在り`),
    ],
    interpretation:
      `${sect}まれで、${s.lord}を主として見ます。${sect}は${s.likes}を喜び、${s.avoid.join('と')}を忌みます（${s.reason}）。` +
      (places.length ? `忌星の${places.join('、')}に在り、その領域では無理を重ねず、手堅く進めることが要になります。` : '') +
      s.weigh,
    strength: 4,
    priority: 12,
    sourceId: '張果星宗（分昼夜・八格賦）',
    ruleSetVersion: RULE_SET_VERSION,
  };
};

// 【生杀星论】「生我者为恩星为母曜，克我者为难星为杀星，果老谓生杀作吉凶之根」
// 【母子侧向】「生我者，母星也；我生者，子星也。母星解仇，子星御仇」
// 【身命为元】「命主即坐处二十八宿之属是也」
// 【雠截根折】「如命坐翼度，火为主，…水孛乃我之仇星」
// 「我」は命度の宿の属 (このアプリの命度主)。例文が火の主に対して水星・月孛だけを挙げ、
// 月を挙げていないので、太陽と月は恩難に数えず、五星と四余で見る。
// 「仇＝恩を剋す星」「用＝難を剋す星」とする説は原文に見当たらないので採らない。
const EN_NAN_STARS: Record<Wuxing, string[]> = {
  木: ['木星', '紫氣'],
  火: ['火星', '羅睺'],
  土: ['土星', '計都'],
  金: ['金星'],
  水: ['水星', '月孛'],
};

/** 命度の宿から、命度主の五行と恩星・難星・子星を導く (根拠表示にも使う) */
export function getEnNanStars(mansionName: string): {
  luminary: string;
  lordWuxing: Wuxing;
  en: string[];   // 恩星 (母星): 命度主を生じる
  nan: string[];  // 難星 (殺星・仇星): 命度主を剋する
  zi: string[];   // 子星: 命度主が生じる
} | null {
  if (!Object.prototype.hasOwnProperty.call(MANSION_LORDS, mansionName)) return null;
  const luminary = MANSION_LORDS[mansionName];
  const lordWuxing = LUMINARY_WUXING[luminary];
  const all = Object.keys(EN_NAN_STARS) as Wuxing[];
  const generator = all.find(w => GENERATES[w] === lordWuxing)!;
  const controller = all.find(w => CONTROLS[w] === lordWuxing)!;
  return {
    luminary,
    lordWuxing,
    en: EN_NAN_STARS[generator],
    nan: EN_NAN_STARS[controller],
    zi: EN_NAN_STARS[GENERATES[lordWuxing]],
  };
}

const buildEnNan: RuleBuilder = (params) => {
  const { mansionName } = params;
  if (!mansionName) return null;
  // 恩星・難星はクライアントの申告ではなく、宿の七曜配当と五行からサーバー側で導出する
  const found = getEnNanStars(mansionName);
  if (!found) return null;
  const { luminary, lordWuxing, en, nan, zi } = found;
  return {
    ruleId: 'r_en_nan',
    title: `恩星は${en.join('・')}、難星は${nan.join('・')}`,
    category: 'nature',
    evidence: [
      `命度在${mansionName}宿`,
      `命度主=${luminary}曜(${lordWuxing})`,
      `${lordWuxing}を生じる星=${en.join('・')}(恩星)`,
      `${lordWuxing}を剋する星=${nan.join('・')}(難星)`,
      `${lordWuxing}が生じる星=${zi.join('・')}(子星)`,
    ],
    interpretation:
      `命度が${mansionName}宿に落ち、命度主は${luminary}曜（${lordWuxing}）です。` +
      `これを生じる${en.join('・')}が恩星（母星）で、この星が力を得ているほど助けが入りやすくなります。` +
      `これを剋する${nan.join('・')}が難星（殺星）で、この星が命宮や命度主に迫る時期・領域では障りが出やすくなります。` +
      `命度主が生じる${zi.join('・')}は子星で、難星を御する働きをします。` +
      `ただし恩星が他の星に剋されていれば生じる力は弱まり、難星が制されていれば剋する力も弱まります。`,
    strength: 4,
    priority: 11,
    sourceId: '張果星宗（生殺星論・母子側向）',
    ruleSetVersion: RULE_SET_VERSION,
  };
};

// 【身命为元】「身主即月是也，及太阴所躔之度亦是也。」
// 【身度主论】「以月离之度为身度主矣」
// 【观星要诀】「看三主: 即宫主、度主、身主是也。」
// 「身宮＝月の在る宮」と定める文は原文に見当たらない (「身度之宫」の語はある)。
// 広く行われる取り方なので採るが、出典欄で古典と分けて示す。
const buildShen: RuleBuilder = (params) => {
  const { houseName, personHouseName, mansionName } = params;
  const branch = lookupBranch(houseName);
  if (!branch) return null;
  if (!isValidOptionalPersonHouse(personHouseName)) return null;
  if (!mansionName || !MANSION_NAMES.includes(mansionName)) return null;
  const luminary = MANSION_LORDS[mansionName];
  const lordName = LUMINARY_TO_STAR[luminary];
  if (!lordName) return null;

  return {
    ruleId: 'r_shen',
    title: `身主は月・身宮は${houseName}宮${personHouseName ? `（${personHouseName}）` : ''}・身度主は${lordName}`,
    category: 'nature',
    evidence: [
      '身主=月',
      `月在${branch}(${houseName})宮=身宮`,
      ...(personHouseName ? [personHouseName] : []),
      `月躔${mansionName}宿`,
      `${mansionName}宿の七曜配当=${luminary}=身度主`,
    ],
    interpretation:
      `身主は月で、月の在る${houseName}宮（${branch}）を身宮とします。` +
      (personHouseName ? `命宮から数えると${personHouseName}にあたり、この領域が身の置きどころとして重みを持ちます。` : '') +
      `月は${mansionName}宿に躔り、その宿主である${lordName}（${luminary}曜）が身度主です。` +
      `宮主・度主・身主の三主のうち、命宮の側が生まれ持った枠組みを示すのに対し、身主の側はそれを実際に担う身の在り方を示します。`,
    strength: 4,
    priority: 11,
    sourceId: '張果星宗（身命為元・身度主論）／通説（身宮＝月の在る宮・典拠未確定）',
    ruleSetVersion: RULE_SET_VERSION,
  };
};

// ---- 化曜 (年干による十化) ---------------------------------------------------
// 『張果星宗』【变曜】「甲火乙孛丙属木，丁是金星戊上求。己人太阴庚是水，辛气壬计癸罗?。」
// 【诀】「禄暗福耗荫，贵刑印囚权。火孛木金土，月水气计罗。」
// 【天干化曜星例】(年干横取) 天禄「主享禄，火孛木金土月水气计罗」／天暗「主暗昧，孛木金土月水气计罗火」…
// 生年干が天禄の星を決め、以下この順に暗・福・耗…と一つずつ後ろの星へ配る。太陽には化曜が付かない。
export const HEAVENLY_STEM_NAMES: string[] = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'];
const HUA_YAO_STARS: string[] = ['火星', '月孛', '木星', '金星', '土星', '月', '水星', '紫氣', '計都', '羅睺'];
// 意味は【天干化曜星例】の「主…」、関わる人事宮は【变曜】の「变为天禄者，即其星管官禄也」以下による
const HUA_YAO: { name: string; meaning: string; house: string }[] = [
  { name: '天禄', meaning: '禄を享ける', house: '官禄宮' },
  { name: '天暗', meaning: '暗昧', house: '相貌宮' },
  { name: '天福', meaning: '福を獲る', house: '財帛宮・福徳宮・遷移宮' },
  { name: '天耗', meaning: '破耗', house: '兄弟宮' },
  { name: '天蔭', meaning: '蔭庇', house: '妻妾宮' },
  { name: '天貴', meaning: '嗣の貴', house: '男女宮' },
  { name: '天刑', meaning: '刑を犯す', house: '奴僕宮' },
  { name: '天印', meaning: '印を有つ', house: '田宅宮' },
  { name: '天囚', meaning: '囚禁', house: '疾厄宮' },
  { name: '天権', meaning: '重い権', house: '命宮' },
];

/** 生年干から、各星に付く化曜を求める (天禄の星から順に並ぶ)。未知の干は null */
export function getHuaYao(stem: string | undefined): { star: string; name: string; meaning: string; house: string }[] | null {
  const s = stem === undefined ? -1 : HEAVENLY_STEM_NAMES.indexOf(stem);
  if (s < 0) return null;
  return HUA_YAO.map((hua, i) => ({ star: HUA_YAO_STARS[(s + i) % 10], ...hua }));
}

const buildHuaYao: RuleBuilder = (params) => {
  const list = getHuaYao(params.stem);
  if (!list) return null;
  const { stem } = params;
  return {
    ruleId: 'r_hua_yao',
    title: `化曜（生年干${stem}）: 天禄=${list[0].star}・天権=${list[9].star}`,
    category: 'nature',
    evidence: [`生年干=${stem}`, ...list.map(h => `${h.star}=${h.name}`)],
    interpretation:
      `生年干は${stem}で、年干から各星に十の化曜が付きます。` +
      list.map(h => `${h.star}は${h.name}（${h.meaning}。${h.house}に関わる）`).join('、') +
      `です。化曜はその星の働きに色を加えるもので、その星の廟旺や在る宮と合わせて読みます。`,
    strength: 3,
    priority: 8,
    sourceId: '張果星宗（変曜・天干化曜星例）',
    ruleSetVersion: RULE_SET_VERSION,
  };
};

// ---- 神殺 (生年の干支から宮を取るもの) ----------------------------------------
// 『張果星宗』に求め方が歌訣・表で明示され、本文に乱れのないものだけを採る。
// 【天干吉凶星例】「禄勋：主勋禄，寅卯巳午巳午申酉亥子」(年干横取)
// 【天乙】「天乙贵人甲见未，戊庚在丑乙申位。己子丙酉辛居寅，丁亥壬兔巳逢癸。」
// 【羊刃详解例】(年干横取) 甲=卯、丙・戊=午、庚=酉、壬=子 (陽干のみ)
// 【马前诸杀例】「申子辰人马居寅，寅午戌人马居申，巳酉丑人马在亥，亥卯未人马在巳。」
// 【地支吉凶星例三】「劫杀：主劫破，巳寅亥申巳寅亥申巳寅亥申。」(年支横取)
// 文昌は歌訣の本文に揺れ (辛の宮) があるため採らない。
const BRANCH_NAMES: string[] = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];
const LU_XUN: string[] = ['寅', '卯', '巳', '午', '巳', '午', '申', '酉', '亥', '子'];
const TIAN_YI: string[] = ['未', '申', '酉', '亥', '丑', '子', '丑', '寅', '卯', '巳'];
const YANG_REN: (string | null)[] = ['卯', null, '午', null, '午', null, '酉', null, '子', null];
// 年支を三合局 (申子辰=0・巳酉丑=1・寅午戌=2・亥卯未=3) に分ける: 子0 丑1 寅2 卯3 辰0 …
const YI_MA: string[] = ['寅', '亥', '申', '巳'];
const JIE_SHA: string[] = ['巳', '寅', '亥', '申'];

// 禄勲・劫殺の意味は上の原文の「主…」による。天乙貴人・駅馬・羊刃は同書に一文での定義がなく、通説による
const SHEN_SHA_MEANINGS: Record<string, string> = {
  禄勲: '勲禄（働きに見合う禄）',
  天乙貴人: '貴人の助け',
  羊刃: '激しさと刃傷',
  駅馬: '移動と変化',
  劫殺: '劫破（奪われ破れること）',
};

/** 生年の干支から神殺の在る地支を求める。干支が不正なら null */
export function getShenSha(stem: string | undefined, branch: string | undefined): { name: string; branch: string }[] | null {
  const s = stem === undefined ? -1 : HEAVENLY_STEM_NAMES.indexOf(stem);
  const b = branch === undefined ? -1 : BRANCH_NAMES.indexOf(branch);
  if (s < 0 || b < 0) return null;
  if (s % 2 !== b % 2) return null; // 陽干には陽支、陰干には陰支しか組まない
  const yangRen = YANG_REN[s];
  return [
    { name: '禄勲', branch: LU_XUN[s] },
    { name: '天乙貴人', branch: TIAN_YI[s] },
    ...(yangRen ? [{ name: '羊刃', branch: yangRen }] : []),
    { name: '駅馬', branch: YI_MA[b % 4] },
    { name: '劫殺', branch: JIE_SHA[b % 4] },
  ];
}

/** 地支から十二次の名を引く */
function houseOfBranch(branch: string): string {
  return HOUSE_ORDER.find(name => HOUSE_BRANCHES[name] === branch)!;
}

const buildShenSha: RuleBuilder = (params) => {
  const { stem, branch, mingHouseName } = params;
  const list = getShenSha(stem, branch);
  if (!list) return null;
  // 命宮の宮名は任意 (出生時刻が不明なら送られてこない)。あれば人事宮を添える
  if (mingHouseName !== undefined && !lookupBranch(mingHouseName)) return null;
  const mingIndex = mingHouseName ? HOUSE_ORDER.indexOf(mingHouseName) : -1;

  const rows = list.map(s => {
    const houseName = houseOfBranch(s.branch);
    const personHouseName = mingIndex < 0
      ? undefined
      : PERSON_HOUSE_NAMES[(HOUSE_ORDER.indexOf(houseName) - mingIndex + 12) % 12];
    return { ...s, houseName, personHouseName };
  });

  return {
    ruleId: 'r_shen_sha',
    title: `神殺（生年${stem}${branch}）: ${rows.map(r => `${r.name}=${r.branch}`).join('・')}`,
    category: 'theme',
    evidence: [
      `生年干支=${stem}${branch}`,
      ...rows.map(r => `${r.name}在${r.branch}(${r.houseName})宮${r.personHouseName ? `=${r.personHouseName}` : ''}`),
    ],
    interpretation:
      `生年は${stem}${branch}で、年の干支から次の神殺が定まります。` +
      rows
        .map(r => `${r.name}（${SHEN_SHA_MEANINGS[r.name]}）は${r.houseName}宮（${r.branch}）${r.personHouseName ? `の${r.personHouseName}` : ''}`)
        .join('、') +
      `に在ります。その宮に在る星や、そこへ巡る限・流年に、それぞれの神殺の意味が加わります。`,
    strength: 3,
    priority: 7,
    sourceId: '張果星宗（天干吉凶星例・天乙・羊刃詳解例・馬前諸殺例・地支吉凶星例）／通説（天乙貴人・駅馬・羊刃の意味）',
    ruleSetVersion: RULE_SET_VERSION,
  };
};

// 木星が七強宮に在る。『張果星宗』【岁星总论】
// 「若人身命与七强宫值之、紫绶金章官职高贵，其性仁慈好道德」
const buildJupiterStrong: RuleBuilder = (params) => {
  const { personHouseName } = params;
  if (!personHouseName || !STRONG_PERSON_HOUSES.includes(personHouseName)) return null;
  return {
    ruleId: 'r_jupiter_strong',
    title: `木星が強宮（${personHouseName}）に在る`,
    category: 'career',
    evidence: [`木星在${personHouseName}`, `${personHouseName}は七強宮の一つ`],
    interpretation:
      `木星が七強宮の一つである${personHouseName}に在ります。古典はこの配置を、位と職に恵まれ、` +
      `性は仁慈で道徳を好むとします。${personHouseName}の示す領域で、人を導き引き立てる働きが出やすくなります。`,
    strength: 4,
    priority: 7,
    sourceId: '張果星宗（歳星総論・強弱宮）',
    ruleSetVersion: RULE_SET_VERSION,
  };
};

const RULE_BUILDERS: Record<string, RuleBuilder> = {
  r_hua_yao: buildHuaYao,
  r_shen_sha: buildShenSha,
  r_jupiter_strong: buildJupiterStrong,
  r_day_night: buildDayNight,
  r_en_nan: buildEnNan,
  r_shen: buildShen,
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
  // 2.5.0 で r_jupiter_strong に置き換えた。文面に典拠がなく、古いクライアント
  // (キャッシュ済みのPWA) からの要求を拒否しないためだけに残している。
  r_jupiter_angle: () => ({
    ruleId: 'r_jupiter_angle',
    title: '木星が角宮に位置',
    category: 'career',
    evidence: ['木星在角宮(命・田宅・妻妾・官禄)'],
    interpretation: '教育、法律、あるいは精神的な指導者としての適性が高い配置です。組織の調整役としても秀でています。',
    strength: 4,
    priority: 7,
    sourceId: '通説（典拠未確定）',
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
