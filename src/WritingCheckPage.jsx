// src/WritingCheckPage.jsx
import { useState, useMemo, useRef } from 'react';
import { FileSearch, AlertTriangle, Download, RotateCcw } from 'lucide-react';
import { saveAs } from 'file-saver';
import { parseUnipaXlsx } from './writingCheck/parseUnipaXlsx.js';
import { buildPayloads } from './writingCheck/anonymize.js';
import { runAnalysis } from './writingCheck/analyzeClient.js';
import { buildResultRows, sortRows } from './writingCheck/scoring.js';
import { buildWritingCheckWorkbook } from './writingCheck/exportXlsx.js';
import { MAX_BODY_LENGTH, USD_PER_MTOK } from './writingCheck/constants.js';
import WritingCheckUploader from './writingCheck/WritingCheckUploader';
import WritingCheckTable from './writingCheck/WritingCheckTable';
import WritingCheckDetailModal from './writingCheck/WritingCheckDetailModal';

export default function WritingCheckPage() {
  const [fileName, setFileName] = useState('');
  const [sourceRows, setSourceRows] = useState([]);
  const [courseContext, setCourseContext] = useState('');
  const [extraNames, setExtraNames] = useState('');
  const [analyses, setAnalyses] = useState([]);
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [error, setError] = useState(null);
  const [sortKey, setSortKey] = useState('studentId');
  const [sortDirection, setSortDirection] = useState('asc');
  const [selectedRow, setSelectedRow] = useState(null);
  const [isExporting, setIsExporting] = useState(false);

  // 中断は再レンダリングを挟まずワーカーから読む必要があるので ref で持つ。
  const stopRequested = useRef(false);

  const extraNameList = useMemo(
    () => extraNames.split(/[,、]/).map((name) => name.trim()).filter(Boolean),
    [extraNames]
  );

  const payloads = useMemo(
    () => buildPayloads(sourceRows, extraNameList, MAX_BODY_LENGTH),
    [sourceRows, extraNameList]
  );

  const resultRows = useMemo(() => buildResultRows(sourceRows, analyses), [sourceRows, analyses]);
  const visibleRows = useMemo(() => sortRows(resultRows, sortKey, sortDirection), [resultRows, sortKey, sortDirection]);

  const hasResults = analyses.some((a) => a?.status === 'ok');
  const failedCount = analyses.filter((a) => a?.status === 'error').length;
  const totalTokens = resultRows.reduce((sum, row) => sum + row.inputTokens, 0);

  const handleFileChange = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setError(null);
    // ドラッグ&ドロップでは何でも落とせてしまうので、ここで弾く。
    // ExcelJS はレガシーな .xls を読めない。
    if (!/\.xlsx$/i.test(file.name)) {
      setError('.xlsx ファイルを選んでください。（.xls や PDF は読み込めません）');
      return;
    }
    setAnalyses([]);
    setSelectedRow(null);
    try {
      const { rows } = await parseUnipaXlsx(file);
      if (rows.length === 0) {
        setError('提出データが1件も見つかりませんでした。');
        return;
      }
      setSourceRows(rows);
      setFileName(file.name);
    } catch (err) {
      console.error('Error parsing submission xlsx:', err);
      setSourceRows([]);
      setFileName('');
      setError(err.message ?? 'ファイルの読み込みに失敗しました。');
    }
  };

  // targets は「解析する行の添字」。全件実行と失敗分の再実行で同じ経路を通す。
  const analyze = async (targets) => {
    setError(null);
    setIsRunning(true);
    stopRequested.current = false;
    setProgress({ done: 0, total: targets.length });

    try {
      const results = await runAnalysis(
        targets.map((index) => payloads[index]),
        {
          courseContext: courseContext.trim(),
          onProgress: (done, total) => setProgress({ done, total }),
          shouldStop: () => stopRequested.current
        }
      );
      setAnalyses((prev) => {
        const next = [...prev];
        next.length = sourceRows.length;
        targets.forEach((rowIndex, i) => {
          if (results[i]) next[rowIndex] = results[i];
        });
        return next;
      });
    } catch (err) {
      console.error('Error running writing check:', err);
      setError('解析の実行に失敗しました。');
    } finally {
      setIsRunning(false);
    }
  };

  const handleRun = () => analyze(sourceRows.map((_, index) => index));

  // 全件を投げる前の試し打ち。採点の傾向が想定と違えば、ここで止めて criteria を見直す。
  const handleRunOne = () => analyze([0]);

  const handleStop = () => {
    stopRequested.current = true;
  };

  const handleRetryFailed = () => {
    const targets = analyses.reduce((acc, a, index) => {
      if (a?.status === 'error') acc.push(index);
      return acc;
    }, []);
    if (targets.length > 0) analyze(targets);
  };

  // 表のヘッダークリック用。同じ列なら方向をトグル、別の列なら昇順から。
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
      const buffer = await buildWritingCheckWorkbook(visibleRows, courseContext.trim());
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      saveAs(blob, `記述チェック結果_${fileName.replace(/\.xlsx$/i, '')}.xlsx`);
    } catch (err) {
      console.error('Error exporting writing check results:', err);
      setError('エクスポートに失敗しました。');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
      <div className="p-5 border-b border-slate-100 bg-cyan-800 flex items-center gap-2 text-white">
        <FileSearch className="w-5 h-5 text-cyan-200" />
        <h3 className="text-base font-bold">提出物 記述チェック</h3>
      </div>

      <div className="p-6 space-y-6">
        <div className="flex items-start gap-2 text-amber-900 bg-amber-50 border border-amber-300 rounded-md p-3">
          <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
          <p className="text-xs leading-relaxed">
            このスコアは文章の書き方の傾向を示す<strong>参考指標</strong>であり、AI 利用の有無を判定するものではありません。
            単独で不正の根拠としないでください。
            同じ授業の感想は内容が似るのが当然であり、事実を簡潔にまとめた文章は「自分の経験」が低く出ます。
            必ず本文を読んだうえで判断してください。
            順位は<strong>読み込んだこのファイルの中だけ</strong>での比較です。別のクラスや別の課題を読み込めば
            同じ「1番目」でも意味が変わるため、書き出したファイル同士を突き合わせることはできません。
          </p>
        </div>

        {error && <p className="text-rose-600 text-sm bg-rose-50 p-2 rounded-md">{error}</p>}

        <WritingCheckUploader
          fileName={fileName}
          rows={sourceRows}
          payloads={payloads}
          courseContext={courseContext}
          onCourseContextChange={setCourseContext}
          extraNames={extraNames}
          onExtraNamesChange={setExtraNames}
          onFileChange={handleFileChange}
          onRun={handleRun}
          onRunOne={handleRunOne}
          onStop={handleStop}
          isRunning={isRunning}
          progress={progress}
        />

        {hasResults && (
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-5">
              <div className="text-xs text-slate-500">
                入力 {totalTokens.toLocaleString()} トークン / 概算 ${(totalTokens / 1_000_000 * USD_PER_MTOK).toFixed(4)}
                {failedCount > 0 && <span className="ml-2 text-rose-600">失敗 {failedCount} 件</span>}
              </div>
              <div className="flex gap-2">
                {failedCount > 0 && (
                  <button
                    type="button"
                    onClick={handleRetryFailed}
                    disabled={isRunning}
                    className="flex items-center gap-2 bg-slate-100 text-slate-700 py-2 px-4 rounded-lg font-bold text-sm hover:bg-slate-200 disabled:opacity-50 transition-colors"
                  >
                    <RotateCcw className="w-4 h-4" />
                    失敗した {failedCount} 件を再実行
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleExport}
                  disabled={isExporting || isRunning}
                  className="flex items-center gap-2 bg-cyan-700 text-white py-2 px-4 rounded-lg font-bold text-sm hover:bg-cyan-800 disabled:opacity-50 transition-colors"
                >
                  <Download className="w-4 h-4" />
                  {isExporting ? '書き出し中...' : 'Excel に書き出す'}
                </button>
              </div>
            </div>

            <p className="text-xs text-slate-500">
              「要確認度」は<strong>この集団の中での順位</strong>です。1位＝最も要確認度が高いというだけの並べ替え指標で、
              AI 利用の確率ではありません。各軸の見出しにある「↑人間らしい / ↑AI的」は、スコアが高いときの向きを示します。
              行をクリックすると本文と内訳が開きます。列見出しのクリックで並び替えできます。
              ⚑ は元データの疑いスコアと順位が大きく食い違う行です。
            </p>

            <div className="max-h-[70vh] min-h-[16rem] overflow-auto border border-slate-200 rounded-lg">
              <WritingCheckTable
                rows={visibleRows}
                sortKey={sortKey}
                sortDirection={sortDirection}
                onSort={handleSort}
                onRowClick={setSelectedRow}
              />
            </div>
          </div>
        )}
      </div>

      {selectedRow && <WritingCheckDetailModal row={selectedRow} onClose={() => setSelectedRow(null)} />}
    </div>
  );
}
