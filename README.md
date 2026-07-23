# 七政四余 命盤

生年月日・出生時刻・出生地から**七政四余**（中国伝統占星術）の命盤を計算・描画し、AI による総合鑑定文を生成する Web アプリです。

**デモ**: https://shichiseiyoyo.vercel.app

## 特徴

- **検証済みの天文計算** — [astronomy-engine](https://github.com/cosinekitty/astronomy) による七政（日月五星）の実測位置に加えて:
  - 二十八宿は**距星の実測座標**（SIMBAD の ICRS J2000）から生成したサイデリアル境界（角宿距星スピカ ≈ 180° で Lahiri 定義と整合）
  - 羅睺・計都は**宋明式**（羅睺=降交点）／**印度・時憲式**（羅睺=昇交点）を流派設定で切替
  - 月孛（月の遠地点）は平均／真位置（実遠地点イベント補間）、真交点は接触軌道要素から算出
  - 伝統的安命法（卯時太陽）は**真太陽時**（均時差・経度差を天文計算で内包）に対応
- **3層分離アーキテクチャ** — 天文計算（EphemerisProvider）／判定ルール（RuleEngine）／文章生成（Gemini API）を分離し、鑑定結果には根拠と出典を明示
- **流派設定** — 黄道体系（トロピカル／サイデリアル）・安命法・四余の計算モデル・時辰基準などをプリセット＋個別カスタムで切替
- 命盤 SVG チャート・データ表・鑑定履歴（ローカル保存）・印刷・PWA 対応
- **テスト32件**（vitest）— 単体・ゴールデンテスト（基準命盤）・外部アンカー（2020年金環日食＝夏至）・API入力検証

## セットアップ

必要環境: Node.js 20+

```bash
npm install
npm run dev        # http://localhost:3000
```

AI総合鑑定（任意機能）を使う場合は、`.env.example` を参考に `.env` を作成し
[Google AI Studio](https://aistudio.google.com/apikey) で発行した `GEMINI_API_KEY` を設定してください。
命盤の計算・表示だけならキーは不要です。

```bash
npm test           # テスト実行
npm run lint       # 型チェック (tsc --noEmit)
npm run build      # 本番ビルド (dist/ + server-dist/)
npm start          # 本番サーバー (Express)
```

## デプロイ (Vercel)

GitHub 連携でそのままデプロイできます。

- 環境変数 `GEMINI_API_KEY` を Settings → Environment Variables に設定
- AI鑑定は `/api/appraisal`（サーバーレス関数）が処理します。APIキーはサーバー側でのみ使用され、クライアントには渡りません
- エンドポイントは**ルールIDのみ受付**（任意文章は拒否）＋ Origin チェック＋簡易レート制限で保護しています

## 技術構成

React 19 / TypeScript / Vite / Tailwind CSS 4 / astronomy-engine / Express (ローカル) / Vercel Serverless Functions (本番) / Gemini API / vitest

## 免責

本アプリの鑑定結果は、伝統的占術の解釈をエンターテインメントとして提供するものであり、医療・法律・投資等の専門的助言に代わるものではありません。

## 開発ワークフロー

本リポジトリの Claude Code 用設定（CLAUDE.md・スキル・レビューエージェント）については [docs/claude-code-kit.md](docs/claude-code-kit.md) を参照してください。
