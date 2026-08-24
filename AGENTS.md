<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# upper-focus-cycle

16週の上半身肥大サイクルを、静的な Next.js アプリとして表示・書き出す個人用リポジトリ。会話と UI は日本語。バックエンドも認証もない。

## コマンド

```bash
npm install
npm run dev      # http://127.0.0.1:43217
npm run build    # 静的書き出し → out/
npm run lint
npx tsc --noEmit
```

GitHub Pages 向けビルドは `NEXT_PUBLIC_BASE_PATH=/<repo>`。ワークフローは `.github/workflows/pages.yml`。

## 地図

| パス | 役割 |
| --- | --- |
| `src/lib/program.ts` | 16週処方の SSOT。行生成と週次ボリューム |
| `src/lib/landmarks.ts` | 部位ごとの MEV / MAV / MRV |
| `src/lib/rm.ts` | 2.5kg 丸め、%1RM、補助重量 |
| `src/lib/types.ts` | 共有型 |
| `src/lib/export.ts` | xlsx / csv / tsv |
| `src/lib/content.ts` | 科学メモと種目ガイド |
| `src/lib/paths.ts` | `basePath` 付きアセット URL |
| `src/components/program-app.tsx` | 唯一の画面。client。localStorage |
| `src/components/ui/` | shadcn（base-nova）。手書きで置き換えない |
| `README.md` | プログラムの意図（優先順位・スケジュール） |

テストランナーは置いていない。処方を変えたら `volumeAudit`（`program.ts`）の結果が空であることと、画面の週次ボリュームを目視する。

## 不変条件

- 静的 export。Route Handler、cookies、サーバ専用 API は使わない
- 重量は 2.5kg 刻み。記載 RPE と %1RM がずれたら RPE を優先
- ボリュームはハードセットのみ。ウォームアップと BJJ は数えない
- クローズグリップ／フロアプレスは胸と三頭の両方にカウント
- 作業週は胸・肩・僧帽・二頭・三頭が MAV 超。優先部位は各ブロック3週目に MRV。四頭・後面は作業週 MEV 以上
- 器具は懸垂バー・バーベル・プレート・ベンチのみ。ケーブルもダンベルも足さない
- 月〜金がリフト。土は完全休養。日は BJJ のみ（ウエイト禁止）
- 優先順位: 肩・僧帽・胸の肥大 → BJJ の腕・胸 → デッド。スクワットは維持（四頭は週2でMEV以上、後面はデッド＋RDLでMEV〜MAV）
- 種目は日内集中を避け週内分散。日毎総セットも大きく偏らせない
- BJJ がきつい週は補助の最終セットを切る。メインの %1RM は動かさない
- 進捗（1RM・完了チェック）は `localStorage` キー `iron-cycle-v2`

## 触り方

非自明な変更は先に `tasks/todo.md` にチェック項目を書く。ユーザー訂正は `tasks/lessons.md` へ。コミットは依頼されたときだけ。
