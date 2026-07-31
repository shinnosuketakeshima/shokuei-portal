// src/assistantRequests/AssistantRequestTable.jsx
import { Trash2 } from 'lucide-react';
import { COLUMNS } from './constants.js';

const STATUS_STYLES = {
  '未対応': 'bg-slate-100 text-slate-600',
  '受託中': 'bg-amber-100 text-amber-800',
  '完了': 'bg-emerald-100 text-emerald-800'
};

export default function AssistantRequestTable({ requests, onRowClick, onDelete, sortKey, sortDirection, onSort, isFiltered }) {
  if (requests.length === 0) {
    return (
      <div className="p-8 text-center text-slate-500">
        {isFiltered ? '条件に一致する依頼はありません。' : 'この年度の依頼はまだありません。'}
      </div>
    );
  }

  return (
    <table className="w-full text-sm text-left">
      <thead className="bg-slate-100 text-slate-700 font-bold sticky top-0">
        <tr>
          {COLUMNS.map((col) => {
            const active = sortKey === col.key;
            return (
              <th
                key={col.key}
                onClick={() => onSort(col.key)}
                title={`クリックで「${col.label}」の昇順・降順を切り替え`}
                className={`px-3 py-3 border-b border-slate-200 cursor-pointer select-none hover:bg-slate-200 transition-colors ${col.nowrap ? 'whitespace-nowrap' : ''}`}
              >
                {col.label}
                {/* 未ソートの列にも薄い⇅を出し、クリックで並び替えできることを示す */}
                <span className={active ? 'text-blue-700' : 'text-slate-400'}>
                  {active ? (sortDirection === 'asc' ? ' ▲' : ' ▼') : ' ⇅'}
                </span>
              </th>
            );
          })}
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
