// src/writingCheck/WritingCheckTable.jsx
import { AlertCircle } from 'lucide-react';
import { SCORE_MAX } from './constants.js';

const format = (value) => (value == null ? '—' : value.toFixed(2));

// スコアの帯。数値だけだと差が読み取りにくいので、背景の濃さでも示す。
function ScoreCell({ entry }) {
  if (!entry) return <td className="px-3 py-2 text-slate-400">—</td>;
  const ratio = entry.score / SCORE_MAX;
  return (
    <td className="px-3 py-2 whitespace-nowrap">
      <span
        className="inline-block px-2 py-0.5 rounded-md font-medium text-slate-900"
        style={{ backgroundColor: `rgba(8, 145, 178, ${0.08 + ratio * 0.35})` }}
      >
        {format(entry.score)}
      </span>
      <span className="ml-1.5 text-xs text-slate-400" title="信頼度">
        {format(entry.confidence)}
      </span>
    </td>
  );
}

// 生の 0〜1 の値は基準が無くて読めないので、集団内の順位で示す。
// ただし「1位」とだけ書くと成績上位の意味に読めてしまうため、単独の数字にしない。
// 必ず「要確認」を冠して、1 が良い側ではないことを数字と同じ視線で読ませる。
function RankCell({ row }) {
  if (row.rank == null) return <td className="px-3 py-2 text-slate-400">—</td>;
  return (
    <td className="px-3 py-2 whitespace-nowrap">
      <span className="text-xs text-slate-500">要確認 </span>
      <span className="font-bold text-slate-900">{row.rank}/{row.cohortSize}</span>
      {row.rankBand && <div className="text-xs text-slate-500">{row.rankBand}</div>}
    </td>
  );
}

export default function WritingCheckTable({ rows, mode, hasSourceVerdict, sortKey, sortDirection, onSort, onRowClick }) {
  const axes = mode.axes;
  const columns = [
    { key: 'studentId', label: '学籍番号' },
    { key: 'kanjiName', label: '氏名' },
    { key: 'review', label: '要確認度（参考）', title: '「↑人間らしい」の軸が低く「↑AI的」の軸が高い文章ほど上位。AI 利用の確率ではありません' },
    // 軸のスコアは向きが自明でないので、見出しに「↑人間らしい / ↑AI的」を常時出す。
    ...axes.map((axis) => ({
      key: axis.key,
      label: axis.short,
      direction: axis.direction,
      title: `${axis.label}：${axis.description}`
    })),
    // 元データの判定列は、読み込んだファイルに入っていたときだけ出す。
    // ファイル提出（zip）の名簿にはこの列が無く、常に空欄になって場所を取るだけになる。
    ...(hasSourceVerdict
      ? [
          { key: 'sourceScore', label: '元データ 疑いスコア' },
          { key: 'sourceVerdict', label: '元データ 判定' }
        ]
      : [])
  ];

  return (
    <table className="w-full text-sm text-left">
      <thead className="bg-slate-100 text-slate-700 font-bold sticky top-0">
        <tr>
          {columns.map((col) => {
            const active = sortKey === col.key;
            return (
              <th
                key={col.key}
                onClick={() => onSort(col.key)}
                title={col.title ?? `クリックで「${col.label}」の昇順・降順を切り替え`}
                className="px-3 py-3 border-b border-slate-200 cursor-pointer select-none hover:bg-slate-200 transition-colors whitespace-nowrap align-bottom"
              >
                {col.label}
                {/* 未ソートの列にも薄い⇅を出し、クリックで並び替えできることを示す */}
                <span className={active ? 'text-cyan-700' : 'text-slate-400'}>
                  {active ? (sortDirection === 'asc' ? ' ▲' : ' ▼') : ' ⇅'}
                </span>
                {col.direction && (
                  <div className={`text-xs font-normal ${col.direction === 'AI的' ? 'text-rose-600' : 'text-emerald-700'}`}>
                    ↑{col.direction}
                  </div>
                )}
                {col.key === 'review' && <div className="text-xs font-normal text-slate-500">上位ほど要確認</div>}
              </th>
            );
          })}
          <th className="px-3 py-3 border-b border-slate-200 align-bottom">読み解き</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-slate-200 bg-white">
        {rows.map((row) => (
          <tr
            key={row.studentId || row.rowNumber}
            onClick={() => onRowClick(row)}
            className="hover:bg-slate-50 cursor-pointer transition-colors"
          >
            <td className="px-3 py-2 whitespace-nowrap">{row.studentId}</td>
            <td className="px-3 py-2 whitespace-nowrap font-medium text-slate-900">
              {row.kanjiName}
              {row.truncated && (
                <span
                  className="ml-1.5 text-xs text-amber-700 font-normal"
                  title="本文が長いため中間を省いて解析しています。スコアは本文全体に基づくものではありません。"
                >
                  （一部省略）
                </span>
              )}
              {hasSourceVerdict && row.divergent && (
                <span
                  className="ml-1.5 text-amber-600"
                  title="元データの疑いスコアと要確認度で、集団内の順位が大きく食い違っています。読んで確かめてください。"
                >
                  ⚑
                </span>
              )}
            </td>
            <RankCell row={row} />
            {axes.map((axis) => (
              <ScoreCell key={axis.key} entry={row.scores?.[axis.key]} />
            ))}
            {hasSourceVerdict && (
              <>
                <td className="px-3 py-2 whitespace-nowrap text-slate-500">{row.sourceScore || '—'}</td>
                <td className="px-3 py-2 whitespace-nowrap text-slate-500">{row.sourceVerdict || '—'}</td>
              </>
            )}
            <td className="px-3 py-2 min-w-[18rem] text-slate-600">
              {row.status === 'error' ? (
                <span className="flex items-center gap-1 text-rose-600">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  {row.error}
                </span>
              ) : (
                row.reading
              )}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
