# 事務補佐依頼台帳 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the SharePoint/OneDrive-hosted "助手室への依頼" Excel workbook with an in-portal page backed by Firestore, so staff no longer depend on OneDrive connectivity to request work from the office assistants, and assistants can track/export requests directly from the portal.

**Architecture:** One new Firestore collection (`assistant_requests`, one document per request row) feeds a single new route (`/assistant-requests`) rendering a fiscal-year-tabbed table. New requests are added via a collapsible form; existing requests are edited by clicking a row to open a modal; an export panel builds a filtered `.xlsx` client-side via `exceljs`. The page is decomposed into small focused files under `src/assistantRequests/` (data helpers + subcomponents) orchestrated by one top-level `src/AssistantRequestPage.jsx`, following the same Firestore usage style as the existing `ConcurrentWorksList`/`ConcurrentWorkForm` code in `src/App.jsx` (plain `getDocs`/`addDoc`/`updateDoc`/`deleteDoc`, no `onSnapshot`, no auth).

**Tech Stack:** React 19 + Vite, `firebase` (Firestore modular SDK), `exceljs` + `file-saver` for the export, Tailwind CSS v4 utility classes, `lucide-react` icons. No new dependencies are added — all of these are already in `package.json`.

**Spec:** `docs/superpowers/specs/2026-07-31-assistant-request-log-design.md`

## Global Constraints

