# umi-no-nushi（架空の漁村を舞台にした釣りRPG）プロジェクト方針

このドキュメントは実装前に方針を固めるためのもの。以降このリポジトリで作業する際は、
まずここを読み、設計判断はここに追記/更新してから進めること。

**権利関係の方針**: 本作はSFC「海のぬし釣り」の**構造・システム**にインスパイアされたオリジナル
作品である。既存ゲームの画像・音楽・キャラクター名・地名・固有名詞は一切使用しない。
舞台の漁村・登場人物・釣り場・魚はすべてオリジナルの名称とする（例: 村名は「凪浦(なぎうら)」）。

## 1. コンセプト

- 見下ろし型のフィールドを歩いて探索できる釣りRPG。
- 主人公は凪浦という架空の漁村にやってきた若者。村人の噂を頼りに釣り場を巡り、
  道具（竿・リール・糸）を強化しながら、各エリアに棲む「ぬし」を釣り上げていく。
  最終目標は最奥の海域にいるという伝説の「大ぬし」。
- 元ネタ（SFC「海のぬし釣り」）から引き継ぐ構造:
  - フィールド探索＋NPC会話によるRPG部分
  - 仕掛け/餌選択→キャスト→アタリ待ち→アワセ→ファイト、という釣りの手順
  - 道具の強化が大物を釣るための進行ゲートになっている点
  - 時間帯・天候によって釣れる魚が変わる点
  - エリアごとの「ぬし」を釣ると次のエリアが解放される点

## 2. 技術スタック

- React 19 + TypeScript + Vite
- Tailwind CSS v4（`@tailwindcss/vite` プラグイン。`tailwind.config.js` は持たず `index.css` の
  `@import "tailwindcss";` 方式）
- ルーティングライブラリは使わない。画面遷移は `App.tsx` 内の状態機械（`Screen` 型の union）で行う。
- 状態管理はライブラリを追加せず、`useReducer` + Context の自作ストア（`src/store/`）。
- 永続化は `localStorage` のみ（バックエンドなし）。セーブデータは `version` 付きでマイグレーション
  可能にする（詳細は7章）。
- デプロイ: Vercel。`vite build` の成果物 (`dist/`) をそのまま配信できる静的構成。
  `vercel.json` で SPA 用の rewrite を設定する。
- グラフィック: 画像アセットは使わず、すべてコードで生成する。村マップ(フィールド探索)は
  Canvasにプログラムで直接ドット絵(タイル・建物・キャラクタースプライト)を描く方式
  （`game/pixelArt.ts`、詳細は5章）。それ以外の画面(釣り・図鑑等)は当面、色付き矩形・絵文字・
  CSSで仮置きする。将来置き換える場合に備え、見た目(色/絵文字/パレット)はデータ or 定数から
  取得する形にし、コンポーネント側にハードコードしない。

### スクリプト

- `npm run dev` / `npm run build`（`tsc -b && vite build`） / `npm run preview` / `npm run lint`

## 3. ディレクトリ構成

```
src/
  data/              # ゲームデータ本体（JSON）。ここを編集するだけでコンテンツ追加可能にする
    fish.json        # 魚の定義（4エリア×regular+ぬし構成）
    baits.json       # 餌の定義
    rigs.json        # 仕掛け(釣行ごとに選ぶ消耗品的な糸)の定義
    rods.json         # 竿の定義(所持品として道具屋で購入)
    reels.json        # リールの定義(同上)
    lines.json         # 糸(道具としての本線)の定義(同上)
    spots.json       # 釣り場の定義（4エリア、解放条件つき）
    village.json      # フィールドマップ定義（凪浦。将来複数マップに拡張）
    villagers.json    # 村人の会話データ
    index.ts          # 上記jsonをロード・型付けして export
  types.ts           # データ/セーブデータの型定義
  game/              # 副作用のない純粋関数群（テストしやすい形を維持）
    balance.ts        # ファイトのチューニング定数
    fishing.ts         # アタリ抽選・魚選択・サイズ/価格ロジック(時間帯/天候フィルタ込み)
    fightEngine.ts      # テンション管理ミニゲームの1tick分の状態遷移(道具ゲート込み)
    gear.ts              # 所持道具から現在の装備ステータスを求める
    field.ts            # フィールド上の移動・当たり判定・インタラクション判定
    pixelArt.ts          # タイル・建物・キャラクタースプライトをCanvasにコード生成する
    time.ts              # 時間帯/天候の進行ロジック
  store/
    persist.ts         # localStorage の読み書き・マイグレーション
    GameContext.tsx    # useReducer + Context によるグローバル状態
  components/
    screens/           # 画面単位のコンポーネント（4章のScreenに対応）
    ui/                 # ゲージ・ダイアログ・十字キー等の再利用UI部品
  App.tsx
  main.tsx
  index.css
```

