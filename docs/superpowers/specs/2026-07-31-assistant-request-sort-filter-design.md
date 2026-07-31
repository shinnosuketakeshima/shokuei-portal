# 事務補佐依頼一覧 ソート・フィルタ機能 設計書

- 日付: 2026-07-31
- 対象: 学科ポータル（department-portal） `/assistant-requests` ページ

## 背景・目的

現在の`AssistantRequestTable`は`no`昇順の固定表示のみで、絞り込みは「エクスポート」機能の中に閉じた専用パネル（依頼日期間・受託状況・担当者）としてしか存在しない。データ件数が増えてきた（現時点で令和8年度分だけで101件）ため、画面上の一覧表自体に、任意の項目でのソート・フィルタを付ける。

## スコープ

**含む**
- 一覧表のカラムヘッダークリックによるソート（全カラム対象）
- 一覧表の上に常設するフィルタバー（依頼日期間・締切日期間・受託状況・依頼内容・依頼者・担当者・キーワード）
- エクスポート機能を「現在画面に表示されている内容（フィルタ・ソート適用後）をそのままダウンロード」する形に統合し、エクスポート専用の絞り込み条件は廃止する

**含まない**
- 複数カラムを組み合わせた複合ソート（1カラムのみ）
- フィルタ条件のURL保存・永続化（ページ遷移や再読み込みでリセットされる、現状のタブ切り替えと同様の挙動）
- サーバーサイド（Firestoreクエリ）でのフィルタ・ソート（既存方針通り、取得済みの全件をクライアント側で処理する）

## ソート仕様

- 対象カラム: No / 依頼日 / 依頼者 / 依頼内容 / 依頼詳細 / 締切日 / 受託状況 / 担当者 / 完了日 / 所要時間 / 備考（全11カラム）
- 操作: カラムヘッダーをクリックするたびに 昇順→降順→昇順 とトグルする。
- 表示: 現在ソート中のカラムのヘッダーに▲（昇順）／▼（降順）を表示する。
- 初期状態: `no`昇順（現状と同じ）。
- ソートキーの型に応じた比較:
  - `no`は数値として比較する（常に必須項目のため空文字考慮は不要）
  - 日付系（`requestDate` / `deadline` / `completedDate`）は`YYYY-MM-DD`文字列のまま比較する（空文字は末尾に来るようにする。詳細は下記）
  - `duration`（所要時間）は"20分"のような自由記述の文字列比較とする（現行データも文字列表記であり、厳密な数値ソートは対象外とする）
  - その他（`requester` / `category` / `detail` / `status` / `assignee` / `notes`）は文字列比較（`localeCompare`、日本語ロケール）
- 空文字（未入力）のフィールドを持つ行は、昇順・降順どちらでも常に末尾に表示する（並び替えのたびに位置が変わって混乱しないようにするため）。

## フィルタ仕様

一覧表の上に常設の「フィルタバー」を新設する（`AssistantRequestFilterBar.jsx`）。折りたたみはせず常時表示。

| 項目 | UI | 一致方法 |
|---|---|---|
| 依頼日（開始〜終了） | date input × 2 | `requestDate`が範囲内（両端含む、片方のみ指定可） |
| 締切日（開始〜終了） | date input × 2 | `deadline`が範囲内（同上） |
| 受託状況 | select（すべて／未対応／受託中／完了） | 完全一致 |
| 依頼内容 | select（すべて＋6カテゴリ） | 完全一致 |
| 依頼者 | text | 部分一致（`includes`） |
| 担当者 | text | 部分一致（`includes`） |
| キーワード | text | `detail`または`notes`のいずれかに部分一致 |

すべての条件は空欄・「すべて」なら絞り込みなし。複数条件を指定した場合はAND条件で絞り込む。

フィルタバーの末尾に「エクスポート」ボタンを配置する。押すと、現在の年度タブ・フィルタ・ソートがすべて適用された後の`visibleRequests`をそのまま`buildAssistantRequestWorkbook`に渡してダウンロードする（既存のExcel列構成・ファイル名規則は変更しない）。これに伴い、`ExportPanel.jsx`が持っていた独自の絞り込みUI（依頼日期間・受託状況・担当者のみ・エクスポート時だけ適用）は廃止する。

## データフロー・状態管理

`AssistantRequestPage.jsx`が新たに保持する状態:
- `filters`: `{ requestDateStart, requestDateEnd, deadlineStart, deadlineEnd, status, category, requester, assignee, keyword }`（すべて文字列、初期値は空文字/空選択）
- `sortKey`: 初期値 `'no'`
- `sortDirection`: 初期値 `'asc'`

算出ロジック（`useMemo`）:
1. `requests`を選択中の`selectedFiscalYear`で絞り込む（既存の`visibleRequests`相当）
2. `filters`の各条件でさらに絞り込む
3. `sortKey`/`sortDirection`でソートする（空文字は末尾）
4. 結果を`AssistantRequestTable`と「エクスポート」ボタンの両方に渡す

## コンポーネント変更

### 新規: `src/assistantRequests/AssistantRequestFilterBar.jsx`
- props: `filters`, `onFilterChange`, `onExport`
- フィルタ入力一式 + 「エクスポート」ボタンを描画する。エクスポートの実行（ワークブック生成・ダウンロード）自体は呼び出し元から渡される`onExport`コールバックに委譲する（このコンポーネント自体はFirestoreや`exportXlsx`を直接知らない）。

### 削除: `src/assistantRequests/ExportPanel.jsx`
- 役割を`AssistantRequestFilterBar.jsx`に統合し、ファイルごと削除する。

### 変更: `src/assistantRequests/AssistantRequestTable.jsx`
- 各カラムヘッダーを`<th onClick={() => onSort(columnKey)}>`に変更し、現在のソートキー・方向を示す▲▼を表示する。
- props に `sortKey`, `sortDirection`, `onSort` を追加する。ソート自体の計算ロジックは持たない（親から渡された`requests`をそのまま描画するだけ、という既存の責務は変えない）。

### 変更: `src/AssistantRequestPage.jsx`
- `filters`/`sortKey`/`sortDirection`のstateとハンドラを追加。
- `visibleRequests`の算出に「フィルタ」「ソート」のステップを追加。
- エクスポート実行ロジック（`buildAssistantRequestWorkbook`呼び出し＋`saveAs`）を`ExportPanel`から`AssistantRequestPage`（またはこのページ内の小さなヘルパー関数）に移す。

## エラーハンドリング

既存の踏襲。エクスポート失敗時のエラー表示は、`ExportPanel`が持っていた挙動（インラインのエラーメッセージ、`try/catch`）を`AssistantRequestPage`側に移して維持する。

## 対象外・今後の課題

- 複合ソート、フィルタ条件の保存・共有、サーバーサイドフィルタは対象外（今回はクライアント側処理のまま、既存方針を踏襲）。

## 検証計画（手動）

1. `npm run dev`で`/assistant-requests`を開き、各カラムヘッダーをクリックして昇順・降順が正しく切り替わることを確認する（▲▼表示も含む）。
2. 依頼日・締切日の期間指定、受託状況・依頼内容のプルダウン、依頼者・担当者・キーワードのテキスト絞り込みを単体および組み合わせで試し、一覧表の表示件数が正しく変わることを確認する。
3. フィルタを適用した状態で「エクスポート」を押し、ダウンロードされる`.xlsx`の内容が画面表示と一致すること（絞り込み・並び順とも）を確認する。
4. フィルタを全解除すると全件表示に戻ることを確認する。