- No test framework (Jest/Vitest/etc.) is configured in this repo. Verification is manual: pure logic modules are checked with standalone `node --input-type=module -e` snippets (this repo's existing precedent is `test_docx.js` at the repo root); UI/Firestore-integrated pieces are checked by running `npm run dev` and exercising the feature in the browser.
- `package.json` has `"type": "module"` — every new `.js`/`.jsx` file is an ES module (`import`/`export`, never `require`).
- Firestore collection name is exactly `assistant_requests` (per spec).
- No authentication/authorization is introduced — this matches the rest of the app (open, internal-only, no login).
- Do not modify `firestore.rules` as part of this work.
- **There is no local Firebase emulator configured** (`firebase.json` has no `emulators` block). Any manual verification against Firestore hits the real production project `jumonji-shokuei-portal`. Any test documents created while manually verifying **must be deleted afterward** (via the app's own delete button or the Firebase console) — do not leave fake `assistant_requests` documents in production.
- Follow the existing visual language: `bg-blue-900` card headers, `slate-200` borders, `rounded-xl`/`rounded-lg` cards, the same input/label classes used throughout `src/App.jsx` and `src/PrinterForm.jsx`.
- Category options are fixed to exactly: `その他`, `座席表作成`, `座席表貼り出し`, `印刷(講義)`, `印刷(講義以外)`, `試験監督`. Status options are fixed to exactly: `未対応`, `受託中`, `完了`.

---

## File Structure Overview

```
src/
  assistantRequests/
    fiscalYear.js            (Task 1 — pure date/fiscal-year helpers)
    constants.js              (Task 2 — CATEGORIES / STATUSES / DEFAULT_STATUS)
    requestUtils.js            (Task 2 — pure: computeNextNo, buildNewRequestFields)
    exportXlsx.js              (Task 3 — pure/local: buildAssistantRequestWorkbook)
    firestoreHelpers.js         (Task 4 — Firestore CRUD wrappers)
    AssistantRequestForm.jsx    (Task 5 — new-request collapsible form)
    AssistantRequestTable.jsx   (Task 6 — list table + status badges + delete)
    AssistantRequestEditModal.jsx (Task 7 — edit-all-fields modal)
    ExportPanel.jsx             (Task 8 — filter UI + download trigger)
  AssistantRequestPage.jsx      (Task 9 — orchestrates all of the above)
  App.jsx                       (Task 9 — modified: route, dashboard card, sidebar link)
```

---

## Task 1: Fiscal-year date helpers

**Files:**
- Create: `src/assistantRequests/fiscalYear.js`

**Interfaces:**
- Produces: `dateStringToFiscalYear(dateString: string) => number`, `fiscalYearLabel(fiscalYear: number) => string`, `currentFiscalYear(now?: Date) => number`. Later tasks (`requestUtils.js`, `AssistantRequestPage.jsx`, `ExportPanel.jsx`) import all three by these exact names.

- [ ] **Step 1: Write the module**

```js
// src/assistantRequests/fiscalYear.js
const REIWA_EPOCH_YEAR = 2018; // calendar year - 2018 = 令和 year (令和1年 = 2019)

export function dateStringToFiscalYear(dateString) {
  const [yearStr, monthStr] = dateString.split('-');
  const year = Number(yearStr);
  const month = Number(monthStr);
  const fiscalStartYear = month >= 4 ? year : year - 1;
  return fiscalStartYear - REIWA_EPOCH_YEAR;
}

export function fiscalYearLabel(fiscalYear) {
  return `令和${fiscalYear}年度`;
}

export function currentFiscalYear(now = new Date()) {
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  return dateStringToFiscalYear(`${yyyy}-${mm}-${dd}`);
}
```

- [ ] **Step 2: Verify with a standalone script**

Run:

```bash
node --input-type=module -e "
import { dateStringToFiscalYear, fiscalYearLabel, currentFiscalYear } from './src/assistantRequests/fiscalYear.js';
console.log(dateStringToFiscalYear('2026-05-01')); // expect 8
console.log(dateStringToFiscalYear('2026-03-31')); // expect 7
console.log(dateStringToFiscalYear('2019-04-01')); // expect 1
console.log(dateStringToFiscalYear('2019-03-31')); // expect 0
console.log(fiscalYearLabel(8)); // expect 令和8年度
console.log(typeof currentFiscalYear()); // expect number
"
```

Expected output (in order): `8`, `7`, `1`, `0`, `令和8年度`, `number`.

- [ ] **Step 3: Commit**

```bash
git add src/assistantRequests/fiscalYear.js
git commit -m "feat: add fiscal-year date helpers for assistant request log"
```

---

## Task 2: Shared constants + pure request-field builder

**Files:**
- Create: `src/assistantRequests/constants.js`
- Create: `src/assistantRequests/requestUtils.js`

**Interfaces:**
- Consumes: `dateStringToFiscalYear` from `src/assistantRequests/fiscalYear.js` (Task 1).
- Produces: `CATEGORIES: string[]`, `STATUSES: string[]`, `DEFAULT_STATUS: string` from `constants.js`; `computeNextNo(existingRequests: {fiscalYear, no}[], fiscalYear: number) => number` and `buildNewRequestFields(formValues: {requestDate, requester, category, detail, deadline}, existingRequests) => object` from `requestUtils.js`. Task 4 (`firestoreHelpers.js`) and Tasks 5/7/8 (form/modal/export components) import these by these exact names.

- [ ] **Step 1: Write `constants.js`**

```js
// src/assistantRequests/constants.js
export const CATEGORIES = ['その他', '座席表作成', '座席表貼り出し', '印刷(講義)', '印刷(講義以外)', '試験監督'];
export const STATUSES = ['未対応', '受託中', '完了'];
export const DEFAULT_STATUS = '未対応';
```

- [ ] **Step 2: Write `requestUtils.js`**

```js
// src/assistantRequests/requestUtils.js
import { dateStringToFiscalYear } from './fiscalYear';
import { DEFAULT_STATUS } from './constants';

export function computeNextNo(existingRequests, fiscalYear) {
  const nosInYear = existingRequests
    .filter((r) => r.fiscalYear === fiscalYear)
    .map((r) => r.no);
  return nosInYear.length > 0 ? Math.max(...nosInYear) + 1 : 1;
}

export function buildNewRequestFields(formValues, existingRequests) {
  const fiscalYear = dateStringToFiscalYear(formValues.requestDate);
  const no = computeNextNo(existingRequests, fiscalYear);
  return {
    fiscalYear,
    no,
    requestDate: formValues.requestDate,
    requester: formValues.requester,
    category: formValues.category,
    detail: formValues.detail,
    deadline: formValues.deadline,
    status: DEFAULT_STATUS,
    assignee: '',
    completedDate: '',
    duration: '',
    notes: ''
  };
}
```

- [ ] **Step 3: Verify with a standalone script**

Run:

```bash
node --input-type=module -e "
import { computeNextNo, buildNewRequestFields } from './src/assistantRequests/requestUtils.js';
const existing = [
  { fiscalYear: 8, no: 1 },
  { fiscalYear: 8, no: 2 },
  { fiscalYear: 7, no: 5 }
];
console.log(computeNextNo(existing, 8)); // expect 3
console.log(computeNextNo(existing, 9)); // expect 1
console.log(JSON.stringify(buildNewRequestFields({
  requestDate: '2026-05-01',
  requester: '竹嶋',
  category: 'その他',
  detail: 'テスト依頼',
  deadline: '2026-05-10'
}, existing)));
"
```

Expected output: `3`, then `1`, then a JSON object with `\"fiscalYear\":8,\"no\":3,\"requestDate\":\"2026-05-01\",\"requester\":\"竹嶋\",\"category\":\"その他\",\"detail\":\"テスト依頼\",\"deadline\":\"2026-05-10\",\"status\":\"未対応\",\"assignee\":\"\",\"completedDate\":\"\",\"duration\":\"\",\"notes\":\"\"}`.

- [ ] **Step 4: Commit**

```bash
git add src/assistantRequests/constants.js src/assistantRequests/requestUtils.js
git commit -m "feat: add constants and pure request-field builder for assistant request log"
```

---

## Task 3: Export workbook builder

**Files:**
- Create: `src/assistantRequests/exportXlsx.js`

**Interfaces:**
- Consumes: `fiscalYearLabel` from `src/assistantRequests/fiscalYear.js` (Task 1).
- Produces: `buildAssistantRequestWorkbook(rows: object[], fiscalYear: number) => Promise<ArrayBuffer>`. Task 8 (`ExportPanel.jsx`) calls this by this exact name and wraps the result in a `Blob` for `file-saver`.

- [ ] **Step 1: Write the module**

```js
// src/assistantRequests/exportXlsx.js
import ExcelJS from 'exceljs';
import { fiscalYearLabel } from './fiscalYear';

const COLUMNS = [
  { header: 'No', key: 'no', width: 6 },
  { header: '依頼日', key: 'requestDate', width: 12 },
  { header: '依頼者', key: 'requester', width: 12 },
  { header: '依頼内容', key: 'category', width: 16 },
  { header: '依頼詳細', key: 'detail', width: 30 },
  { header: '締切日', key: 'deadline', width: 12 },
  { header: '受託状況', key: 'status', width: 10 },
  { header: '担当者', key: 'assignee', width: 12 },
  { header: '完了日', key: 'completedDate', width: 12 },
  { header: '所要時間', key: 'duration', width: 10 },
  { header: '備考', key: 'notes', width: 30 }
];

export async function buildAssistantRequestWorkbook(rows, fiscalYear) {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet(fiscalYearLabel(fiscalYear));
  sheet.columns = COLUMNS;
  sheet.getRow(1).font = { bold: true };
  rows.forEach((row) => {
    sheet.addRow({
      no: row.no,
      requestDate: row.requestDate,
      requester: row.requester,
      category: row.category,
      detail: row.detail,
      deadline: row.deadline,
      status: row.status,
      assignee: row.assignee,
      completedDate: row.completedDate,
      duration: row.duration,
      notes: row.notes
    });
  });
  return workbook.xlsx.writeBuffer();
}
```

- [ ] **Step 2: Verify with a standalone script (writes and reads back a temp file, no production data involved)**

Run:

```bash
node --input-type=module -e "
import { buildAssistantRequestWorkbook } from './src/assistantRequests/exportXlsx.js';
import { writeFile, unlink } from 'node:fs/promises';
import XLSX from 'xlsx';

const rows = [
  { no: 1, requestDate: '2026-04-02', requester: '竹嶋', category: 'その他', detail: 'テスト1', deadline: '2026-04-10', status: '完了', assignee: '鈴木', completedDate: '2026-04-09', duration: '10分', notes: '' }
];
const buffer = await buildAssistantRequestWorkbook(rows, 8);
await writeFile('scratch/verify-export.tmp.xlsx', Buffer.from(buffer));
const wb = XLSX.readFile('scratch/verify-export.tmp.xlsx');
console.log(wb.SheetNames); // expect [ '令和8年度' ]
const sheet = XLSX.utils.sheet_to_json(wb.Sheets['令和8年度']);
console.log(sheet.length); // expect 1
await unlink('scratch/verify-export.tmp.xlsx');
"
```

Expected output: `[ '令和8年度' ]` then `1`. The temp file is deleted by the script itself — confirm with `git status` that nothing new is left behind.

- [ ] **Step 3: Commit**

```bash
git add src/assistantRequests/exportXlsx.js
git commit -m "feat: add xlsx workbook builder for assistant request export"
```

---

## Task 4: Firestore data-access wrappers

**Files:**
- Create: `src/assistantRequests/firestoreHelpers.js`

**Interfaces:**
- Consumes: `db` from `src/firebase.js`; `buildNewRequestFields` from `src/assistantRequests/requestUtils.js` (Task 2).
- Produces: `fetchAllAssistantRequests() => Promise<object[]>` (each with `id`), `addAssistantRequest(formValues, existingRequests) => Promise<object>` (returns the new row including `id`), `updateAssistantRequest(id, fields) => Promise<void>`, `deleteAssistantRequest(id) => Promise<void>`. Task 9 (`AssistantRequestPage.jsx`) calls all four by these exact names.

- [ ] **Step 1: Write the module**

```js
// src/assistantRequests/firestoreHelpers.js
import { collection, addDoc, updateDoc, deleteDoc, doc, getDocs, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { buildNewRequestFields } from './requestUtils';

const COLLECTION_NAME = 'assistant_requests';

export async function fetchAllAssistantRequests() {
  const snapshot = await getDocs(collection(db, COLLECTION_NAME));
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function addAssistantRequest(formValues, existingRequests) {
  const fields = buildNewRequestFields(formValues, existingRequests);
  const docRef = await addDoc(collection(db, COLLECTION_NAME), {
    ...fields,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });
  return { id: docRef.id, ...fields };
}

export async function updateAssistantRequest(id, fields) {
  await updateDoc(doc(db, COLLECTION_NAME, id), {
    ...fields,
    updatedAt: serverTimestamp()
  });
}

export async function deleteAssistantRequest(id) {
  await deleteDoc(doc(db, COLLECTION_NAME, id));
}
```

- [ ] **Step 2: Verify it compiles and lints cleanly**

This module talks to the real production Firestore project (`jumonji-shokuei-portal`) — do not exercise it with a standalone script. Verify it only via lint at this stage; full functional verification happens in Task 9 through the running app.

Run: `npm run lint`
Expected: no errors reported for `src/assistantRequests/firestoreHelpers.js`.

- [ ] **Step 3: Commit**

```bash
git add src/assistantRequests/firestoreHelpers.js
git commit -m "feat: add Firestore CRUD wrappers for assistant request log"
```

---

## Task 5: New-request form component

**Files:**
- Create: `src/assistantRequests/AssistantRequestForm.jsx`

**Interfaces:**
- Consumes: `CATEGORIES` from `src/assistantRequests/constants.js` (Task 2).
- Produces: default export `AssistantRequestForm({ onSubmit: (formValues) => Promise<void> })`. `formValues` shape: `{ requestDate, requester, category, detail, deadline }` (all strings). Task 9 passes its `handleAdd` as `onSubmit`.

- [ ] **Step 1: Write the component**

```jsx
// src/assistantRequests/AssistantRequestForm.jsx
import { useState } from 'react';
import { FileEdit } from 'lucide-react';
import { CATEGORIES } from './constants';

function todayString() {
  const now = new Date();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  return `${now.getFullYear()}-${mm}-${dd}`;
}

function emptyForm() {
  return {
    requestDate: todayString(),
    requester: '',
    category: CATEGORIES[0],
    detail: '',
    deadline: ''
  };
}

export default function AssistantRequestForm({ onSubmit }) {
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState(emptyForm);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await onSubmit(formData);
      setFormData(emptyForm());
      setOpen(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="w-full bg-white border border-dashed border-blue-300 text-blue-700 rounded-lg py-3 px-4 font-bold hover:bg-blue-50 transition-colors flex items-center justify-center gap-2"
      >
        <FileEdit className="w-4 h-4" />
        ＋ 新規依頼を追加
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white p-5 rounded-lg border border-slate-200 shadow-sm space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1.5">依頼日</label>
          <input type="date" name="requestDate" value={formData.requestDate} onChange={handleChange} required
            className="w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm sm:text-sm" />
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1.5">依頼者</label>
          <input type="text" name="requester" value={formData.requester} onChange={handleChange} required
            className="w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm sm:text-sm" />
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1.5">依頼内容</label>
          <select name="category" value={formData.category} onChange={handleChange}
            className="w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm sm:text-sm bg-white">
            {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1.5">締切日</label>
          <input type="date" name="deadline" value={formData.deadline} onChange={handleChange} required
            className="w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm sm:text-sm" />
        </div>
        <div className="md:col-span-2">
          <label className="block text-xs font-bold text-slate-700 mb-1.5">依頼詳細</label>
          <textarea name="detail" value={formData.detail} onChange={handleChange} rows={3} required
            className="w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm sm:text-sm resize-none" />
        </div>
      </div>
      <div className="flex gap-3">
        <button type="submit" disabled={isSubmitting}
          className="bg-blue-800 text-white py-2 px-4 rounded-lg font-bold hover:bg-blue-900 disabled:opacity-50 transition-colors">
          {isSubmitting ? '送信中...' : '登録する'}
        </button>
        <button type="button" onClick={() => setOpen(false)}
          className="py-2 px-4 rounded-lg font-bold text-slate-500 hover:bg-slate-100 transition-colors">
          キャンセル
        </button>
      </div>
    </form>
  );
}
```

- [ ] **Step 2: Verify it compiles and lints cleanly**

Run: `npm run lint`
Expected: no errors reported for `src/assistantRequests/AssistantRequestForm.jsx`. (Interactive verification happens in Task 9, once this is wired into a page that can actually call `onSubmit`.)

- [ ] **Step 3: Commit**

```bash
git add src/assistantRequests/AssistantRequestForm.jsx
git commit -m "feat: add new-request form component for assistant request log"
```

---

## Task 6: Request list table component

**Files:**
- Create: `src/assistantRequests/AssistantRequestTable.jsx`

**Interfaces:**
- Produces: default export `AssistantRequestTable({ requests: object[], onRowClick: (request) => void, onDelete: (id: string, no: number) => void })`. Task 9 passes its state array and handlers.

- [ ] **Step 1: Write the component**

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
      <tbody className="divide-y divide-slate-200 bg-white">
        {requests.map((r) => (
          <tr key={r.id} className="hover:bg-slate-50 cursor-pointer transition-colors" onClick={() => onRowClick(r)}>
            <td className="px-3 py-2 whitespace-nowrap">{r.no}</td>
            <td className="px-3 py-2 whitespace-nowrap">{r.requestDate}</td>
            <td className="px-3 py-2 whitespace-nowrap font-medium text-slate-900">{r.requester}</td>
            <td className="px-3 py-2 whitespace-nowrap">{r.category}</td>
            <td className="px-3 py-2 max-w-xs truncate">{r.detail}</td>
            <td className="px-3 py-2 whitespace-nowrap">{r.deadline}</td>
            <td className="px-3 py-2 whitespace-nowrap">
              <span className={`px-2 py-1 text-xs font-bold rounded-md ${STATUS_STYLES[r.status] ?? STATUS_STYLES['未対応']}`}>{r.status}</span>
            </td>
            <td className="px-3 py-2 whitespace-nowrap">{r.assignee}</td>
            <td className="px-3 py-2 whitespace-nowrap">{r.completedDate}</td>
            <td className="px-3 py-2 whitespace-nowrap">{r.duration}</td>
            <td className="px-3 py-2 max-w-xs truncate">{r.notes}</td>
            <td className="px-3 py-2">
              <button
                onClick={(e) => { e.stopPropagation(); onDelete(r.id, r.no); }}
                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors"
                title="削除"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
```

- [ ] **Step 2: Verify it compiles and lints cleanly**

Run: `npm run lint`
Expected: no errors reported for `src/assistantRequests/AssistantRequestTable.jsx`.

- [ ] **Step 3: Commit**

```bash
git add src/assistantRequests/AssistantRequestTable.jsx
git commit -m "feat: add request list table component for assistant request log"
```

---

## Task 7: Edit modal component

**Files:**
- Create: `src/assistantRequests/AssistantRequestEditModal.jsx`

**Interfaces:**
- Consumes: `CATEGORIES`, `STATUSES` from `src/assistantRequests/constants.js` (Task 2).
- Produces: default export `AssistantRequestEditModal({ request: object, onSave: (fields) => Promise<void>, onClose: () => void })`. `request` must include `no`, `requestDate`, `requester`, `category`, `detail`, `deadline`, `status`, `assignee`, `completedDate`, `duration`, `notes`. Task 9 renders this conditionally and passes its `handleSaveEdit` as `onSave`.

- [ ] **Step 1: Write the component**

```jsx
// src/assistantRequests/AssistantRequestEditModal.jsx
import { useState } from 'react';
import { CATEGORIES, STATUSES } from './constants';

export default function AssistantRequestEditModal({ request, onSave, onClose }) {
  const [formData, setFormData] = useState({
    requestDate: request.requestDate,
    requester: request.requester,
    category: request.category,
    detail: request.detail,
    deadline: request.deadline,
    status: request.status,
    assignee: request.assignee,
    completedDate: request.completedDate,
    duration: request.duration,
    notes: request.notes
  });
  const [isSaving, setIsSaving] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave(formData);
      onClose();
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-lg font-bold text-slate-800 mb-4">依頼 No.{request.no} を編集</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">依頼日</label>
            <input type="date" name="requestDate" value={formData.requestDate} onChange={handleChange}
              className="w-full px-3 py-2 border border-slate-300 rounded-md sm:text-sm" />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">依頼者</label>
            <input type="text" name="requester" value={formData.requester} onChange={handleChange}
              className="w-full px-3 py-2 border border-slate-300 rounded-md sm:text-sm" />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">依頼内容</label>
            <select name="category" value={formData.category} onChange={handleChange}
              className="w-full px-3 py-2 border border-slate-300 rounded-md sm:text-sm bg-white">
              {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">締切日</label>
            <input type="date" name="deadline" value={formData.deadline} onChange={handleChange}
              className="w-full px-3 py-2 border border-slate-300 rounded-md sm:text-sm" />
          </div>
          <div className="md:col-span-2">
            <label className="block text-xs font-bold text-slate-700 mb-1.5">依頼詳細</label>
            <textarea name="detail" value={formData.detail} onChange={handleChange} rows={2}
              className="w-full px-3 py-2 border border-slate-300 rounded-md sm:text-sm resize-none" />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">受託状況</label>
            <select name="status" value={formData.status} onChange={handleChange}
              className="w-full px-3 py-2 border border-slate-300 rounded-md sm:text-sm bg-white">
              {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">担当者</label>
            <input type="text" name="assignee" value={formData.assignee} onChange={handleChange}
              className="w-full px-3 py-2 border border-slate-300 rounded-md sm:text-sm" />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">完了日</label>
            <input type="date" name="completedDate" value={formData.completedDate} onChange={handleChange}
              className="w-full px-3 py-2 border border-slate-300 rounded-md sm:text-sm" />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">所要時間</label>
            <input type="text" name="duration" value={formData.duration} onChange={handleChange} placeholder="例: 20分"
              className="w-full px-3 py-2 border border-slate-300 rounded-md sm:text-sm" />
          </div>
          <div className="md:col-span-2">
            <label className="block text-xs font-bold text-slate-700 mb-1.5">備考</label>
            <textarea name="notes" value={formData.notes} onChange={handleChange} rows={2}
              className="w-full px-3 py-2 border border-slate-300 rounded-md sm:text-sm resize-none" />
          </div>
        </div>
        <div className="flex gap-3 mt-6">
          <button onClick={handleSave} disabled={isSaving}
            className="bg-blue-800 text-white py-2 px-4 rounded-lg font-bold hover:bg-blue-900 disabled:opacity-50 transition-colors">
            {isSaving ? '保存中...' : '保存する'}
          </button>
          <button onClick={onClose} className="py-2 px-4 rounded-lg font-bold text-slate-500 hover:bg-slate-100 transition-colors">
            キャンセル
          </button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify it compiles and lints cleanly**

Run: `npm run lint`
Expected: no errors reported for `src/assistantRequests/AssistantRequestEditModal.jsx`.

- [ ] **Step 3: Commit**

```bash
git add src/assistantRequests/AssistantRequestEditModal.jsx
git commit -m "feat: add edit modal component for assistant request log"
```

---

## Task 8: Export panel component

**Files:**
- Create: `src/assistantRequests/ExportPanel.jsx`

**Interfaces:**
- Consumes: `STATUSES` from `src/assistantRequests/constants.js` (Task 2); `buildAssistantRequestWorkbook` from `src/assistantRequests/exportXlsx.js` (Task 3); `fiscalYearLabel` from `src/assistantRequests/fiscalYear.js` (Task 1).
- Produces: default export `ExportPanel({ requests: object[], fiscalYear: number })` — `requests` must already be pre-filtered to the currently selected fiscal year by the caller.

- [ ] **Step 1: Write the component**

```jsx
// src/assistantRequests/ExportPanel.jsx
import { useState } from 'react';
import { saveAs } from 'file-saver';
import { Download } from 'lucide-react';
import { STATUSES } from './constants';
import { buildAssistantRequestWorkbook } from './exportXlsx';
import { fiscalYearLabel } from './fiscalYear';

function emptyFilters() {
  return { startDate: '', endDate: '', status: '', assignee: '' };
}

export default function ExportPanel({ requests, fiscalYear }) {
  const [open, setOpen] = useState(false);
  const [filters, setFilters] = useState(emptyFilters);
  const [isExporting, setIsExporting] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFilters((prev) => ({ ...prev, [name]: value }));
  };

  const applyFilters = (rows) => rows.filter((r) => {
    if (filters.startDate && r.requestDate < filters.startDate) return false;
    if (filters.endDate && r.requestDate > filters.endDate) return false;
    if (filters.status && r.status !== filters.status) return false;
    if (filters.assignee && !r.assignee.includes(filters.assignee)) return false;
    return true;
  });

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const filtered = applyFilters(requests);
      const buffer = await buildAssistantRequestWorkbook(filtered, fiscalYear);
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      saveAs(blob, `事務補佐依頼一覧_${fiscalYearLabel(fiscalYear)}.xlsx`);
      setOpen(false);
      setFilters(emptyFilters());
    } finally {
      setIsExporting(false);
    }
  };

  if (!open) {
    return (
      <button onClick={() => setOpen(true)}
        className="flex items-center gap-2 px-4 py-2 border border-slate-300 rounded-lg text-sm font-bold text-slate-700 hover:bg-slate-50 transition-colors">
        <Download className="w-4 h-4" />
        エクスポート
      </button>
    );
  }

  return (
    <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm space-y-3">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">依頼日（開始）</label>
          <input type="date" name="startDate" value={filters.startDate} onChange={handleChange}
            className="w-full px-2 py-1.5 border border-slate-300 rounded-md text-sm" />
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">依頼日（終了）</label>
          <input type="date" name="endDate" value={filters.endDate} onChange={handleChange}
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
          <label className="block text-xs font-bold text-slate-700 mb-1">担当者</label>
          <input type="text" name="assignee" value={filters.assignee} onChange={handleChange}
            className="w-full px-2 py-1.5 border border-slate-300 rounded-md text-sm" />
        </div>
      </div>
      <div className="flex gap-3">
        <button onClick={handleExport} disabled={isExporting}
          className="bg-blue-800 text-white py-1.5 px-4 rounded-lg text-sm font-bold hover:bg-blue-900 disabled:opacity-50 transition-colors">
          {isExporting ? '生成中...' : 'ダウンロード'}
        </button>
        <button onClick={() => setOpen(false)} className="py-1.5 px-4 rounded-lg text-sm font-bold text-slate-500 hover:bg-slate-100 transition-colors">
          キャンセル
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify it compiles and lints cleanly**

Run: `npm run lint`
Expected: no errors reported for `src/assistantRequests/ExportPanel.jsx`.

- [ ] **Step 3: Commit**

```bash
git add src/assistantRequests/ExportPanel.jsx
git commit -m "feat: add export panel component for assistant request log"
```

---

## Task 9: Wire the page together and integrate into the app

**Files:**
- Create: `src/AssistantRequestPage.jsx`
- Modify: `src/App.jsx` (import, sidebar link, dashboard card, route)

**Interfaces:**
- Consumes: `fetchAllAssistantRequests`, `addAssistantRequest`, `updateAssistantRequest`, `deleteAssistantRequest` (Task 4); `currentFiscalYear`, `fiscalYearLabel` (Task 1); `AssistantRequestForm` (Task 5); `AssistantRequestTable` (Task 6); `AssistantRequestEditModal` (Task 7); `ExportPanel` (Task 8).
- Produces: default export `AssistantRequestPage()` — a self-contained page component with no required props, mounted at route `/assistant-requests`.

- [ ] **Step 1: Write `src/AssistantRequestPage.jsx`**

```jsx
// src/AssistantRequestPage.jsx
import { useState, useEffect, useMemo } from 'react';
import { FolderKanban } from 'lucide-react';
import {
  fetchAllAssistantRequests,
  addAssistantRequest,
  updateAssistantRequest,
  deleteAssistantRequest
} from './assistantRequests/firestoreHelpers';
import { currentFiscalYear, fiscalYearLabel } from './assistantRequests/fiscalYear';
import AssistantRequestForm from './assistantRequests/AssistantRequestForm';
import AssistantRequestTable from './assistantRequests/AssistantRequestTable';
import AssistantRequestEditModal from './assistantRequests/AssistantRequestEditModal';
import ExportPanel from './assistantRequests/ExportPanel';

export default function AssistantRequestPage() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedFiscalYear, setSelectedFiscalYear] = useState(currentFiscalYear());
  const [editingRequest, setEditingRequest] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchAllAssistantRequests()
      .then((data) => { if (!cancelled) setRequests(data); })
      .catch((err) => {
        console.error('Error fetching assistant requests:', err);
        if (!cancelled) setError('依頼一覧の読み込みに失敗しました。');
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const availableFiscalYears = useMemo(() => {
    const years = new Set(requests.map((r) => r.fiscalYear));
    years.add(currentFiscalYear());
    return [...years].sort((a, b) => b - a);
  }, [requests]);

  const visibleRequests = useMemo(
    () => requests.filter((r) => r.fiscalYear === selectedFiscalYear).sort((a, b) => a.no - b.no),
    [requests, selectedFiscalYear]
  );

  const handleAdd = async (formValues) => {
    try {
      const newRequest = await addAssistantRequest(formValues, requests);
      setRequests((prev) => [...prev, newRequest]);
      setSelectedFiscalYear(newRequest.fiscalYear);
    } catch (err) {
      console.error('Error adding assistant request:', err);
      setError('依頼の登録に失敗しました。');
    }
  };

  const handleSaveEdit = async (fields) => {
    try {
      await updateAssistantRequest(editingRequest.id, fields);
      setRequests((prev) => prev.map((r) => (r.id === editingRequest.id ? { ...r, ...fields } : r)));
    } catch (err) {
      console.error('Error updating assistant request:', err);
      setError('依頼の更新に失敗しました。');
    }
  };

  const handleDelete = async (id, no) => {
    if (!window.confirm(`No.${no} の依頼を削除します。よろしいですか？`)) return;
    try {
      await deleteAssistantRequest(id);
      setRequests((prev) => prev.filter((r) => r.id !== id));
    } catch (err) {
      console.error('Error deleting assistant request:', err);
      alert('削除に失敗しました。');
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
      <div className="p-5 border-b border-slate-100 bg-blue-900 flex items-center gap-2 text-white">
        <FolderKanban className="w-5 h-5 text-blue-200" />
        <h3 className="text-base font-bold">事務補佐依頼一覧</h3>
      </div>
      <div className="p-6 space-y-6">
        {error && <p className="text-rose-600 text-sm bg-rose-50 p-2 rounded-md">{error}</p>}

        <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-3">
          {availableFiscalYears.map((fy) => (
            <button
              key={fy}
              onClick={() => setSelectedFiscalYear(fy)}
              className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors ${
                fy === selectedFiscalYear ? 'bg-blue-800 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {fiscalYearLabel(fy)}
            </button>
          ))}
        </div>

        <AssistantRequestForm onSubmit={handleAdd} />

        <ExportPanel requests={visibleRequests} fiscalYear={selectedFiscalYear} />

        {loading ? (
          <div className="p-8 text-center text-slate-500">読み込み中...</div>
        ) : (
          <div className="overflow-x-auto border border-slate-200 rounded-lg">
            <AssistantRequestTable requests={visibleRequests} onRowClick={setEditingRequest} onDelete={handleDelete} />
          </div>
        )}
      </div>

      {editingRequest && (
        <AssistantRequestEditModal
          request={editingRequest}
          onSave={handleSaveEdit}
          onClose={() => setEditingRequest(null)}
        />
      )}
    </div>
  );
}
```

- [ ] **Step 2: Add the import to `src/App.jsx`**

Find this line near the top of `src/App.jsx`:

```jsx
import PrinterForm from './PrinterForm';
```

Replace it with:

```jsx
import PrinterForm from './PrinterForm';
import AssistantRequestPage from './AssistantRequestPage';
```

- [ ] **Step 3: Add the sidebar link**

Find this block inside `Sidebar()` in `src/App.jsx`:

```jsx
        <Link to="/general-list" className="flex items-center gap-3 px-4 py-3 text-blue-100 rounded-lg font-medium transition-colors hover:bg-blue-800/50 hover:text-white">
          <FolderKanban className="w-5 h-5 text-blue-300" />
          兼業一覧
        </Link>
      </nav>
```

Replace it with:

```jsx
        <Link to="/general-list" className="flex items-center gap-3 px-4 py-3 text-blue-100 rounded-lg font-medium transition-colors hover:bg-blue-800/50 hover:text-white">
          <FolderKanban className="w-5 h-5 text-blue-300" />
          兼業一覧
        </Link>
        <Link to="/assistant-requests" className="flex items-center gap-3 px-4 py-3 text-blue-100 rounded-lg font-medium transition-colors hover:bg-blue-800/50 hover:text-white">
          <FolderKanban className="w-5 h-5 text-blue-300" />
          事務補佐依頼一覧
        </Link>
      </nav>
```

- [ ] **Step 4: Replace the dashboard card**

Find this block inside `Dashboard()` in `src/App.jsx` (the `助手室への依頼（Excel）` card):

```jsx
        {/* 助手室への依頼（Excel） */}
        <a href="https://jumonjiuac-my.sharepoint.com/:x:/g/personal/takesima_jumonji-u_ac_jp/EepA_hVf391MqrXW52mLjlABtqVZccddpHT6IVgDjVgOdQ?e=IgKTDz" target="_blank" rel="noopener noreferrer" className="group bg-white p-5 rounded-xl border border-slate-200 shadow-sm hover:shadow-lg hover:border-emerald-400 hover:-translate-y-1 hover:bg-emerald-50/50 transition-all duration-200 flex items-center gap-4 text-left">
          <div className="w-12 h-12 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-600 group-hover:scale-110 group-hover:bg-emerald-100 transition-all duration-200 shrink-0">
            <ClipboardList className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-800 group-hover:text-emerald-700 transition-colors">助手室への依頼（Excel）</h3>
            <p className="text-xs text-rose-600 font-bold mt-1">※発注は1週間前まで</p>
          </div>
        </a>
```

Replace it with (this component is inside `Dashboard()`, which already declares `const navigate = useNavigate();` at its top, so `navigate` is in scope):

```jsx
        {/* 事務補佐依頼一覧 */}
        <button onClick={() => navigate('/assistant-requests')} className="group bg-white p-5 rounded-xl border border-slate-200 shadow-sm hover:shadow-lg hover:border-emerald-400 hover:-translate-y-1 hover:bg-emerald-50/50 transition-all duration-200 flex items-center gap-4 text-left">
          <div className="w-12 h-12 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-600 group-hover:scale-110 group-hover:bg-emerald-100 transition-all duration-200 shrink-0">
            <ClipboardList className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-800 group-hover:text-emerald-700 transition-colors">事務補佐依頼一覧</h3>
            <p className="text-xs text-slate-500 mt-1">助手室への依頼をポータル上で登録・確認</p>
          </div>
        </button>
```

- [ ] **Step 5: Add the route**

Find this block in the `<Routes>` section of `src/App.jsx`:

```jsx
              <Route path="/application-printer" element={
                <div className="p-8 max-w-2xl mx-auto">
                  <div className="mb-6 flex items-center justify-between">
                    <h2 className="text-2xl font-bold text-blue-900">大型カラープリンター申請</h2>
                    <Link to="/" className="text-sm text-violet-600 hover:text-violet-800 font-medium">← ダッシュボードへ戻る</Link>
                  </div>
                  <div className="h-auto min-h-[500px]">
                    <PrinterForm />
                  </div>
                </div>
              } />
            </Routes>
```

Replace it with:

```jsx
              <Route path="/application-printer" element={
                <div className="p-8 max-w-2xl mx-auto">
                  <div className="mb-6 flex items-center justify-between">
                    <h2 className="text-2xl font-bold text-blue-900">大型カラープリンター申請</h2>
                    <Link to="/" className="text-sm text-violet-600 hover:text-violet-800 font-medium">← ダッシュボードへ戻る</Link>
                  </div>
                  <div className="h-auto min-h-[500px]">
                    <PrinterForm />
                  </div>
                </div>
              } />
              <Route path="/assistant-requests" element={
                <div className="p-8 max-w-6xl mx-auto h-full flex flex-col">
                  <div className="mb-6 flex items-center justify-between">
                    <h2 className="text-2xl font-bold text-blue-900">事務補佐依頼一覧</h2>
                    <Link to="/" className="text-sm text-blue-600 hover:text-blue-800 font-medium">← ダッシュボードへ戻る</Link>
                  </div>
                  <div className="flex-1 min-h-0">
                    <AssistantRequestPage />
                  </div>
                </div>
              } />
            </Routes>
```

- [ ] **Step 6: Lint and build**

Run: `npm run lint`
Expected: no errors.

Run: `npm run build`
Expected: build succeeds with no errors.

- [ ] **Step 7: Manual end-to-end verification**

Run: `npm run dev`, then open the printed local URL in a browser.

Verification hits the **real production Firestore project** (`jumonji-shokuei-portal`) — delete any test documents created below afterward, either with the in-app delete button or via the Firebase console.

1. From `/`, confirm the "事務補佐依頼一覧" dashboard card and the sidebar link both navigate to `/assistant-requests`.
2. On `/assistant-requests`, confirm a tab for the current fiscal year (令和8年度) is shown and selected by default, and the table shows "この年度の依頼はまだありません。" if empty.
3. Click "＋ 新規依頼を追加", fill in all fields, submit. Confirm the new row appears in the table with `No: 1` and a gray "未対応" badge.
4. Add a second request with a different category. Confirm it appears with `No: 2`.
5. Click the first row to open the edit modal. Change 受託状況 to 完了, fill in 担当者/完了日/所要時間/備考, save. Confirm the modal closes and the table shows the updated values with a green "完了" badge, without a full page reload.
6. Click エクスポート, leave all filters blank, click ダウンロード. Confirm an `.xlsx` file named `事務補佐依頼一覧_令和8年度.xlsx` downloads, and opening it shows both rows with the correct columns and a sheet named `令和8年度`.
7. Click エクスポート again, set 受託状況 to 未対応, download, and confirm the resulting file contains only the second (未対応) row.
8. Click the delete button on one row, confirm the `window.confirm` dialog appears, confirm deletion removes it from the table (and the other row's `No` is unchanged).
9. Open the Firebase console for the `jumonji-shokuei-portal` project, Firestore, `assistant_requests` collection, and confirm the remaining document has the expected field names/types (`fiscalYear` as a number, `no` as a number, etc).
10. Delete the remaining test document (via the in-app delete button) so no test data is left in production.

- [ ] **Step 8: Commit**

```bash
git add src/AssistantRequestPage.jsx src/App.jsx
git commit -m "feat: add in-portal assistant request log page and wire it into navigation"
```
