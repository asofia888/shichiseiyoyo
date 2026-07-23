# Claude Code 導入キット（Opus 4.8 活用ガイド 対応）

活用ガイド（A4×2枚）の中身を、Claude Code の公式のしくみに
分解して配置したものです。**ガイド本文（PDF/HTML）は人間用なので、
Claude Code には読み込ませません。**

## 配置

このフォルダの中身を、プロジェクトの直下にそのままコピーします。

    あなたのプロジェクト/
    ├── CLAUDE.md            ← 常時ルール（毎セッション自動で読まれる。短く保つ）
    ├── LESSONS.md           ← 教訓ノート（資産四）
    └── .claude/
        ├── agents/
        │   └── betsujin-reviewer.md   ← 別人検証（独立コンテキストの厳しいレビュアー）
        └── skills/
            ├── app-dev-playbook/      ← 手順書（資産二）の実例。分野ごとに増やす
            ├── nidan-review/          ← /nidan-review：二段レビュー
            ├── kyokun-note/           ← /kyokun-note：教訓ノート更新
            └── hikitsugi/             ← /hikitsugi：新セッション引き継ぎ

どのプロジェクトでも使いたいものは、~/.claude/skills/ と
~/.claude/agents/ に置くと個人用として全プロジェクトで有効になります。

## 使い方（一日の流れ）

1. 依頼はテンプレート（基本編・裏面）で一括して渡す
2. 計画はプランモード（Shift+Tab）で確認してから実行させる
3. 完成したら betsujin-reviewer が検証（CLAUDE.md で指示済み）
4. 手動で粗探ししたいときは /nidan-review
5. セッションの締めに /kyokun-note で教訓を貯める
6. 会話が長くなったら /hikitsugi で仕切り直す

## 育て方

- 手順書スキルは分野ごとに増やす（コラム執筆用、ラベル生成用など）。
  作り方：良い出力が出た直後に「いまの進め方を、.claude/skills/◯◯/SKILL.md
  の形式で手順書にして」と頼めば、Claude 自身に書かせられます。
- description は「何ができるか」ではなく「いつ使うか」（発火条件）で書く。
- CLAUDE.md が手順で膨らんできたら、その部分をスキルへ移す。
