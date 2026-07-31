// src/assistantRequests/ExportPanel.jsx
import { useState } from 'react';
import { saveAs } from 'file-saver';
import { Download } from 'lucide-react';
import { STATUSES } from './constants.js';
import { buildAssistantRequestWorkbook } from './exportXlsx.js';
import { fiscalYearLabel } from './fiscalYear.js';

function emptyFilters() {
  return { startDate: '', endDate: '', status: '', assignee: '' };
}

export default function ExportPanel({ requests, fiscalYear }) {
  const [open, setOpen] = useState(false);
  const [filters, setFilters] = useState(emptyFilters());
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState(null);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFilters((prev) => ({ ...prev, [name]: value }));
  };

  const applyFilters = (rows) => rows.filter((r) => {
    if (filters.startDate && r.requestDate < filters.startDate) return false;
    if (filters.endDate && r.requestDate > filters.endDate) return false;
    if (filters.status && r.status !== filters.status) return false;
    if (filters.assignee && !(r.assignee ?? '').includes(filters.assignee)) return false;
    return true;
  });

  const handleExport = async () => {
    setError(null);
    setIsExporting(true);
    try {
      const filtered = applyFilters(requests);
      const buffer = await buildAssistantRequestWorkbook(filtered, fiscalYear);
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      saveAs(blob, `事務補佐依頼一覧_${fiscalYearLabel(fiscalYear)}.xlsx`);
      setOpen(false);
      setFilters(emptyFilters());
    } catch (err) {
      console.error('Error exporting assistant requests:', err);
      setError('エクスポートに失敗しました。');
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
      {error && <p className="text-rose-600 text-sm bg-rose-50 p-2 rounded-md">{error}</p>}
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
