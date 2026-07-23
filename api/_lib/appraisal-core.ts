import { GoogleGenAI } from '@google/genai';

export interface AppraisalResult {
  status: number;
  body: { text?: string; error?: string };
}

// AI鑑定文生成の共通ロジック。
// ローカル開発 (server.ts の Express ルート) と Vercel (api/appraisal.ts) の両方から使う。
export async function generateAppraisal(ruleHits: unknown): Promise<AppraisalResult> {
  if (!process.env.GEMINI_API_KEY) {
    return { status: 500, body: { error: 'GEMINI_API_KEY is missing' } };
  }

  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

  const prompt = `
あなたは七政四余に精通した専門家です。以下の判定ルール結果(RuleHit)を元に、鑑定結果を作成してください。
怖がらせる文章や吉凶の断定ではなく、その配置が示す性質、課題、活用方法を中心に書いてください。
矛盾するRuleHitがある場合は、「一方では〇〇の傾向がありますが、別の配置では△△も示されています。そのため、状況によって二つの性質が切り替わりやすいと考えられます。」という形式で統合してください。

以下の章立てで生成してください：
1. 命盤全体の要約
2. 生まれ持った中心的性質
3. 思考と感情の傾向
4. 才能と仕事
5. 人間関係
6. 財との関わり方
7. 心身の整え方
8. 人生で繰り返しやすいテーマ
9. 現在の運気
10. 今後の過ごし方

【ルール判定結果】
${JSON.stringify(ruleHits, null, 2)}
      `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3.6-flash',
      contents: prompt
    });
    return { status: 200, body: { text: response.text } };
  } catch (e: any) {
    console.error('API Error:', e);
    let errorMessage = '鑑定文の生成中にエラーが発生しました。';

    const errorStr = typeof e === 'object' ? JSON.stringify(e) + String(e) : String(e);
    if (errorStr.includes('503') || errorStr.includes('UNAVAILABLE') || e?.status === 503) {
      errorMessage = '現在、AIモデルが混み合っており一時的に利用できません。しばらくしてから再度お試しください。';
    } else if (errorStr.includes('429') || errorStr.includes('RESOURCE_EXHAUSTED') || errorStr.includes('quota') || e?.status === 429) {
      errorMessage = 'AIの利用制限(クォータ)に達しました。時間をおいてから再度お試しください。';
    }

    // クライアント側は {error} フィールドを表示する設計のため 200 で返す (既存Expressと同じ挙動)
    return { status: 200, body: { error: errorMessage } };
  }
}
