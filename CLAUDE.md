# umi-no-nushi（海のぬし釣り 風 釣りRPG）プロジェクト方針

このドキュメントは実装前に方針を固めるためのもの。以降このリポジトリで作業する際は、
まずここを読み、設計判断はここに追記/更新してから進めること。

## 1. コンセプト

- 元ネタ: SFC「海のぬし釣り」的な、スマホ縦画面向けの釣りRPG。
- コアループ:
  `港町 → 釣り場を選ぶ → 餌と仕掛けを選ぶ → キャスト → アタリ(QTE) → テンション管理ミニゲーム → 釣果 → 売却/図鑑登録`
- 現段階（プロトタイプ）のスコープ:
  - 魚: **5種**
  - 釣り場: **1箇所**（港の防波堤）
  - 餌: **3種**
  - 仕掛け: 2〜3種（餌とは別に、拡張性確認も兼ねて用意）
  - ショップでの装備購入・レベルアップ・複数釣り場などは**対象外**（将来拡張）。

## 2. 技術スタック

- React 19 + TypeScript + Vite
- Tailwind CSS v4（`@tailwindcss/vite` プラグイン。`tailwind.config.js` は持たず `index.css` の
  `@import "tailwindcss";` 方式）
- ルーティングライブラリは使わない。画面遷移は `App.tsx` 内の状態機械（`Screen` 型の union）で行う
  （プロトタイプ規模ではURL遷移は不要と判断）。
- 状態管理はライブラリを追加せず、`useReducer` + Context の自作ストア（`src/store/`）。
- 永続化は `localStorage` のみ（バックエンドなし）。
- デプロイ: Vercel を想定。`vite build` の成果物 (`dist/`) をそのまま配信できる静的構成。
  `vercel.json` で SPA 用の rewrite を設定する。

### スクリプト

- `npm run dev` / `npm run build`（`tsc -b && vite build`） / `npm run preview` / `npm run lint`

## 3. ディレクトリ構成

```
src/
  data/            # ゲームデータ本体（JSON）。ここを編集するだけでコンテンツ追加可能にする
    fish.json      # 魚5種の定義
    baits.json     # 餌3種の定義
    rigs.json      # 仕掛け定義
    spots.json     # 釣り場定義（現状1箇所）
  types.ts         # データ/セーブデータの型定義
  game/
    balance.ts     # チューニング用定数（テンション増減量、TICK間隔など）
    fishing.ts     # アタリ抽選・魚選択・サイズ/価格ロジック（純粋関数、テストしやすい形）
    fightEngine.ts # テンション管理ミニゲームの1tick分の状態遷移（純粋関数）
  store/
    persist.ts     # localStorage の読み書き・マイグレーション
    GameContext.tsx# useReducer + Context によるグローバル状態
  components/
    screens/       # 画面単位のコンポーネント（下記4章のScreen enumに対応）
    ui/            # ゲージ等の再利用UI部品
  App.tsx
  main.tsx
  index.css
```

## 4. 画面遷移（状態機械）

`Screen` = `'harbor' | 'spotSelect' | 'tackle' | 'fishing' | 'fight' | 'result' | 'stock' | 'zukan'`

- **harbor（港町）**: 所持金表示、「釣りに出る」「在庫を売る」「図鑑」への導線。
- **spotSelect（釣り場選択）**: プロトタイプは1箇所のみだが、後で増やせるようリスト表示のまま実装。
- **tackle（餌・仕掛け選択）**: 餌3種・仕掛け2〜3種から選択して出船。
- **fishing（キャスト〜アタリ）**: キャスト→待機（アタリ抽選）→アタリ発生でQTE（一定時間内にタップ）
  →成功で `fight` へ、失敗/時間切れで「逃げられた」表示から `tackle` に戻れる。
- **fight（テンション管理ミニゲーム）**: 本プロトタイプの核。詳細は5章。
- **result（釣果）**: 釣れた魚のサイズ・価格を表示し、在庫に追加＆図鑑更新。「続けて釣る」で
  `fishing` へ、「港に戻る」で `harbor` へ。
- **stock（在庫/売却）**: 釣った魚を港で売却して所持金に変換。
- **zukan（図鑑）**: 5種の捕獲状況・最大サイズ・捕獲数を表示。未捕獲は `?` でシルエット表示。

## 5. テンション管理ミニゲームの仕様

- `TICK_MS`（既定 200ms）ごとにゲームループが進む。プレイヤーは「巻く」「緩める」ボタンを
  **押している間**そのアクションが有効（`onPointerDown` / `onPointerUp`）。どちらも押していなければ
  「様子見」＝魚の引きだけが反映される。