**餌・仕掛け(rigs.json) は釣行ごとに選ぶ消耗品的な選択**、**竿・リール・糸(rods/reels/lines.json)
は道具屋で購入して持ち帰る所持品**、という2系統に分けている(6章参照)。両者は独立して重ね掛けされる。

## 4. 画面構成・遷移（状態機械）

`Screen` = `'field' | 'spotSelect' | 'tackle' | 'fishing' | 'fight' | 'result' | 'stock' | 'zukan' | 'toolShop'`

`field` がゲームのホーム画面であり、以前の「港町（ボタン選択のみのメニュー画面）」を置き換える。

- **field（フィールド探索）**: 凪浦を見下ろし視点で歩き回る。詳細は5章。
  - 村人に話しかけると会話ウィンドウが開く（釣りのヒント・噂など）。
  - 建物に入る/近づくと対応する画面 or 会話が開く（道具屋・餌屋・漁協・宿屋・自宅）。
  - 村の外れの「海への道」を進むと `spotSelect` へ。
  - 画面内の「メニュー」ボタンから図鑑(`zukan`)などにアクセスできる（4章メニュー要件に対応）。
- **spotSelect（釣り場選択）**: 4エリアをリスト表示。未解放のエリアは🔒表示で選択不可
  （解放条件は7章 `unlockRequiresFishId` を参照）。
- **tackle（餌・仕掛け選択）**: 餌・仕掛け(釣行ごとの消耗品)を選んで出船。現在装備中の
  竿・リール・糸（道具屋での所持品、6章参照）も表示する。
- **fishing（キャスト〜アタリ〜アワセ）**: 詳細は6章。
- **fight（テンション管理ミニゲーム）**: 詳細は6章。
- **result（釣果）**: サイズ・価格を表示、在庫追加＆図鑑更新。初めてぬしを釣った場合は
  「新しい釣り場が解放された」ことも表示する。「続けて釣る」/「村に戻る」。
- **stock（在庫/売却＝漁協）**: 在庫を売却して所持金に変換。フィールド上の「漁協」から遷移。
- **zukan（図鑑）**: 捕獲状況・最大サイズ・捕獲数を表示。フィールドの「メニュー」から遷移。
- **toolShop（道具屋）**: 竿・リール・糸を購入する。フィールド上の「道具屋」から遷移。詳細は6章。

会話ウィンドウ（ダイアログボックス）は画面下部に固定表示され、1文ずつタップで送る
（3章の「会話ウィンドウ」要件・`components/ui/DialogueBox.tsx`）。フィールド探索中に
オーバーレイとして開き、移動入力は会話中は無効化する。

## 5. フィールド探索の仕様(SFC風タイルマップ)

見た目は絵文字を一切使わず、**すべてコードで直接ドット絵を描画する**（画像アセットは使わない）。

### タイル描画

- タイルは 16×16 ピクセルを基準に `game/pixelArt.ts` がCanvasへプログラムで直接描画する
  （`TILE_SIZE = 16`）。実際の表示は `SCALE`（既定2倍）で拡大し、`imageSmoothingEnabled = false`
  で滲ませず、`drawImage` はにじみ防止のため必ずニアレストネイバーで拡大する。
- 一度描いたタイル/建物セル/キャラクタースプライトは `HTMLCanvasElement` にオフスクリーン
  レンダリングしてメモ化する（`getTileCanvas` / `getBuildingCellCanvas` / `getCharacterCanvas`）。
  毎フレーム塗り直さず、メインループでは `drawImage` するだけにして負荷を抑える。
- タイル種別(`TileType`): `dirt`(土) / `grass`(草) / `sand`(砂) / `cobble`(石畳) / `rock`(岩、
  通行不可) / `sea`(海、通行不可・2〜3フレームで波をアニメ) / `beach`(砂浜) / `pier`(桟橋の木床)。
