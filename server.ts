import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';
import { generateAppraisal } from './api/_lib/appraisal-core.js';

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // 鑑定文生成のロジックは api/_lib/appraisal-core.ts に共通化 (Vercel関数と同一実装)
  app.post('/api/appraisal', async (req, res) => {
    const { ruleHits } = req.body ?? {};
    const result = await generateAppraisal(ruleHits);
    res.status(result.status).json(result.body);
  });

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
