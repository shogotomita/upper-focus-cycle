# upper-focus-cycle — 上半身肥大 × BJJ × デッドリフト

33歳・173cm・74kg、体脂肪およそ20%。ベンチ125 / スクワット175 / デッド175。

優先順位は次の通り。

1. 肩・僧帽・胸を大きくする
2. BJJで使う二頭・三頭・胸の筋力と筋持久
3. パワーリフティング、とくにデッドリフト

器具は懸垂バー、バーベルとプレート、ベンチ、プレートでのサイドレイズ／リアデルト、自重だけ。ケーブルもダンベルもない前提。

## 週5（月〜金）／土休養／日BJJ

| Day | 曜日 | 内容 |
| --- | --- | --- |
| A | 月 | ベンチ＋フロントスクワット＋胸 |
| B | 火 | デッド＋背中・僧帽 |
| C | 水 | OHP＋腕・肩 |
| D | 木 | スクワット＋後面＋肩・胸 |
| E | 金 | 胸・腕のBJJポンプ |
| — | 土 | 完全休養（リフトもBJJもなし） |
| — | 日 | BJJのみ。ウエイト禁止 |

デッドは火曜なので、日曜のロールまで中2日以上空く。金曜は高レップのポンプで、土曜に神経系を休ませる。

## 16週の構造

4ブロック ×（作業3週 + ディロード1週）。

| ブロック | 週 | ねらい |
| --- | --- | --- |
| 1 肥大蓄積 | 1–4 | 8〜12レップ。デッドは膝下ポーズ |
| 2 筋力×肥大 | 5–8 | メイン5〜8レップ。補助は肥大のまま |
| 3 筋力特化 | 9–12 | メイン3〜5レップ。肥大は補助で維持 |
| 4 ピーク | 13–16 | デッドとベンチを単発〜2レップ。16週後に1RMテスト可 |

作業週は胸・肩・僧帽・二頭・三頭の直接セットが MAV を超える。各ブロック3週目（3, 7, 11, 15）で肩・僧帽・胸が MRV に達する。四頭は月フロント＋木バックで MEV 以上、後面はデッド＋RDL で MEV〜MAV。種目は日内に固めず週内へ分散し、日毎の総セットも寄せている。4週目はセット半減、RPE 5〜6。

メイン種目の重量は記載の%1RMを実測1RMに掛け、2.5kgに丸めている。併記のRPEがずれたらRPEを優先する。OHP 80kgは推定。

## ローカルで開く

```bash
npm install
npm run dev
```

ブラウザで [http://127.0.0.1:43217](http://127.0.0.1:43217) 。

- 右上の **Excelをダウンロード** で全16週の `.xlsx`（6シート）
- ソース一式: [public/upper-focus-cycle.zip](public/upper-focus-cycle.zip)
- 静的Excel: [public/16week-training-program.xlsx](public/16week-training-program.xlsx)
- 「Sheetsに貼る」で全行をコピーし、Googleスプレッドシートに貼れる
- 1RMを変えるとメイン重量が再計算され、ダウンロードにも反映される

## GitHub Pages

静的書き出し（`output: "export"`）で GitHub Pages に載せられる。リポジトリ名を `upper-focus-cycle` にすると URL は次の形。

- アプリ: `https://<user>.github.io/upper-focus-cycle/`
- Excel: `https://<user>.github.io/upper-focus-cycle/16week-training-program.xlsx`
- CSV: `https://<user>.github.io/upper-focus-cycle/16week-training-program.csv`
- ZIP: `https://<user>.github.io/upper-focus-cycle/upper-focus-cycle.zip`

.github/workflows/pages.yml が `main` への push でビルドして Pages に出す。初回はリポジトリの Settings → Pages → Source を **GitHub Actions** にする。

ローカルから公開リポを作る例:

```bash
unzip upper-focus-cycle.zip
cd upper-focus-cycle
git init
git add .
git commit -m "Initial commit"
gh repo create upper-focus-cycle --public --source=. --remote=origin --push
```

## ボリュームの数え方

ハードセットのみ（ウォームアップ除外）。クローズグリップやフロアプレスは胸と三頭の両方にカウント。BJJの引き込みはカウントしていない。ロールがきつい週は補助の最終セットを切る。メインの%は動かさない。
