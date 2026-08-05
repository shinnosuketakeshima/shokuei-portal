// src/assistantRequests/AssigneeSummaryPanel.jsx
import { useMemo, useState } from 'react';
import {
  buildAssigneeSummary,
  fiscalMonthOptions,
  formatDailyAverage
} from './assigneeSummary.js';

/**
 * Sheet1 相当の担当者別集計表。
 * 縦方向: 名前 → 依頼合計 → 日割り依頼受託件数
 * 期間: 月単位 / 年度単位（4月〜3月）
 */
export default function AssigneeSummaryPanel({ requests, fiscalYear }) {
  const monthOptions = useMemo(() => fiscalMonthOptions(fiscalYear), [fiscalYear]);

  const defaultMonthKey = useMemo(() => {
    const now = new Date();
    const y = now.getFullYear();
    const m = now.getMonth() + 1;
    const match = monthOptions.find((o) => o.year === y && o.month === m);
    return match ? `${match.year}-${match.month}` : `${monthOptions[0].year}-${monthOptions[0].month}`;
  }, [monthOptions]);

  const [mode, setMode] = useState('fiscalYear'); // 'month' | 'fiscalYear'
  const [monthKey, setMonthKey] = useState(defaultMonthKey);

  // 年度タブが変わったら、可能なら当月キーを合わせる
  const effectiveMonthKey = monthOptions.some((o) => `${o.year}-${o.month}` === monthKey)
    ? monthKey
    : defaultMonthKey;

  const yearMonth = useMemo(() => {
    const [ys, ms] = effectiveMonthKey.split('-');
    return { year: Number(ys), month: Number(ms) };
  }, [effectiveMonthKey]);

  const summary = useMemo(
    () =>
      buildAssigneeSummary(requests, {
        mode,
        fiscalYear,
        yearMonth
      }),
    [requests, mode, fiscalYear, yearMonth]
  );

  const modeButtonClass = (active) =>
    `px-3 py-1.5 rounded-md text-sm font-bold transition-colors ${
      active ? 'bg-emerald-700 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
    }`;

  return (
    <section className="border border-slate-200 rounded-lg overflow-hidden">
      <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center gap-3 justify-between">
        <div>
          <h4 className="text-sm font-bold text-slate-800">担当者別・依頼受託件数</h4>
          <p className="text-xs text-slate-500 mt-0.5">
            日割り = 依頼合計 ÷ 週あたり勤務日数（中村3日・飯島2日・板倉4日・ほか常勤5日）
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex gap-1">
            <button type="button" className={modeButtonClass(mode === 'fiscalYear')} onClick={() => setMode('fiscalYear')}>
              年度単位
            </button>
            <button type="button" className={modeButtonClass(mode === 'month')} onClick={() => setMode('month')}>
              月単位
            </button>
          </div>
          {mode === 'month' && (
            <select
              value={effectiveMonthKey}
              onChange={(e) => setMonthKey(e.target.value)}
              className="px-2 py-1.5 border border-slate-300 rounded-md text-sm bg-white"
            >
              {monthOptions.map((o) => (
                <option key={`${o.year}-${o.month}`} value={`${o.year}-${o.month}`}>
                  {o.label}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      {summary.names.length === 0 ? (
        <p className="p-4 text-sm text-slate-500">この期間に担当者が設定された依頼はありません。</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm border-collapse">
            <thead>
              <tr className="bg-white">
                <th className="sticky left-0 z-10 bg-white px-3 py-2 text-left text-xs font-bold text-slate-500 border-b border-r border-slate-200 whitespace-nowrap">
                  {/* 行ラベル列 */}
                </th>
                {summary.names.map((name) => (
                  <th
                    key={name}
                    className="px-3 py-2 text-center text-xs font-bold text-slate-700 border-b border-slate-200 whitespace-nowrap"
                  >
                    {name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr className="odd:bg-white even:bg-slate-50/60">
                <th className="sticky left-0 z-10 bg-inherit px-3 py-2 text-left text-xs font-bold text-slate-600 border-r border-slate-200 whitespace-nowrap">
                  依頼合計
                </th>
                {summary.totals.map((total, i) => (
                  <td key={summary.names[i]} className="px-3 py-2 text-center tabular-nums text-slate-800 border-b border-slate-100">
                    {total}
                  </td>
                ))}
              </tr>
              <tr className="odd:bg-white even:bg-slate-50/60">
                <th className="sticky left-0 z-10 bg-inherit px-3 py-2 text-left text-xs font-bold text-slate-600 border-r border-slate-200 whitespace-nowrap">
                  日割り依頼受託件数
                </th>
                {summary.dailyAverages.map((avg, i) => (
                  <td key={summary.names[i]} className="px-3 py-2 text-center tabular-nums text-slate-800">
                    {formatDailyAverage(avg)}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
