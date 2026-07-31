// src/assistantRequests/constants.js
export const CATEGORIES = ['その他', '座席表作成', '座席表貼り出し', '印刷(講義)', '印刷(講義以外)', '試験監督'];
export const STATUSES = ['未対応', '受託中', '完了'];
export const DEFAULT_STATUS = '未対応';

// 一覧表の列 = ソート可能な項目。表のヘッダーとフィルタバーの「並び替え」
// プルダウンの両方がこれを参照するので、列を足すときはここだけ直せばよい。
// ただし sorting.js の型分類（NUMERIC_KEYS / DATE_KEYS / ORDINAL_KEYS）は
// 別途追従が必要（未分類のキーは文字列比較にフォールバックする）。
export const COLUMNS = [
  { key: 'no', label: 'No', nowrap: true },
  { key: 'requestDate', label: '依頼日', nowrap: true },
  { key: 'requester', label: '依頼者', nowrap: true },
  { key: 'category', label: '依頼内容', nowrap: true },
  { key: 'detail', label: '依頼詳細', nowrap: false },
  { key: 'deadline', label: '締切日', nowrap: true },
  { key: 'status', label: '受託状況', nowrap: true },
  { key: 'assignee', label: '担当者', nowrap: true },
  { key: 'completedDate', label: '完了日', nowrap: true },
  { key: 'duration', label: '所要時間', nowrap: true },
  { key: 'notes', label: '備考', nowrap: false }
];
