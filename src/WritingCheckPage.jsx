// src/WritingCheckPage.jsx
import { useState, useMemo, useRef } from 'react';
import { FileSearch, AlertTriangle, Download, RotateCcw } from 'lucide-react';
import { saveAs } from 'file-saver';
import { parseUnipaXlsx } from './writingCheck/parseUnipaXlsx.js';
import { parseSubmissionZip } from './writingCheck/parseSubmissionZip.js';
import { buildPayloads } from './writingCheck/anonymize.js';
import { runAnalysis } from './writingCheck/analyzeClient.js';
import { buildResultRows, sortRows } from './writingCheck/scoring.js';
import { buildWritingCheckWorkbook } from './writingCheck/exportXlsx.js';
import { MAX_BODY_LENGTH, USD_PER_MTOK, MODES, DEFAULT_MODE, visibleAxesOf } from './writingCheck/constants.js';
import WritingCheckUploader from './writingCheck/WritingCheckUploader';
import WritingCheckTable from './writingCheck/WritingCheckTable';
import WritingCheckDetailModal from './writingCheck/WritingCheckDetailModal';

export default function WritingCheckPage() {
  const [fileName, setFileName] = useState('');
  const [sourceRows, setSourceRows] = useState([]);
  const [modeKey, setModeKey] = useState(DEFAULT_MODE);
  const [courseContext, setCourseContext] = useState('');
  const [extraNames, setExtraNames] = useState('');
  const [customRubricText, setCustomRubricText] = useState('');
  const [analyses, setAnalyses] = useState([]);
  const [isLoadingFile, setIsLoadingFile] = useState(false);
  const [loadProgress, setLoadProgress] = useState({ done: 0, total: 0 });
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [error, setError] = useState(null);
  const [sortKey, setSortKey] = useState('studentId');
  const [sortDirection, setSortDirection] = useState('asc');
  // 既定では人間側の2軸だけを出す。残りの軸は読み解き文に出るので、開きたいときだけ開く。
  const [showAllAxes, setShowAllAxes] = useState(false);
  const [selectedRow, setSelectedRow] = useState(null);
  const [isExporting, setIsExporting] = useState(false);
  // 読み込んだファイルに既存のAI判定列があったか。無ければ関連する列と ⚑ を出さない。
  const [hasSourceVerdict, setHasSourceVerdict] = useState(false);

  // 中断は再レンダリングを挟まずワーカーから読む必要があるので ref で持つ。
  const stopRequested = useRef(false);
  // 解析後に一度だけ要確認度順へ並べ替えるための記録。毎回やると、
  // 教員が自分で選んだ並び順を実行のたびに奪ってしまう。
  const autoSorted = useRef(false);

  const SCORE_MAX = 3;

  // カスタムルーブリックから動的に mode を生成
  const buildCustomMode = (rubricText, baseMode) => {
    if (!rubricText.trim()) return baseMode;

    // 簡単なパース：【S】【A】【B】【C】の行数を数える
    const lines = rubricText.split('\n').filter((l) => l.trim());
    const itemCount = lines.filter((l) => l.match(/^【[SABC]】/)).length / 4;

    if (itemCount <= 0) return baseMode;

    const axes = [];
    for (let i = 0; i < Math.floor(itemCount); i++) {
      axes.push({
        key: `custom_${i}`,
        label: `評価項目 ${i + 1}`,
        short: `項目${i + 1}`,
        direction: null,
        description: '',
        primary: i < 2,
        lowPhrase: null,
        highPhrase: null,
        warnLow: null
      });
    }

    const weights = axes.slice(0, 2).map((ax, idx) => ({
      key: ax.key,
      weight: 0.5 / Math.max(2, axes.length),
      invert: false
    }));

    return {
      key: 'custom',
      label: 'ユーザー指定ルーブリック',
      source: baseMode.source,
      axes,
      weights
    };
  };

  const baseMode = MODES[modeKey];
  const mode = useMemo(() => {
    if (!customRubricText.trim()) return baseMode;
    return buildCustomMode(customRubricText, baseMode);
  }, [customRubricText, baseMode]);

  const extraNameList = useMemo(
    () => extraNames.split(/[,、]/).map((name) => name.trim()).filter(Boolean),
    [extraNames]
  );

  // 本文を取り出せなかった行（画像だけのPDFなど）は採点しない。
  // 空文字を送っても意味のないスコアが返るだけで、費用も無駄になる。
  const analyzableIndexes = useMemo(
    () => sourceRows.map((row, index) => (row.body ? index : null)).filter((i) => i != null),
    [sourceRows]
  );

  const payloads = useMemo(
    () => buildPayloads(sourceRows, extraNameList, MAX_BODY_LENGTH),
    [sourceRows, extraNameList]
  );

  const previewPayloads = useMemo(
    () => analyzableIndexes.map((index) => payloads[index]),
    [analyzableIndexes, payloads]
  );

  const resultRows = useMemo(() => buildResultRows(sourceRows, analyses, mode), [sourceRows, analyses, mode]);
  const visibleRows = useMemo(() => sortRows(resultRows, sortKey, sortDirection), [resultRows, sortKey, sortDirection]);

  const hasResults = analyses.some((a) => a?.status === 'ok');
  const failedCount = analyses.filter((a) => a?.status === 'error').length;
  const totalTokens = resultRows.reduce((sum, row) => sum + row.inputTokens, 0);
  const skippedRows = sourceRows.filter((row) => row.extractError);
  // トグルの文言に出す「いま畳んでいる列数」。軸の数はモードで変わる。
  const hiddenColumnCount =
    mode.axes.length - visibleAxesOf(mode, false).length + (hasSourceVerdict ? 2 : 0);
  const duplicateRows = sourceRows.filter((row) => row.duplicateOf?.length > 0);

  const handleFileChange = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const isZip = /\.zip$/i.test(file.name);
    const isXlsx = /\.xlsx$/i.test(file.name);
    if (!isZip && !isXlsx) {
      setError('.xlsx（感想文の一覧）または .zip（レポートの提出ファイル）を選んでください。');
      return;
    }

    setError(null);
    setAnalyses([]);
    setSelectedRow(null);
    autoSorted.current = false;
    // 軸はモードで入れ替わる。前のファイルの軸で並べたまま別種のファイルを読み込むと、
    // 存在しない列で並べ替えることになり、表が黙って未ソートになる。
    setSortKey('studentId');
    setSortDirection('asc');
    setIsLoadingFile(true);
    setLoadProgress({ done: 0, total: 0 });

    try {
      // ファイルの種類で評価軸が変わる。レポートに感想文用の軸を当てると、
      // 型どおりに書けている学生ほど「AI的」に出てしまうため自動で切り替える。
      const nextMode = isZip ? 'report' : 'reflection';
      const parsed = isZip
        ? await parseSubmissionZip(file, (done, total) => setLoadProgress({ done, total }))
        : await parseUnipaXlsx(file);
      const { rows } = parsed;

      if (rows.length === 0) {
        setError('提出データが1件も見つかりませんでした。');
        return;
      }
      if (!isZip && rows.every((row) => !row.body)) {
        setError('「提出内容」列が見つかりません。ファイル提出の課題であれば、zip のほうを読み込んでください。');
        return;
      }

      setModeKey(nextMode);
      setHasSourceVerdict(Boolean(parsed.hasSourceVerdict));
      setSourceRows(rows);
      setFileName(file.name);
    } catch (err) {
      console.error('Error parsing submissions:', err);
      setSourceRows([]);
      setFileName('');
      setError(err.message ?? 'ファイルの読み込みに失敗しました。');
    } finally {
      setIsLoadingFile(false);
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
          mode: modeKey,
          customRubricText: customRubricText.trim(),
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
      // 結果が出たら要確認度の高い順にする。学籍番号順のままだと、
      // 結局いつも手で並べ替えることになる。
      if (!autoSorted.current && results.some((result) => result?.status === 'ok')) {
        autoSorted.current = true;
        setSortKey('review');
        setSortDirection('desc');
      }
    } catch (err) {
      console.error('Error running writing check:', err);
      setError('解析の実行に失敗しました。');
    } finally {
      setIsRunning(false);
    }
  };

  const handleRun = () => analyze(analyzableIndexes);

  // 全件を投げる前の試し打ち。採点の傾向が想定と違えば、ここで止めて criteria を見直す。
  const handleRunOne = () => analyze(analyzableIndexes.slice(0, 1));

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

  // 詳細列を畳むとき、隠れる列で並べ替えていたら要確認度順へ戻す。
  // そのままだと、画面に無い列の順で並んでいて理由が分からなくなる。
  const handleToggleAxes = (next) => {
    setShowAllAxes(next);
    if (next) return;
    const visibleKeys = new Set([
      'studentId',
      'kanjiName',
      'review',
      ...visibleAxesOf(mode, false).map((axis) => axis.key)
    ]);
    if (!visibleKeys.has(sortKey)) {
      setSortKey('review');
      setSortDirection('desc');
    }
  };

  const handleExport = async () => {
    setError(null);
    setIsExporting(true);
    try {
      const buffer = await buildWritingCheckWorkbook(visibleRows, courseContext.trim(), mode, hasSourceVerdict);
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      saveAs(blob, `記述チェック結果_${fileName.replace(/\.(xlsx|zip)$/i, '')}.xlsx`);
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
            同じ課題の提出物は内容が似るのが当然であり、簡潔にまとめられた文章ほど不利に出ることがあります。
            必ず本文を読んだうえで判断してください。
            順位は<strong>読み込んだこのファイルの中だけ</strong>での比較です。別のクラスや別の課題を読み込めば
            同じ「1番目」でも意味が変わるため、書き出したファイル同士を突き合わせることはできません。
          </p>
        </div>

        {error && <p className="text-rose-600 text-sm bg-rose-50 p-2 rounded-md">{error}</p>}

        <WritingCheckUploader
          fileName={fileName}
          mode={mode}
          rows={sourceRows}
          analyzableCount={analyzableIndexes.length}
          skippedRows={skippedRows}
          duplicateRows={duplicateRows}
          payloads={previewPayloads}
          courseContext={courseContext}
          onCourseContextChange={setCourseContext}
          extraNames={extraNames}
          onExtraNamesChange={setExtraNames}
          customRubricText={customRubricText}
          onCustomRubricTextChange={setCustomRubricText}
          onFileChange={handleFileChange}
          onRun={handleRun}
          onRunOne={handleRunOne}
          onStop={handleStop}
          isLoadingFile={isLoadingFile}
          loadProgress={loadProgress}
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

            <div className="flex flex-wrap items-start justify-between gap-3">
              <p className="text-xs text-slate-500 flex-1 min-w-[20rem]">
                「要確認度」は<strong>この集団の中での順位</strong>です。1番目＝最も要確認度が高いというだけの並べ替え指標で、
                AI 利用の確率ではありません。各軸の見出しにある「↑人間らしい / ↑AI的」は、スコアが高いときの向きを示します。
                表に出していない軸（整いすぎ・無難すぎなど）は、該当するときだけ「読み解き」に文章で出ます。
                行をクリックすると本文と全軸の内訳が開きます。列見出しのクリックで並び替えできます。
                {hasSourceVerdict && ' ⚑ は元データの疑いスコアと順位が大きく食い違う行です。'}
              </p>
              {hiddenColumnCount > 0 && (
                <label className="flex items-center gap-2 text-xs text-slate-600 cursor-pointer shrink-0 select-none">
                  <input
                    type="checkbox"
                    checked={showAllAxes}
                    onChange={(event) => handleToggleAxes(event.target.checked)}
                    className="w-4 h-4 accent-cyan-700"
                  />
                  残りの {hiddenColumnCount} 列も表示する
                </label>
              )}
            </div>

            <div className="max-h-[70vh] min-h-[16rem] overflow-auto border border-slate-200 rounded-lg">
              <WritingCheckTable
                rows={visibleRows}
                mode={mode}
                hasSourceVerdict={hasSourceVerdict}
                showAllAxes={showAllAxes}
                sortKey={sortKey}
                sortDirection={sortDirection}
                onSort={handleSort}
                onRowClick={setSelectedRow}
              />
            </div>
          </div>
        )}
      </div>

      {selectedRow && (
        <WritingCheckDetailModal row={selectedRow} mode={mode} onClose={() => setSelectedRow(null)} />
      )}
    </div>
  );
}
