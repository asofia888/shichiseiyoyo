import type { VercelRequest, VercelResponse } from '@vercel/node';
// 注意: "type":"module" のため実行時はNode ESM解決になる。拡張子(.js)を省略すると
// Vercel上で ERR_MODULE_NOT_FOUND になる (コンパイル後の appraisal-core.js を指す)。
import { generateAppraisal } from './_lib/appraisal-core.js';

// ---- 乱用対策 (公開エンドポイントのため) --------------------------------
// 1) Originチェック: 自サイト(本番/プレビュー/ローカル)以外からの呼び出しを拒否
// 2) 簡易レート制限: IPごとに10分間で10回まで
//    (サーバーレスのインスタンス内メモリのため厳密ではないが、乱用コストを大きく上げる)

function isAllowedOrigin(origin: string | undefined): boolean {
  if (!origin) return false;
  try {
    const { hostname } = new URL(origin);
    if (hostname === 'localhost' || hostname === '127.0.0.1') return true;
    if (hostname === 'shichiseiyoyo.vercel.app') return true;
    // Vercelのプレビューデプロイ (shichiseiyoyo-xxxx.vercel.app)
    if (hostname.startsWith('shichiseiyoyo-') && hostname.endsWith('.vercel.app')) return true;
    return false;
  } catch {
    return false;
  }
}

const RATE_WINDOW_MS = 10 * 60 * 1000;
const RATE_MAX = 10;
const rateMap = new Map<string, number[]>();

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  if (rateMap.size > 1000) rateMap.clear(); // メモリ肥大の保険
  const stamps = (rateMap.get(ip) ?? []).filter(t => now - t < RATE_WINDOW_MS);
  if (stamps.length >= RATE_MAX) {
    rateMap.set(ip, stamps);
    return true;
  }
  stamps.push(now);
  rateMap.set(ip, stamps);
  return false;
}

// Vercel Serverless Function: POST /api/appraisal
// 環境変数 GEMINI_API_KEY は Vercel の Settings → Environment Variables で設定する。
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const origin = (req.headers.origin as string | undefined) ?? undefined;
  if (!isAllowedOrigin(origin)) {
    return res.status(403).json({ error: 'アクセス元を確認できませんでした。アプリの画面からお試しください。' });
  }

  const forwarded = (req.headers['x-forwarded-for'] as string | undefined) ?? '';
  const ip = forwarded.split(',')[0].trim() || 'unknown';
  if (isRateLimited(ip)) {
    return res.status(429).json({ error: 'アクセスが集中しています。しばらくしてから再度お試しください。' });
  }

  const result = await generateAppraisal(req.body);
  return res.status(result.status).json(result.body);
}
