# タスクリスト：兼務申請一覧の作成と特定日付対応

- [ ] 一覧表示機能の実装 (`src/App.jsx`)
  - [ ] Firestore から `concurrent_works` コレクションのデータを取得するフック (`useEffect`) の実装
  - [ ] 取得したデータを表示するテーブルコンポーネント (`ConcurrentWorksList`) の作成
  - [ ] サイドバーに「申請一覧」メニューを追加
  - [ ] `react-router-dom` を使って `/applications-list` ルートを追加
- [ ] 「特定の数日」での申請対応
  - [ ] フォームに「期間ではなく、特定の日付を入力する場合（例：5月10日、5月15日）」の入力切り替え、またはフリーフォーマットのテキスト入力欄を追加
  - [ ] Wordの出力用変数（`periodStart` や `periodEnd`）のロジック調整
