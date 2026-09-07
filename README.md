# 海のぬし釣り（umi-no-nushi）

SFC「海のぬし釣り」的な、スマホ縦画面向けの釣りRPGプロトタイプです。

プロジェクトの設計方針・ゲームロジックの詳細は [CLAUDE.md](./CLAUDE.md) を参照してください。

## コアループ

港町 → 釣り場を選ぶ → 餌と仕掛けを選ぶ → キャスト → アタリ → テンション管理ミニゲーム
→ 釣果 → 売却/図鑑登録

現在のプロトタイプは 魚5種 / 釣り場1箇所 / 餌3種 / 仕掛け3種 の構成です。
`src/data/*.json` を編集するだけでコンテンツを追加できます。

## 開発

```bash
npm install
npm run dev       # 開発サーバー
npm run build     # 型チェック + 本番ビルド
npm run preview   # ビルド結果のプレビュー
npm run lint      # oxlint
```

## デプロイ (Vercel)

Viteの静的ビルド (`dist/`) をそのまま配信できます。`vercel.json` にSPA用のrewrite設定を
含めているので、Vercelにリポジトリを接続してデフォルト設定のままデプロイ可能です。

## データ永続化

所持金・在庫・図鑑の進捗は `localStorage` に保存されます（サーバーやDBは使用しません）。
