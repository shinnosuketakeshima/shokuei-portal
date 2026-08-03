# 事務補佐依頼一覧 ソート・フィルタ Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add click-to-sort column headers and a persistent multi-field filter bar to the `/assistant-requests` list, and fold the existing export-only filter into it so exporting always downloads exactly what's currently displayed.

**Architecture:** Two new pure logic modules (`sorting.js`, `filtering.js`) compute the displayed row set from raw Firestore data; `AssistantRequestTable.jsx` gains clickable, indicator-showing headers; a new `AssistantRequestFilterBar.jsx` replaces `ExportPanel.jsx` and owns only the filter inputs and an export trigger button (no business logic of its own); `AssistantRequestPage.jsx` holds the filter/sort state and composes everything, including the export action (moved out of the old `ExportPanel.jsx`).

**Tech Stack:** React 19, `exceljs` + `file-saver` (already used), Tailwind CSS v4 utility classes, `lucide-react` icons. No new dependencies.

**Spec:** `docs/superpowers/specs/2026-07-31-assistant-request-sort-filter-design.md`

## Global Constraints

- No test framework (Jest/Vitest/etc.) exists in this repo. Pure logic modules are verified with standalone `node --input-type=module -e` snippets; UI components are verified with `npm run lint` + read-through; the final integration task is verified manually in the browser.
- `package.json` has `"type": "module"` — every new file is an ES module.
- Internal relative imports within `src/assistantRequests/` use explicit `.js` extensions (e.g. `from './constants.js'`), matching the convention already used by every existing file in that folder.
- `npm run lint` has some number of pre-existing errors confined to `scratch/general_form.js`, entirely unrelated to this feature (this count doubles if a git worktree happens to exist under `.claude/worktrees/` at the time, since ESLint's config does not exclude that path — that is a pre-existing repo quirk, not something to fix here). Judge lint cleanliness only for the files this plan touches.
- Sort keys: `no` (numeric), `requestDate`/`deadline`/`completedDate` (date strings, compared as `YYYY-MM-DD`), `duration` (plain string), `requester`/`category`/`detail`/`status`/`assignee`/`notes` (string, `localeCompare` with `'ja'` locale). A row whose value for the active sort key is an empty string/undefined/null always sorts to the end, in both ascending and descending order.
- Filter fields and their exact keys: `requestDateStart`, `requestDateEnd`, `deadlineStart`, `deadlineEnd` (date range, inclusive, either bound optional), `status` (exact match against `STATUSES`, empty = no restriction), `category` (exact match against `CATEGORIES`, empty = no restriction), `requester`, `assignee` (substring match), `keyword` (substring match against `detail` OR `notes`). All conditions combine with AND. All fields empty = no filtering.
- This feature reads Firestore data (already populated in production — 101 real documents) but does not need to write any new data to verify sorting/filtering/export, so manual verification carries none of the "don't pollute production" caution earlier work in this app required for add/edit/delete flows.

---

## File Structure Overview

```
src/
  assistantRequests/
    sorting.js                    (Task 1 — new, pure: sortRequests)
    filtering.js                  (Task 2 — new, pure: filterRequests, emptyFilters)
    AssistantRequestFilterBar.jsx (Task 3 — new, replaces ExportPanel.jsx)
    ExportPanel.jsx               (Task 5 — deleted)
    AssistantRequestTable.jsx     (Task 4 — modified: sortable headers)
  AssistantRequestPage.jsx        (Task 5 — modified: wire filter/sort/export state)
```

---

## Task 1: Pure sort comparator

**Files:**
- Create: `src/assistantRequests/sorting.js`

**Interfaces:**
- Produces: `sortRequests(requests: object[], sortKey: string, sortDirection: 'asc' | 'desc') => object[]` (returns a new array, does not mutate the input). Task 5 (`AssistantRequestPage.jsx`) imports this by this exact name.

- [ ] **Step 1: Write the module**

```js
// src/assistantRequests/sorting.js
const NUMERIC_KEYS = new Set(['no']);
const DATE_KEYS = new Set(['requestDate', 'deadline', 'completedDate']);

function isEmpty(value) {
  return value === '' || value === undefined || value === null;
}

function compareValues(va, vb, key) {
  if (NUMERIC_KEYS.has(key)) return va - vb;
  if (DATE_KEYS.has(key)) return va < vb ? -1 : va > vb ? 1 : 0;
  return String(va).localeCompare(String(vb), 'ja');
}

export function sortRequests(requests, sortKey, sortDirection) {
  const directionMultiplier = sortDirection === 'desc' ? -1 : 1;
  return [...requests].sort((a, b) => {
    const va = a[sortKey];
    const vb = b[sortKey];
    const aEmpty = isEmpty(va);
    const bEmpty = isEmpty(vb);
    if (aEmpty && bEmpty) return 0;
    if (aEmpty) return 1;
    if (bEmpty) return -1;
    return compareValues(va, vb, sortKey) * directionMultiplier;
  });
}
```

Note the empty-value branches (`aEmpty`/`bEmpty`) return their `1`/`-1` **without** multiplying by `directionMultiplier` — this is what keeps empty values pinned to the end regardless of ascending/descending. Do not "simplify" this by sorting once and calling `.reverse()` for descending order; that would move empty values to the front on descending sorts, which contradicts the spec.

- [ ] **Step 2: Verify with a standalone script**

Run:

```bash
node --input-type=module -e "
import { sortRequests } from './src/assistantRequests/sorting.js';

const noRows = [{ no: 3 }, { no: 1 }, { no: 2 }];
console.log(sortRequests(noRows, 'no', 'asc').map((r) => r.no));   // expect [ 1, 2, 3 ]
console.log(sortRequests(noRows, 'no', 'desc').map((r) => r.no));  // expect [ 3, 2, 1 ]

const durationRows = [{ no: 1, duration: '20分' }, { no: 2, duration: '' }, { no: 3, duration: '5分' }];
console.log(sortRequests(durationRows, 'duration', 'asc').map((r) => r.duration));  // expect [ '20分', '5分', '' ]
console.log(sortRequests(durationRows, 'duration', 'desc').map((r) => r.duration)); // expect [ '5分', '20分', '' ] (empty still last)

const dateRows = [{ requestDate: '2026-05-01' }, { requestDate: '' }, { requestDate: '2026-03-02' }];
console.log(sortRequests(dateRows, 'requestDate', 'asc').map((r) => r.requestDate));  // expect [ '2026-03-02', '2026-05-01', '' ]
console.log(sortRequests(dateRows, 'requestDate', 'desc').map((r) => r.requestDate)); // expect [ '2026-05-01', '2026-03-02', '' ]
"
```

Expected output, one array per line, exactly matching the comments above.

- [ ] **Step 3: Commit**

```bash
git add src/assistantRequests/sorting.js
git commit -m "feat: add pure sort comparator for assistant request list"
```

---

## Task 2: Pure filter predicate

**Files:**
- Create: `src/assistantRequests/filtering.js`

**Interfaces:**
- Produces: `emptyFilters() => object` (returns a fresh filters object with all 9 keys set to `''`), `filterRequests(requests: object[], filters: object) => object[]`. Task 3 (`AssistantRequestFilterBar.jsx`) uses the shape from `emptyFilters()` as its state shape; Task 5 (`AssistantRequestPage.jsx`) imports both by these exact names.

- [ ] **Step 1: Write the module**

```js
// src/assistantRequests/filtering.js
export function emptyFilters() {
  return {
    requestDateStart: '',
    requestDateEnd: '',
    deadlineStart: '',
    deadlineEnd: '',
    status: '',
    category: '',
    requester: '',
    assignee: '',
    keyword: ''
  };
}

export function filterRequests(requests, filters) {
  return requests.filter((r) => {
    if (filters.requestDateStart && r.requestDate < filters.requestDateStart) return false;
    if (filters.requestDateEnd && r.requestDate > filters.requestDateEnd) return false;
    if (filters.deadlineStart && r.deadline < filters.deadlineStart) return false;
    if (filters.deadlineEnd && r.deadline > filters.deadlineEnd) return false;
    if (filters.status && r.status !== filters.status) return false;
    if (filters.category && r.category !== filters.category) return false;
    if (filters.requester && !(r.requester ?? '').includes(filters.requester)) return false;
    if (filters.assignee && !(r.assignee ?? '').includes(filters.assignee)) return false;
    if (filters.keyword) {
      const haystack = `${r.detail ?? ''} ${r.notes ?? ''}`;
      if (!haystack.includes(filters.keyword)) return false;
    }
    return true;
  });
}
```

- [ ] **Step 2: Verify with a standalone script**

Run:

```bash
node --input-type=module -e "
import { filterRequests, emptyFilters } from './src/assistantRequests/filtering.js';

const rows = [
  { no: 1, requestDate: '2026-05-01', deadline: '2026-05-10', status: '完了', category: 'その他', requester: '竹嶋', assignee: '鈴木', detail: 'テスト1', notes: '' },
  { no: 2, requestDate: '2026-06-01', deadline: '2026-06-10', status: '受託中', category: '座席表作成', requester: '石井', assignee: '田中', detail: '座席表', notes: '急ぎ' }
];

console.log(filterRequests(rows, emptyFilters()).map((r) => r.no)); // expect [ 1, 2 ]
console.log(filterRequests(rows, { ...emptyFilters(), status: '完了' }).map((r) => r.no)); // expect [ 1 ]
console.log(filterRequests(rows, { ...emptyFilters(), requestDateStart: '2026-05-15' }).map((r) => r.no)); // expect [ 2 ]
console.log(filterRequests(rows, { ...emptyFilters(), keyword: '急ぎ' }).map((r) => r.no)); // expect [ 2 ]
console.log(filterRequests(rows, { ...emptyFilters(), requester: '石' }).map((r) => r.no)); // expect [ 2 ]
console.log(filterRequests(rows, { ...emptyFilters(), category: 'その他', status: '受託中' }).map((r) => r.no)); // expect [] (AND of two conditions, no row matches both)
"
```

Expected output: `[ 1, 2 ]`, `[ 1 ]`, `[ 2 ]`, `[ 2 ]`, `[ 2 ]`, `[]`.

- [ ] **Step 3: Commit**

```bash
git add src/assistantRequests/filtering.js
git commit -m "feat: add pure filter predicate for assistant request list"
```

---

## Task 3: Filter bar component

**Files:**
- Create: `src/assistantRequests/AssistantRequestFilterBar.jsx`

**Interfaces:**
- Consumes: `STATUSES`, `CATEGORIES` from `src/assistantRequests/constants.js`.
- Produces: default export `AssistantRequestFilterBar({ filters, onFilterChange, onExport, isExporting })`. `filters` is the shape returned by `emptyFilters()` (Task 2). `onFilterChange(key: string, value: string) => void` is called on every input change. `onExport() => void` is called when the export button is clicked. `isExporting: boolean` disables the export button and swaps its label while an export is in progress. This component holds no state of its own and does not import Firestore, `exceljs`, or `file-saver` — it is purely a controlled-input renderer.

- [ ] **Step 1: Write the component**

```jsx
// src/assistantRequests/AssistantRequestFilterBar.jsx
import { Download } from 'lucide-react';
import { STATUSES, CATEGORIES } from './constants.js';

export default function AssistantRequestFilterBar({ filters, onFilterChange, onExport, isExporting }) {
  const handleChange = (e) => {
    const { name, value } = e.target;
    onFilterChange(name, value);
  };

  return (
    <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm space-y-3">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">依頼日（開始）</label>
          <input type="date" name="requestDateStart" value={filters.requestDateStart} onChange={handleChange}
            className="w-full px-2 py-1.5 border border-slate-300 rounded-md text-sm" />
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">依頼日（終了）</label>
          <input type="date" name="requestDateEnd" value={filters.requestDateEnd} onChange={handleChange}
            className="w-full px-2 py-1.5 border border-slate-300 rounded-md text-sm" />
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">締切日（開始）</label>
          <input type="date" name="deadlineStart" value={filters.deadlineStart} onChange={handleChange}
            className="w-full px-2 py-1.5 border border-slate-300 rounded-md text-sm" />
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">締切日（終了）</label>
          <input type="date" name="deadlineEnd" value={filters.deadlineEnd} onChange={handleChange}
            className="w-full px-2 py-1.5 border border-slate-300 rounded-md text-sm" />
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">受託状況</label>
          <select name="status" value={filters.status} onChange={handleChange}
            className="w-full px-2 py-1.5 border border-slate-300 rounded-md text-sm bg-white">
            <option value="">すべて</option>
            {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">依頼内容</label>
          <select name="category" value={filters.category} onChange={handleChange}
            className="w-full px-2 py-1.5 border border-slate-300 rounded-md text-sm bg-white">
            <option value="">すべて</option>
            {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">依頼者</label>
          <input type="text" name="requester" value={filters.requester} onChange={handleChange}
            className="w-full px-2 py-1.5 border border-slate-300 rounded-md text-sm" />
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">担当者</label>
          <input type="text" name="assignee" value={filters.assignee} onChange={handleChange}
            className="w-full px-2 py-1.5 border border-slate-300 rounded-md text-sm" />
        </div>
        <div className="col-span-2 md:col-span-4">
          <label className="block text-xs font-bold text-slate-700 mb-1">キーワード（依頼詳細・備考）</label>
          <input type="text" name="keyword" value={filters.keyword} onChange={handleChange}
            className="w-full px-2 py-1.5 border border-slate-300 rounded-md text-sm" />
        </div>
      </div>
      <div>
        <button onClick={onExport} disabled={isExporting}
          className="flex items-center gap-2 bg-blue-800 text-white py-1.5 px-4 rounded-lg text-sm font-bold hover:bg-blue-900 disabled:opacity-50 transition-colors">
          <Download className="w-4 h-4" />
          {isExporting ? '生成中...' : 'エクスポート'}
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify it compiles and lints cleanly**

Run: `npm run lint`
Expected: no errors reported for `src/assistantRequests/AssistantRequestFilterBar.jsx`. (This file is not yet imported anywhere — `ExportPanel.jsx` still exists and is still what `AssistantRequestPage.jsx` uses at this point in the plan. Task 5 does the swap.)

- [ ] **Step 3: Commit**

```bash
git add src/assistantRequests/AssistantRequestFilterBar.jsx
git commit -m "feat: add filter bar component for assistant request list"
```

---

## Task 4: Sortable table headers

**Files:**
- Modify: `src/assistantRequests/AssistantRequestTable.jsx`

**Interfaces:**
- Produces: `AssistantRequestTable` gains three new props: `sortKey: string`, `sortDirection: 'asc' | 'desc'`, `onSort: (key: string) => void`. Existing props (`requests`, `onRowClick`, `onDelete`) are unchanged. Task 5 passes `sortKey`/`sortDirection` state and a `handleSort` callback.

- [ ] **Step 1: Replace the header row**

The current file (read it first to confirm line numbers before editing) has this structure:

```jsx
// src/assistantRequests/AssistantRequestTable.jsx
import { Trash2 } from 'lucide-react';

const STATUS_STYLES = {
  '未対応': 'bg-slate-100 text-slate-600',
  '受託中': 'bg-amber-100 text-amber-800',
  '完了': 'bg-emerald-100 text-emerald-800'
};

export default function AssistantRequestTable({ requests, onRowClick, onDelete }) {
  if (requests.length === 0) {
    return <div className="p-8 text-center text-slate-500">この年度の依頼はまだありません。</div>;
  }

  return (
    <table className="w-full text-sm text-left">
      <thead className="bg-slate-100 text-slate-700 font-bold sticky top-0">
        <tr>
          <th className="px-3 py-3 border-b border-slate-200 whitespace-nowrap">No</th>
          <th className="px-3 py-3 border-b border-slate-200 whitespace-nowrap">依頼日</th>
          <th className="px-3 py-3 border-b border-slate-200 whitespace-nowrap">依頼者</th>
          <th className="px-3 py-3 border-b border-slate-200 whitespace-nowrap">依頼内容</th>
          <th className="px-3 py-3 border-b border-slate-200">依頼詳細</th>
          <th className="px-3 py-3 border-b border-slate-200 whitespace-nowrap">締切日</th>
          <th className="px-3 py-3 border-b border-slate-200 whitespace-nowrap">受託状況</th>
          <th className="px-3 py-3 border-b border-slate-200 whitespace-nowrap">担当者</th>
          <th className="px-3 py-3 border-b border-slate-200 whitespace-nowrap">完了日</th>
          <th className="px-3 py-3 border-b border-slate-200 whitespace-nowrap">所要時間</th>
          <th className="px-3 py-3 border-b border-slate-200">備考</th>
          <th className="px-3 py-3 border-b border-slate-200 w-10"></th>
        </tr>
      </thead>
```

Replace the function signature and the `<thead>` block with:

```jsx
// src/assistantRequests/AssistantRequestTable.jsx
import { Trash2 } from 'lucide-react';

const STATUS_STYLES = {
  '未対応': 'bg-slate-100 text-slate-600',
  '受託中': 'bg-amber-100 text-amber-800',
  '完了': 'bg-emerald-100 text-emerald-800'
};

const COLUMNS = [
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

export default function AssistantRequestTable({ requests, onRowClick, onDelete, sortKey, sortDirection, onSort }) {
  if (requests.length === 0) {
    return <div className="p-8 text-center text-slate-500">この年度の依頼はまだありません。</div>;
  }

  return (
    <table className="w-full text-sm text-left">
      <thead className="bg-slate-100 text-slate-700 font-bold sticky top-0">
        <tr>
          {COLUMNS.map((col) => (
            <th
              key={col.key}
              onClick={() => onSort(col.key)}
              className={`px-3 py-3 border-b border-slate-200 cursor-pointer select-none hover:bg-slate-200 transition-colors ${col.nowrap ? 'whitespace-nowrap' : ''}`}
            >
              {col.label}{sortKey === col.key ? (sortDirection === 'asc' ? ' ▲' : ' ▼') : ''}
            </th>
          ))}
          <th className="px-3 py-3 border-b border-slate-200 w-10"></th>
        </tr>
      </thead>
```

Everything after the `</thead>` (the `<tbody>` and its row rendering) is unchanged — do not touch it.

- [ ] **Step 2: Verify it compiles and lints cleanly**

Run: `npm run lint`
Expected: no new errors reported for `src/assistantRequests/AssistantRequestTable.jsx`.

- [ ] **Step 3: Commit**

```bash
git add src/assistantRequests/AssistantRequestTable.jsx
git commit -m "feat: add sortable column headers to assistant request table"
```

---

## Task 5: Wire filters, sort, and export into the page

**Files:**
- Modify: `src/AssistantRequestPage.jsx`
- Delete: `src/assistantRequests/ExportPanel.jsx`

**Interfaces:**
- Consumes: `sortRequests` (Task 1), `filterRequests`/`emptyFilters` (Task 2), `AssistantRequestFilterBar` (Task 3), the updated `AssistantRequestTable` props (Task 4), `buildAssistantRequestWorkbook` from `src/assistantRequests/exportXlsx.js` (pre-existing), `saveAs` from `file-saver` (pre-existing), `fiscalYearLabel` from `src/assistantRequests/fiscalYear.js` (pre-existing).
- Produces: `AssistantRequestPage` remains a self-contained page component with no props, mounted at `/assistant-requests` (route unchanged).

- [ ] **Step 1: Read the current file**

Read `src/AssistantRequestPage.jsx` in full before editing — this task rewrites large parts of it and the exact current content must be matched for each edit below.

- [ ] **Step 2: Update imports**

Find:

```jsx
import { currentFiscalYear, fiscalYearLabel } from './assistantRequests/fiscalYear.js';
import AssistantRequestForm from './assistantRequests/AssistantRequestForm';
import AssistantRequestTable from './assistantRequests/AssistantRequestTable';
import AssistantRequestEditModal from './assistantRequests/AssistantRequestEditModal';
import ExportPanel from './assistantRequests/ExportPanel';
```

Replace with:

```jsx
import { saveAs } from 'file-saver';
import { currentFiscalYear, fiscalYearLabel } from './assistantRequests/fiscalYear.js';
import { sortRequests } from './assistantRequests/sorting.js';
import { filterRequests, emptyFilters } from './assistantRequests/filtering.js';
import { buildAssistantRequestWorkbook } from './assistantRequests/exportXlsx.js';
import AssistantRequestForm from './assistantRequests/AssistantRequestForm';
import AssistantRequestTable from './assistantRequests/AssistantRequestTable';
import AssistantRequestEditModal from './assistantRequests/AssistantRequestEditModal';
import AssistantRequestFilterBar from './assistantRequests/AssistantRequestFilterBar';
```

- [ ] **Step 3: Add filter/sort/export state**

Find:

```jsx
  const [selectedFiscalYear, setSelectedFiscalYear] = useState(currentFiscalYear());
  const [editingRequest, setEditingRequest] = useState(null);
```

Replace with:

```jsx
  const [selectedFiscalYear, setSelectedFiscalYear] = useState(currentFiscalYear());
  const [editingRequest, setEditingRequest] = useState(null);
  const [filters, setFilters] = useState(emptyFilters());
  const [sortKey, setSortKey] = useState('no');
  const [sortDirection, setSortDirection] = useState('asc');
  const [isExporting, setIsExporting] = useState(false);
```

- [ ] **Step 4: Update `visibleRequests` to apply filtering and sorting**

Find:

```jsx
  const visibleRequests = useMemo(
    () => requests.filter((r) => r.fiscalYear === selectedFiscalYear).sort((a, b) => a.no - b.no),
    [requests, selectedFiscalYear]
  );
```

Replace with:

```jsx
  const visibleRequests = useMemo(() => {
    const forYear = requests.filter((r) => r.fiscalYear === selectedFiscalYear);
    const filtered = filterRequests(forYear, filters);
    return sortRequests(filtered, sortKey, sortDirection);
  }, [requests, selectedFiscalYear, filters, sortKey, sortDirection]);
```

- [ ] **Step 5: Add filter-change, sort, and export handlers**

Find (the end of `handleDelete`, right before the `return (`):

```jsx
  const handleDelete = async (id, no) => {
    if (!window.confirm(`No.${no} の依頼を削除します。よろしいですか？`)) return;
    setError(null);
    try {
      await deleteAssistantRequest(id);
      const updatedRequests = await fetchAllAssistantRequests();
      setRequests(updatedRequests);
    } catch (err) {
      console.error('Error deleting assistant request:', err);
      setError('削除に失敗しました。');
    }
  };

  return (
```

Replace with:

```jsx
  const handleDelete = async (id, no) => {
    if (!window.confirm(`No.${no} の依頼を削除します。よろしいですか？`)) return;
    setError(null);
    try {
      await deleteAssistantRequest(id);
      const updatedRequests = await fetchAllAssistantRequests();
      setRequests(updatedRequests);
    } catch (err) {
      console.error('Error deleting assistant request:', err);
      setError('削除に失敗しました。');
    }
  };

  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const handleSort = (key) => {
    if (sortKey === key) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDirection('asc');
    }
  };

  const handleExport = async () => {
    setError(null);
    setIsExporting(true);
    try {
      const buffer = await buildAssistantRequestWorkbook(visibleRequests, selectedFiscalYear);
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      saveAs(blob, `事務補佐依頼一覧_${fiscalYearLabel(selectedFiscalYear)}.xlsx`);
    } catch (err) {
      console.error('Error exporting assistant requests:', err);
      setError('エクスポートに失敗しました。');
    } finally {
      setIsExporting(false);
    }
  };

  return (
```

- [ ] **Step 6: Replace `ExportPanel` usage and wire the table's new sort props**

Find:

```jsx
        <ExportPanel requests={visibleRequests} fiscalYear={selectedFiscalYear} />

        {loading ? (
          <div className="p-8 text-center text-slate-500">読み込み中...</div>
        ) : (
          <div className="flex-1 min-h-0 overflow-auto border border-slate-200 rounded-lg">
            <AssistantRequestTable requests={visibleRequests} onRowClick={setEditingRequest} onDelete={handleDelete} />
          </div>
        )}
```

Replace with:

```jsx
        <AssistantRequestFilterBar
          filters={filters}
          onFilterChange={handleFilterChange}
          onExport={handleExport}
          isExporting={isExporting}
        />

        {loading ? (
          <div className="p-8 text-center text-slate-500">読み込み中...</div>
        ) : (
          <div className="flex-1 min-h-0 overflow-auto border border-slate-200 rounded-lg">
            <AssistantRequestTable
              requests={visibleRequests}
              onRowClick={setEditingRequest}
              onDelete={handleDelete}
              sortKey={sortKey}
              sortDirection={sortDirection}
              onSort={handleSort}
            />
          </div>
        )}
```

- [ ] **Step 7: Delete the now-unused `ExportPanel.jsx`**

```bash
git rm src/assistantRequests/ExportPanel.jsx
```

- [ ] **Step 8: Lint and build**

Run: `npm run lint`
Expected: no new errors (only the pre-existing, unrelated `scratch/general_form.js` errors).

Run: `npm run build`
Expected: build succeeds with no errors, and no warning about a missing `ExportPanel` import (confirming the deleted file has no remaining references).

- [ ] **Step 9: Manual verification**

Run: `npm run dev`, open `/assistant-requests`. This feature only reads existing data (101 real requests are already in production) and exports client-side — no new Firestore writes are needed to verify it, so there is nothing to clean up afterward.

1. Click each column header once: confirm the row order changes and a ▲ appears next to that header's label. Click the same header again: confirm the order reverses and the indicator becomes ▼.
2. Sort by 締切日 or 完了日 (a column where some rows are blank, e.g. rows not yet completed have no 完了日): confirm blank-value rows stay at the bottom in both ascending and descending order.
3. Set 依頼日（開始）and 依頼日（終了）to a narrow range: confirm only rows with `requestDate` in that range remain.
4. Set 受託状況 to 完了: confirm only completed rows remain. Combine with 依頼内容 set to a specific category: confirm the result is the AND of both (fewer or equal rows to either filter alone).
5. Type a partial name into 依頼者 or 担当者: confirm only matching rows remain.
6. Type a word into キーワード that appears in some row's 依頼詳細 or 備考: confirm only matching rows remain.
7. With one or more filters still active, click エクスポート: confirm the downloaded `.xlsx` contains exactly the rows currently visible on screen, in the same sorted order.
8. Clear all filters (blank every field, reset select to すべて): confirm the full list for the selected fiscal year reappears.

- [ ] **Step 10: Commit**

```bash
git add src/AssistantRequestPage.jsx
git commit -m "feat: wire sort, filter, and unified export into assistant request page"
```