- パレットは彩度低めの和風配色（`game/pixelArt.ts` の `PALETTE` 定数）。同じ種別でも
  `TILE_VARIANTS`(既定3)通りの見た目バリエーションを持たせ、`tileVariantFor(x, y)` でマス位置
  ごとに決定論的に割り当てることで、単調な繰り返しに見えないようにする。海のアニメだけは
  全タイル共通の1つの`seaFrame`で同期させる（潮の満ち引きが村全体で揃って見えるように）。

### マップ構成

- `village.json` はタイル座標ベースのマップを1つ定義する（村＝凪浦）。将来的に複数マップに
  拡張できるよう、`VillageMapDefinition` 単位で持てる構造を維持する。
- 地形は `terrainRows: string[]`（1行1文字コード。`g`=草 `d`=土 `s`=砂 `c`=石畳 `r`=岩 `w`=海
  `b`=砂浜 `p`=桟橋。対応表は `game/field.ts` の `TILE_CODE`）で表現し、`parseTerrain` で
  `TileType[][]` に変換する。
- 建物は `buildings: BuildingDefinition[]` で、1タイルではなく `width × height`
  （3×2〜4×3程度）の矩形を占有する。入口タイル(`entranceOffsetX/Y`で指定)以外は壁として
  通行不可になる。描画は屋根(`roof`/`roofEdge`)・壁(`wall`)・入口(`door`)のセルに分けて
  `roofColor` / `wallColor` から生成する。**入口は建物の低い側(通常は南側)からしか入れない**
  （屋根を突き抜けて反対側から入ることはできない、という現実的な当たり判定にしている）。
- 陸側(村)に建物を配置し、村の中心から桟橋へ向けて石畳の道を通し、砂浜を挟んで桟橋(`pier`)が
  海(`sea`)へ伸びる、という構成にする。桟橋の先の1タイルを `exits: ExitPlacement[]` の
  出口として定義し、そこに乗ると `spotSelect` 画面へ遷移する。
- NPCは `npcs: NpcPlacement[]` で1タイルに配置する。歩き回らず、その場で向きを変える程度の
  動きだけをする（`FieldScreen.tsx` の `npcFacingAt`。数秒おきにランダムで向きを変える）。

### 移動・当たり判定

- プレイヤーは**マス目単位ではなくピクセル単位で連続的に移動する**（`game/field.ts`）。
  `FieldPosition` はワールド座標(ピクセル)を持ち、方向キーを**押している間**その方向へ
  `MOVE_SPEED_PX_PER_SEC` の速度で進み続ける（離すと止まる。ホールド型の操作感は
  ファイト画面の「巻く/緩める」と同じ）。
- 当たり判定はプレイヤーの見た目(16×16)より小さい「足元」の矩形(`PLAYER_HITBOX`)の**中心が
  乗っているタイル1つ**が通行可能かどうかで判定する(`isTileWalkable`)。矩形全体が重なる
  複数タイルを見る方式にすると、入口や桟橋のような1マス幅の通路で壁にわずかに触れただけで
  身動きが取れなくなるため、中心点判定に単純化している。
- 移動先が
  - 通行不可(岩/海/建物の壁/NPCの立っている位置) → 移動できないが、押した方向へ向きだけ変える。
    その方向にNPCがいる場合は「ぶつかって話しかける」動作として `talk` を発火する
    （キーを押し続けている間に何度も開き直さないよう、直前に話したNPC IDを覚えて防ぐ）。
  - 建物の入口タイル → そこへ移動した上でその建物の `action` を実行する。
  - 出口タイル → そこへ移動した上で `action`（画面遷移）を実行する。
  - 通行可能な地形 → そのまま移動する。
- 上記はすべて `game/field.ts` の副作用のない関数として実装し、`FieldScreen.tsx` は
  `requestAnimationFrame` のループ内でこれらを呼び、結果をCanvasに描画するだけにする
  （React の state 更新は会話ウィンドウ/メニューの開閉など低頻度なものに限定し、位置や
  アニメーションフレームは `useRef` で保持してループのたびに直接Canvasへ描画する）。

### キャラクタースプライト

- プレイヤー・NPCとも 16×16 のドット絵スプライトを `game/pixelArt.ts` がコードで生成する
  （矩形の集まりとして定義し、`getCharacterCanvas(direction, frameIndex, colors)` で
  メモ化しつつ描画する）。上下左右4方向を持ち、`right` は `left` を左右反転して使い回す。
- 歩行は2フレームのアニメーション(脚の位置を入れ替えるだけの簡易なもの)で、実際に移動できた
  ときだけ一定間隔(`WALK_ANIM_FRAME_MS`)で切り替える。立ち止まっている間は1frame目に固定する。
