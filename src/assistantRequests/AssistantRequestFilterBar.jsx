// src/assistantRequests/AssistantRequestFilterBar.jsx
import { Download } from 'lucide-react';
import { STATUSES, CATEGORIES, COLUMNS } from './constants.js';

export default function AssistantRequestFilterBar({
  filters,
  onFilterChange,
  sortKey,
  sortDirection,
  onSortChange,
  onExport,
  isExporting,
  disabled = isExporting
}) {
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
      {/*
        並び替えは一覧表のヘッダークリックでも切り替わるが、それだけだと
        「降順にもできる」ことが画面から分からないため、項目と昇順/降順を
        明示的に選べるプルダウンをここにも置いている（同じ state を共有）。
      */}
      <div className="flex flex-wrap items-end gap-3 pt-3 border-t border-slate-100">
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">並び替え</label>
          <select value={sortKey} onChange={(e) => onSortChange(e.target.value, sortDirection)}
            className="px-2 py-1.5 border border-slate-300 rounded-md text-sm bg-white">
            {COLUMNS.map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">順序</label>
          <select value={sortDirection} onChange={(e) => onSortChange(sortKey, e.target.value)}
            className="px-2 py-1.5 border border-slate-300 rounded-md text-sm bg-white">
            <option value="asc">昇順（古い順・小さい順）</option>
            <option value="desc">降順（新しい順・大きい順）</option>
          </select>
        </div>
        <button onClick={onExport} disabled={disabled}
          className="ml-auto flex items-center gap-2 bg-blue-800 text-white py-1.5 px-4 rounded-lg text-sm font-bold hover:bg-blue-900 disabled:opacity-50 transition-colors">
          <Download className="w-4 h-4" />
          {isExporting ? '生成中...' : 'エクスポート'}
        </button>
      </div>
    </div>
  );
}
