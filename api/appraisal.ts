import type { VercelRequest, VercelResponse } from '@vercel/node';
import { generateAppraisal } from './_lib/appraisal-core';

// Vercel Serverless Function: POST /api/appraisal
// 環境変数 GEMINI_API_KEY は Vercel の Settings → Environment Variables で設定する。
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }
  const { ruleHits } = (req.body ?? {}) as { ruleHits?: unknown };
  const result = await generateAppraisal(ruleHits);
  return res.status(result.status).json(result.body);
}
