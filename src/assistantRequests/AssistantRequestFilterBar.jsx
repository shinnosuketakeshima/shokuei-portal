// src/assistantRequests/AssistantRequestFilterBar.jsx
import { Download } from 'lucide-react';
import { STATUSES, CATEGORIES } from './constants.js';

export default function AssistantRequestFilterBar({ filters, onFilterChange, onExport, isExporting, disabled = isExporting }) {
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
        <button onClick={onExport} disabled={disabled}
          className="flex items-center gap-2 bg-blue-800 text-white py-1.5 px-4 rounded-lg text-sm font-bold hover:bg-blue-900 disabled:opacity-50 transition-colors">
          <Download className="w-4 h-4" />
          {isExporting ? '生成中...' : 'エクスポート'}
        </button>
      </div>
    </div>
  );
}