- 服の色(`CLOTHING_COLORS`)は主人公専用の色と村人ごとの色を分け、見た目で区別できるようにする。

### カメラ

- マップはスマホ画面より大きく作り、キャンバスはプレイヤーを中心に追従してスクロールする
  （マップ端ではクランプしてそれ以上スクロールしない）。表示範囲は縦長画面を想定して
  概ね9×10タイル程度をビューポートとする。

### 操作UI

- 方向キーは画面下に半透明のオンスクリーン十字キー（`ui/DPad.tsx`）を重ねて表示する。
  ホールド型（`onPointerDown`で移動開始、`onPointerUp`/`onPointerLeave`で停止）。
- 所持金・日付/時間帯/天候の表示、会話ウィンドウは、いずれもドット絵風の枠
  （`ui/PixelPanel.tsx`。角を落としたクリップパスと二重ボーダーでSFC風のウィンドウ枠を表現）
  で統一する。

## 6. 釣りの手順とファイトの仕様

釣り場に着いてからの流れ: `仕掛け選択 → 餌選択 → キャスト → 待機(アタリ) → アワセ → ファイト
→ 取り込み → サイズ記録・図鑑登録`

- **キャスト**: 目標は「飛距離ゲージ」（伸び縮みするバーを狙ったタイミングで止める）による
  操作にする。**現状のプロトタイプ実装は簡略版**（ボタンを押すと固定モーションでキャスト完了）
  であり、飛距離ゲージは未実装（9章の実装状況を参照。将来 `fishing.ts` にゲージ判定ロジックを追加）。
- **待機**: アタリまでの待ち時間は `spots.json` の待機時間レンジと餌/仕掛けの倍率で決まる
  （既存の `rollBiteWaitMs` を流用）。アタリの候補魚は釣り場・餌に加え、**現在の時間帯・天候**
  でも絞り込まれる（`game/fishing.ts` の `candidateFish`。8章の時間帯・天候システムと連動）。
  将来的には待機中に魚影が水中で近づいてくる演出を追加する（9章）。
- **アワセ**: アタリ発生から一定時間内にタップすると成功。**将来的には「早すぎ」も失敗にする**
  （アタリの前にタップしてしまうケース）。現状のプロトタイプ実装はアタリ発生後の遅延失敗のみ
  判定している（9章）。
- **ファイト（テンション管理ミニゲーム）**: `game/fightEngine.ts` に集約。
  - `TICK_MS`（既定 200ms）ごとにゲームループが進む。「巻く」「緩める」ボタンを
    **押している間**そのアクションが有効。どちらも押していなければ魚の引きだけが反映される。
  - 状態: `tension`（糸の張力）、`stamina`（魚の体力。0で釣り上げ成功）。
  - 魚ごとの「引きのクセ」（`pullPattern`）: `steady` / `burst` / `diver` / `erratic`。
  - 難易度差別化は魚側の `pullPattern` + `pullPower` + `staminaMax` で行う。
  - 「巻く」操作: `stamina -= REEL_DAMAGE * gear.reelPower`（リールの巻き取り力が効く）,
    `tension += REEL_TENSION_COST * rig.reelTensionModifier`（仕掛けの糸質が効く）。
  - 「緩める」操作: `tension -= EASE_TENSION_RELIEF`, `stamina += EASE_STAMINA_REGEN`
    （全魚共通、道具では変化しない）。

### 道具による進行ゲート(竿・リール・糸)

- 竿・リール・糸は `rods.json` / `reels.json` / `lines.json` にステータス化して定義する
  （`RodDefinition.flex`＝竿の弾力、`ReelDefinition.reelPower`＝リールの巻き取り力、
  `LineDefinition.strength`＝糸の強度）。餌・仕掛けと違い**釣行ごとの選択ではなく道具屋
  （フィールド上の「道具屋」→`toolShop`画面）で購入して持ち帰る所持品**として扱い、セーブデータ
  の `ownedRodIds` / `ownedReelIds` / `ownedLineIds` に追加する。各カテゴリで所持している中から
  `tier` が最も高いものを自動装備する（個別に「装備する」操作はUI上に用意しない。`game/gear.ts`
  の `currentGear`）。