- 状態: `tension`（0〜100の糸の張力）, `stamina`（魚の体力。0で釣り上げ成功）。
- 毎tickの更新（`game/fightEngine.ts` に集約）:
  1. 魚の引き（`pullPattern` に応じた `tensionDelta` を算出。魚ごとの「引きのクセ」はここで表現）
  2. プレイヤー操作:
     - 巻く: `stamina -= REEL_DAMAGE`, `tension += REEL_TENSION_COST`
     - 緩める: `tension -= EASE_TENSION_RELIEF`, `stamina += EASE_STAMINA_REGEN`（魚がわずかに回復）
     - 様子見: 魚の引きのみ反映
  3. `tension` を `[0, 100]` に、`stamina` を `[0, staminaMax]` にクランプ
  4. `stamina <= 0` → 釣り上げ成功
  5. `tension >= 100` → 糸切れで逃げられる（失敗）
- 魚ごとの「引きのクセ」（`pullPattern`）:
  - `steady`: 常に一定量のテンション上昇（マアジ=弱い, カンパチ=強い）
  - `burst`: 普段は弱いが、一定確率で数tick連続の強い引きが発生（クロダイ）
  - `diver`: 「潜り」フェーズ（引きが弱く/マイナスでテンションが下がる＝油断を誘う）と
    「ダッシュ」フェーズ（急激なテンション上昇）を交互に繰り返す（ヒラメ）
  - `erratic`: 毎tickランダムに強弱が変わる予測不能な引き（海のぬし）
- 難易度差別化は基本的に「`pullPattern` + `pullPower` + `staminaMax`」で行い、巻く/緩めるの
  基礎パラメータ（`REEL_DAMAGE` 等）は全魚共通にする（実装をシンプルに保つため）。
- 仕掛け（rig）は `tensionSnapBonus`（糸切れ閾値への耐性）や `reelTensionModifier`
  （巻いたときのテンション上昇量の倍率）でこのバランスに介入する。

## 6. データ駆動設計（拡張方針）

魚・餌・仕掛け・釣り場は **すべて `src/data/*.json` に外出し**し、コード変更なしで
種類を増やせるようにする。`types.ts` の型に沿っていれば配列に1エントリ追加するだけでよい。

- `fish.json` の1エントリ = `FishDefinition`（id, 表示名, emoji, 説明, レアリティ, 出現重み,
  サイズ範囲, 基準価格, `staminaMax`, `pullPattern` とそのパラメータ, `favoredBaitIds`,
  `spotIds`）
- `baits.json` の1エントリ = `BaitDefinition`（id, 表示名, emoji, 説明, コスト,
  `biteRateMultiplier`）
- `rigs.json` の1エントリ = `RigDefinition`（id, 表示名, 説明, `tensionSnapBonus`,
  `reelTensionModifier`, `biteRateMultiplier`）
- `spots.json` の1エントリ = `SpotDefinition`（id, 表示名, 説明, `fishIds`,
  アタリ待機時間の範囲）

魚を1種追加したい場合は `fish.json` に追加し、必要なら `spotIds` / `favoredBaitIds` を
既存の餌・釣り場のIDに合わせるだけでよい。図鑑・釣果選択ロジックは配列を動的に走査するため
コード変更は不要という設計にする。

## 7. セーブデータ（localStorage）

- キー: `umi-no-nushi:save`
- スキーマに `version` を持たせ、将来のマイグレーションに備える。
- 保存内容: 所持金、在庫（未売却の釣果リスト）、図鑑進捗（捕獲済みフラグ・最大サイズ・捕獲数）。
- 保存タイミング: 状態が変化するたびに `useEffect` でシリアライズして保存（デバウンス無しでOKな
  規模）。読み込み失敗・スキーマ不一致時は初期状態にフォールバックする。

## 8. UI/UX 方針

- **縦画面（ポートレート）専用**。`max-w-md` 程度の中央カラムに収め、横幅が広い画面でも
  スマホライクな縦長カードとして表示する。
- タップ操作前提。ボタンは指で押しやすい大きさ（最低 44px 相当）にする。
- 配色は海/港をイメージした青系をベースにしたTailwindユーティリティで統一。
- アニメーションはCSSトランジション程度に留め、外部ライブラリは追加しない。

## 9. 将来拡張（プロトタイプ範囲外・メモ）

- 釣り場の追加、道具屋での竿/リール購入によるパラメータ強化
- 図鑑コンプリート報酬、実績システム
- サウンド、より豊かなキャストアニメーション
- セーブデータのクラウド同期・複数スロット

## 10. コーディング規約

- 型は `strict` を維持（Viteテンプレート既定のまま）。
- ゲームロジック（抽選・tick計算）は副作用のない純粋関数として `src/game/` に置き、
  UIコンポーネントからはそれを呼び出すだけにする（テスト容易性・見通しの良さのため）。
- コンポーネントは画面単位を `screens/`、使い回すUI部品を `ui/` に分離する。
