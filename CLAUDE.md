# このリポジトリについて

七政四余の命盤を計算・描画し、ルール判定の結果から日本語の鑑定文を生成する
Web アプリ（React + Vite + TypeScript、Vercel 配信）。
天文計算・判定ルール・文章生成の三層を分離している（詳細は docs/system-design.md）。

## 落とし穴

- `api/` 配下の相対 import は `.js` 拡張子を付ける。`"type": "module"` のため、
  省くと Vercel 上で ERR_MODULE_NOT_FOUND になる。
- ルールを追加・変更するときは `src/domain/rules/rule-sets/mvp-rules.ts` と
  `api/_lib/rule-texts.ts` の両方を直す。クライアントは ruleId と params しか送らず、
  文面はサーバー側の正規テーブルから再構成するため、片方だけだと API が 400 を返す
  （`src/domain/rules/round-trip.test.ts` が検出する）。
- 鑑定 API のロジックは `api/_lib/appraisal-core.ts` に置く。ローカルの `server.ts` と
  Vercel の `api/appraisal.ts` の両方から呼ばれるので、入口側に書くと環境で挙動がずれる。
- `npm run dev` は Vite ではなく `tsx server.ts`（Express ＋ Vite middleware、:3000）。
  `vite` 単体で起動すると `/api/appraisal` が無い。
- `npm run lint` は ESLint ではなく `tsc --noEmit`。
- テストは `vitest.config.ts` が独立していて `vite.config.ts` を読まない。対象は
  `src/**/*.test.ts` と `api/**/*.test.ts` だけで、`.tsx` のテストは実行されない。
- 天文計算を変えると `src/domain/astronomy/golden-chart.test.ts` の基準値が落ちる。
  意図した変更なら根拠を書いて基準値を更新し、そうでなければ計算側を直す。
- 流派差（羅睺・計都の割当、恒星／移動黄道、安命法、時辰の基準）は `SchoolConfig` で
  切り替える。計算式にどれか一つを埋め込まない。
- 履歴レコードには保存時の `schoolConfig` と `targetYear` を持たせる。欠けると、後で
  開いたときに別の流派の命盤・別の年の鑑定文が表示される。
- 呼び出し元 Origin の許可リストは `api/appraisal.ts` にハードコードしている。
  独自ドメインを足すときはここも直す。

## 判断に迷ったときの優先順位

1. 確実に動く・事実として正確
2. 後から直せる読みやすさ
3. 見た目の洗練

迷ったら上位を優先し、どう判断したかを最後に一行で報告する。

## 分量と範囲

- 応答は焦点を絞り、簡潔に。書き出す文書の長さは作業に必要な分量に合わせ、
  水増しの節・重複する要約・定型文で膨らませない。
- 頼まれたものを、頼まれた広さで。解釈が分かれると成果物が大きく変わるときだけ確認する。
  より良い方法があれば一文で述べ、作業は依頼どおり進める。
- サブエージェントへの委任は、独立していて並列化できる大きな作業だけ。
  自分の作業の検証・再確認には使わない。

## 検証

- 検証が必要なときは verify スキルを呼ぶ（常時は実行しない）。

<!--
第四版の注記：
・ここに「絶対に〜するな」を書くのは、具体的で実証できる失敗を防ぐときだけ。
  念のための禁止は書かない。禁止の列挙より、基準の一文に畳む。
・ファイルシステムやコードを見れば分かることは書かない。
・手順が増えてきたら CLAUDE.md ではなく .claude/skills/ へ移す。
・定期的に /doctor を実行して、このファイルとスキルを適正な大きさに保つ。
-->