- 魚側は `FishDefinition.requiredLineStrength` で「このファイトに必要な糸の強度」を持つ。
  糸切れ耐性(`effectiveSnapTension`)は次の式で計算する（`game/fightEngine.ts`）:

  ```
  gearBonus = rodFlex + GEAR_DEFICIT_MULTIPLIER * (lineStrength - requiredLineStrength)
  effectiveSnapTension = TENSION_SNAP(100) + rig.tensionSnapBonus + gearBonus
  ```

  `GEAR_DEFICIT_MULTIPLIER`（既定2、`game/balance.ts`）により、必要強度に届いていないと
  閾値が大きく下がり、掛かってもほぼ確実に糸を切られる（＝「道具が弱いと大物は物理的に
  上げられない」ゲート）。逆に十分な強度を持つ道具なら閾値が100を大きく超え、ファイトが
  大きく楽になる。`TensionGameScreen` は `gear.lineStrength < fish.requiredLineStrength` の場合、
  ファイト画面に警告バナーを表示する。
- 仕掛け(rigs.json)の `tensionSnapBonus` / `reelTensionModifier` は引き続き有効で、道具の
  大きな補正の上に乗る小さな微調整として機能する。

## 7. データ駆動設計（拡張方針）

魚・餌・仕掛け・釣り場・フィールド・村人の会話は **すべて `src/data/*.json` に外出し**し、
コード変更なしで追加できるようにする。`types.ts` の型に沿っていれば配列に1エントリ追加するだけ
でよい。

- `fish.json` = `FishDefinition`（id, 表示名, emoji, 説明, レアリティ, 出現重み, サイズ範囲,
  基準価格, `staminaMax`, `pullPattern` とそのパラメータ, `favoredBaitIds`, `spotIds`,
  `requiredLineStrength`(道具ゲート), `isNushi?`(エリアのぬしフラグ),
  `appearsInTimeOfDay?` / `appearsInWeather?`(出現条件、未指定なら常時)）
- `baits.json` = `BaitDefinition`
- `rigs.json` = `RigDefinition`（釣行ごとの消耗品としての仕掛け）
- `rods.json` / `reels.json` / `lines.json` = `RodDefinition` / `ReelDefinition` /
  `LineDefinition`（id, 表示名, 説明, `cost`, `tier`, ステータス1つ。道具屋での所持品）
- `spots.json` = `SpotDefinition`（id, 表示名, 説明, `fishIds`, アタリ待機時間の範囲,
  `unlockRequiresFishId?`＝このIDの魚(通常はぬし)を釣るまで選択不可）
- `village.json` = `VillageMapDefinition`（id, 表示名, `width`/`height`, `startX`/`startY`,
  `terrainRows: string[]`(1文字コードの地形、5章参照), `buildings: BuildingDefinition[]`
  (矩形の建物、入口位置、屋根/壁の色), `npcs: NpcPlacement[]`, `exits: ExitPlacement[]`）
- `villagers.json` = `VillagerDefinition`（id, 表示名, `spriteColor`(ドット絵の服の色。
  `game/pixelArt.ts` の `CLOTHING_COLORS` のキー), `lines: string[]`。将来: 条件付き会話の
  分岐データ）

エリアを1つ追加したい場合は `spots.json` に `unlockRequiresFishId` で前段の釣り場のぬしIDを
指定したエントリを追加し、`fish.json` にそのエリアの通常種+ぬし(`isNushi: true`)を追加、
`favoredBaitIds` / `spotIds` を対応させるだけでよい。コード変更は不要。

魚やNPCを1体追加したい場合は対応するjsonに追加するだけで、探索・図鑑・釣果選択ロジックは
配列を動的に走査するためコード変更は不要という設計を維持する。

## 8. セーブデータ（localStorage）

- キー: `umi-no-nushi:save`
- スキーマに `version` を持たせ、マイグレーションに備える（現在 `version: 3`。`version: 1`/`2` の
  セーブは読み込み時にデフォルト値を補って `version: 3` として引き継ぐ。`persist.ts` の
  `migrateFromV1` / `migrateFromV2`）。
- 保存内容:
  - 所持金、在庫（未売却の釣果リスト）、図鑑進捗（既存）
  - `day`（経過日数）, `timeOfDay`（`'dawn' | 'day' | 'dusk' | 'night'`）, `weather`
    （`'sunny' | 'cloudy' | 'rainy'`）
  - `rumors: string[]`（村人から聞いて解放した噂ID。現状は保存のみで未使用。将来、追加の解放条件
    として使う余地を残す。エリア解放そのものは図鑑の捕獲済みフラグで判定している）
  - `ownedRodIds` / `ownedReelIds` / `ownedLineIds: string[]`（所持している道具のID一覧。
    tierが最も高いものを自動装備する。新規セーブは各カテゴリtier1の無料品を1つ所持した状態で
    始まる）
