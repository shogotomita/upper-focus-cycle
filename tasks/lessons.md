# Lessons

## 2026-08-24 — setState updater 内で event.currentTarget を読まない

1RM の `onChange` で `setRms((prev) => … event.currentTarget.value)` とすると、updater 実行時に `currentTarget` が null で TypeError。

- イベントハンドラ本体で `const next = Number(event.currentTarget.value) || 0` を先に取り、その値だけを updater に渡す

## 2026-08-24 — 週クリック不能の正体は 127.0.0.1 の 403

症状: 週番号を押しても 1 のまま、メニューも変わらない。ホバーのポインタは出る。

原因: Next.js dev が `127.0.0.1` からの `/_next/static/chunks/*` を 403 にし、React が hydrate されない。SSR の静的 HTML（常に week=1）だけが表示される。

対処:
- `next.config.ts` に `allowedDevOrigins: ["127.0.0.1", "localhost"]`
- もしくは URL を `http://localhost:43217/` にする（`127.0.0.1` は避ける）
- Playwright は `localhost` だと再現しないので、両方で確認する

## 2026-08-24 — sticky + backdrop-blur もクリック阻害しうる

補助対策として週選択は radio+label、sticky から backdrop-blur を外した。

## 2026-08-23 — 「AI開発ready」に AIDLC は不要

小さな個人アプリでは、公式 AI-DLC ハーネスは重すぎる。
- 入れるもの: `AGENTS.md`、短い `.cursor/rules`、`tasks/todo.md` と `tasks/lessons.md`
- 入れないもの: AIDLC インストーラ
