// src/writingCheck/WritingCheckDetailModal.jsx
import { X } from 'lucide-react';
import { SCORE_MAX } from './constants.js';

export default function WritingCheckDetailModal({ row, mode, onClose }) {
  return (
    <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center p-4 z-50" onClick={onClose}>
      <div
        className="bg-white rounded-xl shadow-lg max-w-3xl w-full max-h-[85vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-5 border-b border-slate-100 bg-cyan-800 flex items-center justify-between text-white rounded-t-xl">
          <h3 className="text-base font-bold">
            {row.studentId} {row.kanjiName}
          </h3>
          <button onClick={onClose} className="p-1 hover:bg-cyan-700 rounded-md transition-colors" title="閉じる">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5 overflow-auto">
          <div className="bg-cyan-50 border border-cyan-200 rounded-lg p-4">
            <div className="flex items-baseline gap-2">
              <span className="text-xs font-bold text-cyan-900">要確認度（参考）</span>
              {row.rank != null ? (
                <span className="text-lg font-bold text-cyan-900">
                  {row.cohortSize}人中 要確認 {row.rank}番目
                  {row.rankBand && <span className="ml-2 text-sm font-normal">（{row.rankBand}）</span>}
                </span>
              ) : (
                <span className="text-sm text-slate-500">全件を解析すると順位が出ます</span>
              )}
            </div>
            {row.reading && <p className="mt-2 text-sm text-slate-800 leading-relaxed">{row.reading}</p>}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {mode.axes.map((axis) => {
              const entry = row.scores?.[axis.key];
              return (
                <div key={axis.key} className="bg-slate-50 border border-slate-200 rounded-lg p-3">
                  <p className="text-xs font-bold text-slate-700">
                    {axis.label}
                    {axis.direction && (
                      <span className={`ml-2 font-normal ${axis.direction === 'AI的' ? 'text-rose-600' : 'text-emerald-700'}`}>
                        ↑{axis.direction}
                      </span>
                    )}
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5">{axis.description}</p>
                  <p className="mt-2 text-lg font-bold text-cyan-800">
                    {entry ? `${entry.score.toFixed(2)} / ${SCORE_MAX}` : '—'}
                    {entry && (
                      <span className="ml-2 text-xs font-normal text-slate-500">信頼度 {entry.confidence.toFixed(2)}</span>
                    )}
                  </p>
                </div>
              );
            })}
          </div>

          {row.truncated && (
            <p className="text-xs text-amber-900 bg-amber-50 border border-amber-300 rounded-md p-3">
              本文が長いため、冒頭と末尾を残して中間を省いた状態で解析しています。
              スコアは本文全体に基づくものではありません。下に表示しているのは省略前の全文です。
            </p>
          )}

          <div>
            <p className="text-xs font-bold text-slate-700 mb-1.5">提出本文</p>
            <div className="text-sm text-slate-800 bg-white border border-slate-200 rounded-md p-4 whitespace-pre-wrap leading-relaxed">
              {row.body}
            </div>
          </div>

          {row.sourceVerdict && (
            <p className="text-xs text-slate-500">
              元データの判定: {row.sourceVerdict}（疑いスコア {row.sourceScore || '—'}）
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