- 保存タイミング: 状態が変化するたびに `useEffect` でシリアライズして保存。
  読み込み失敗・スキーマ不一致時は初期状態にフォールバックする。

## 9. 実装状況とロードマップ

このプロジェクトは段階的に実装する。以下は現時点(このコミット時点)の実装状況。

### 実装済み
- **フィールド探索(SFC風タイルマップ)**（`village.json` 1マップ。地形・建物・NPCをすべて
  `game/pixelArt.ts` がコードでドット絵として生成し、絵文字は使わない。ピクセル単位の連続移動、
  中心点ベースの当たり判定、建物は入口以外通行不可、NPCとの会話、桟橋の出口）
- 会話ウィンドウ・所持金/時間帯表示は、いずれもドット絵風の枠(`ui/PixelPanel.tsx`)で統一
- 漁協（在庫売却）・宿屋（休むと時間帯が進む）・道具屋（`toolShop`画面）のフィールド連動
- 釣りの基本ループ（仕掛け/餌選択→キャスト→アタリ待ち→アワセ→ファイト→結果→図鑑登録）
- テンション管理ファイト（魚ごとの引きのクセ・仕掛けによる補正）
- **竿・リール・糸のステータス化と道具屋での購入**（`rods.json` / `reels.json` / `lines.json`、
  `ToolShopScreen`）。所持品からtier最高のものを自動装備する（`game/gear.ts`）
- **道具不足による大物釣り上げ不可ゲート**（`requiredLineStrength` と `GEAR_DEFICIT_MULTIPLIER`
  による糸切れ耐性の増減、`game/fightEngine.ts`）。ファイト画面に道具不足の警告バナーを表示
- **釣り場4エリア（堤防→磯→沖堤→離島）とエリアごとの「ぬし」**、ぬしを釣ると図鑑の捕獲済み
  フラグ経由で次エリアが解放（`SpotDefinition.unlockRequiresFishId`、`SpotSelectScreen`
  でロック表示）。初回撃破時は結果画面にエリア解放メッセージを表示
- **時間帯・天候による魚の出現テーブルの変化**（`FishDefinition.appearsInTimeOfDay` /
  `appearsInWeather`、`game/fishing.ts` の `candidateFish`）。ぬしは基本的にこれらの条件と
  専用の餌(生き餌)が揃った時のみ候補に入る
- 時間帯/天候の進行ロジック（`game/time.ts`）。宿屋で休むと進む
- localStorage永続化・マイグレーション（v1→v2→v3）

### 未実装（将来拡張として`CLAUDE.md`のみ更新済み、または完全に未着手）
- キャストの飛距離ゲージ（タイミング操作）
- アワセの「早すぎ失敗」判定
- 待機中に魚影が近づいてくる演出
- 道具屋での「装備を選ぶ」UI（現状は所持品からtier最高を自動装備するのみで、あえて弱い装備を
  選ぶ操作はできない）
- 噂システムの実質的な活用（`rumors` は保存されるが、解放条件としては未接続。現状のエリア解放は
  図鑑の捕獲済みフラグのみで判定している）
- 釣り画面(キャスト〜ファイト)自体のグラフィックはまだ絵文字/色付き矩形のプレースホルダーの
  ままで、村マップと同じドット絵描画には未対応（対応する場合はこのCLAUDE.mdを先に更新すること）
- セーブスロット複数化、実績等

## 10. UI/UX 方針

- **縦画面（ポートレート）専用**。`max-w-md` 程度の中央カラムに収める。
- タップ操作前提。ボタンは指で押しやすい大きさ（最低 44px 相当）。フィールドの十字キーのみ、
  操作性を優先し小さめのタイル状ボタンを許容する。
- 配色は海/漁村をイメージした青系ベースで統一。
- アニメーションはCSSトランジション程度に留め、外部ライブラリは追加しない。

## 11. コーディング規約

- 型は `strict` を維持。
- ゲームロジック（抽選・tick計算・移動判定・時間進行）は副作用のない純粋関数として `src/game/`
  に置き、UIコンポーネントからはそれを呼び出すだけにする。
- コンポーネントは画面単位を `screens/`、使い回すUI部品を `ui/` に分離する。
- 実在するゲーム・作品の固有名詞（キャラ名・地名・アイテム名等）を新規データに追加しない。
