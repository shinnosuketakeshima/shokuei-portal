// src/writingCheck/WritingCheckUploader.jsx
import { useState, useRef } from 'react';
import { Upload, Eye, EyeOff, Play, Info, FlaskConical, Square } from 'lucide-react';

export default function WritingCheckUploader({
  fileName,
  mode,
  rows,
  analyzableCount,
  skippedRows,
  duplicateRows,
  isLoadingFile,
  loadProgress,
  payloads,
  courseContext,
  onCourseContextChange,
  extraNames,
  onExtraNamesChange,
  customRubricText,
  onCustomRubricTextChange,
  onFileChange,
  onRun,
  onRunOne,
  onStop,
  isRunning,
  progress
}) {
  const [showPreview, setShowPreview] = useState(false);
  const [previewIndex, setPreviewIndex] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [useCustomRubric, setUseCustomRubric] = useState(false);

  // ドラッグ中の枠線表示は dragenter/dragleave が子要素をまたぐたびに発火するため、
  // 深さを数えて 0 になったときだけ解除する。
  const dragDepth = useRef(0);

  const handleDragEnter = (event) => {
    event.preventDefault();
    dragDepth.current += 1;
    if (!isRunning) setIsDragging(true);
  };

  const handleDragLeave = (event) => {
    event.preventDefault();
    dragDepth.current -= 1;
    if (dragDepth.current <= 0) {
      dragDepth.current = 0;
      setIsDragging(false);
    }
  };

  // dragover を止めないとブラウザがファイルを開いてしまい、アプリから離脱する。
  const handleDragOver = (event) => {
    event.preventDefault();
  };

  const handleDrop = (event) => {
    event.preventDefault();
    dragDepth.current = 0;
    setIsDragging(false);
    if (isRunning) return;
    const file = event.dataTransfer.files?.[0];
    if (file) onFileChange({ target: { files: [file] } });
  };

  const preview = payloads[previewIndex];
  const totalHits = payloads.reduce((sum, p) => sum + p.hits.length, 0);
  const truncatedCount = payloads.filter((p) => p.truncated).length;

  return (
    <div className="space-y-5">
      <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-sm">
        <h4 className="text-sm font-bold text-cyan-800 mb-4 border-b border-cyan-100 pb-2">1. ファイルを選ぶ</h4>

        <label
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          className={`flex flex-col items-center justify-center gap-2 px-4 py-8 border-2 border-dashed rounded-lg cursor-pointer transition-colors ${
            isDragging ? 'border-cyan-500 bg-cyan-50' : 'border-slate-300 hover:border-cyan-400 hover:bg-cyan-50/50'
          }`}
        >
          <Upload className={`w-7 h-7 shrink-0 ${isDragging ? 'text-cyan-600' : 'text-slate-400'}`} />
          <span className="text-sm text-slate-700 font-medium">
            {isDragging ? 'ここにドロップ' : fileName || 'ファイルをドラッグ&ドロップ'}
          </span>
          {!isDragging && (
            <span className="text-xs text-slate-500">
              またはクリックして選択（提出物一覧 .xlsx / 提出ファイルをまとめた .zip）
            </span>
          )}
          <input type="file" accept=".xlsx,.zip" className="hidden" onChange={onFileChange} disabled={isRunning || isLoadingFile} />
        </label>

        {isLoadingFile && (
          <p className="mt-3 text-sm text-slate-500">
            読み込み中...
            {loadProgress.total > 0 && ` ${loadProgress.done}/${loadProgress.total}件の本文を取り出しています`}
          </p>
        )}

        {!isLoadingFile && rows.length > 0 && (
          <div className="mt-3 space-y-2 text-sm">
            <p className="text-slate-600">
              <span className="font-bold text-cyan-800">{mode.label}</span> として {rows.length} 件を読み込みました。
              {truncatedCount > 0 && (
                <span className="text-amber-700">（うち {truncatedCount} 件は本文が長いため末尾を切り詰めます）</span>
              )}
            </p>

            {duplicateRows.length > 0 && (
              <p className="text-xs text-slate-500">
                同じ学生が複数ファイルを提出しているものは1件にまとめました（
                {duplicateRows.map((r) => `${r.studentId}: ${r.duplicateOf.join('・')}を除外`).join(' / ')}）。
              </p>
            )}

            {skippedRows.length > 0 && (
              <div className="text-xs text-amber-900 bg-amber-50 border border-amber-300 rounded-md p-3">
                <p className="font-bold">本文を取り出せなかった {skippedRows.length} 件は解析しません</p>
                <ul className="mt-1 space-y-0.5">
                  {skippedRows.map((r) => (
                    <li key={r.studentId}>
                      {r.studentId} {r.kanjiName}（{r.fileName}）— {r.extractError}
                    </li>
                  ))}
                </ul>
                <p className="mt-1">この分は目で確認してください。</p>
              </div>
            )}
          </div>
        )}
      </div>

      {rows.length > 0 && (
        <>
          <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-sm space-y-4">
            <h4 className="text-sm font-bold text-cyan-800 border-b border-cyan-100 pb-2">2. 解析の設定</h4>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">授業の主題</label>
              <input
                type="text"
                value={courseContext}
                onChange={(e) => onCourseContextChange(e.target.value)}
                disabled={isRunning}
                placeholder={mode.key === 'report' ? '例: 解剖生理学実験 ラットの解剖' : '例: 解剖生理学 第2回（ATPとエネルギー代謝）'}
                className="w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm sm:text-sm focus:ring-cyan-500 focus:border-cyan-500"
              />
              <p className="mt-1 text-xs text-slate-500">
                入力すると「授業固有の具体性」の判定精度が上がります。空欄でも実行できます。
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">本文から伏せる氏名（教員名など・カンマ区切り）</label>
              <input
                type="text"
                value={extraNames}
                onChange={(e) => onExtraNamesChange(e.target.value)}
                disabled={isRunning}
                placeholder="例: 山田太郎, 鈴木花子"
                className="w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm sm:text-sm focus:ring-cyan-500 focus:border-cyan-500"
              />
              <p className="mt-1 text-xs text-slate-500">
                学生の氏名はファイルから自動で伏せます。姓だけを入れると本文中の普通の語まで置き換わることがあるため、姓名をまとめて入力してください。
              </p>
            </div>

            <div>
              <fieldset>
                <legend className="text-xs font-bold text-slate-700 mb-2">採点基準</legend>
                <div className="space-y-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="rubric-mode"
                      checked={!useCustomRubric}
                      onChange={() => {
                        setUseCustomRubric(false);
                        onCustomRubricTextChange('');
                      }}
                      disabled={isRunning}
                      className="w-4 h-4 accent-cyan-700"
                    />
                    <span className="text-sm text-slate-700">デフォルト採点基準を使う</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="rubric-mode"
                      checked={useCustomRubric}
                      onChange={() => setUseCustomRubric(true)}
                      disabled={isRunning}
                      className="w-4 h-4 accent-cyan-700"
                    />
                    <span className="text-sm text-slate-700">独自ルーブリックを使う</span>
                  </label>
                </div>
              </fieldset>
            </div>

            {useCustomRubric && (
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  ルーブリック（【S】【A】【B】【C】の形式で貼り付け）
                </label>
                <textarea
                  value={customRubricText}
                  onChange={(e) => onCustomRubricTextChange(e.target.value)}
                  disabled={isRunning}
                  placeholder={`評価項目名\n【S】説明\n【A】説明\n【B】説明\n【C】説明\n\n別の評価項目…`}
                  rows={8}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm sm:text-sm font-mono focus:ring-cyan-500 focus:border-cyan-500"
                />
                <p className="mt-1 text-xs text-slate-500">
                  最大5項目まで。各項目の説明は500文字以下、合計2000文字以下です。
                </p>
              </div>
            )}
          </div>

          <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-sm">
            <h4 className="text-sm font-bold text-cyan-800 mb-4 border-b border-cyan-100 pb-2">3. 送信内容を確認する</h4>

            <div className="flex items-start gap-2 text-blue-800 bg-blue-50 border border-blue-100 rounded-md p-3 mb-4">
              <Info className="w-4 h-4 mt-0.5 shrink-0" />
              <p className="text-xs">
                外部の解析APIへ送るのは、下に表示される<strong>本文だけ</strong>です。
                氏名・学籍番号・IPアドレス・性別などの列は送信されません。
                実行前に、氏名が残っていないか必ず目で確かめてください。
                {totalHits > 0 && <>（全体で {totalHits} 箇所を伏せ字に置き換えます）</>}
              </p>
            </div>

            <button
              type="button"
              onClick={() => setShowPreview((prev) => !prev)}
              className="flex items-center gap-2 text-sm font-bold text-cyan-700 hover:text-cyan-900 transition-colors"
            >
              {showPreview ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              {showPreview ? '送信内容を隠す' : '送信内容を確認する'}
            </button>

            {showPreview && preview && (
              <div className="mt-4 space-y-3">
                <div className="flex items-center gap-2 text-sm">
                  <button
                    type="button"
                    onClick={() => setPreviewIndex((i) => Math.max(0, i - 1))}
                    disabled={previewIndex === 0}
                    className="px-2 py-1 rounded-md bg-slate-100 text-slate-600 hover:bg-slate-200 disabled:opacity-40 transition-colors"
                  >
                    前へ
                  </button>
                  <span className="text-slate-600">{previewIndex + 1} / {payloads.length} 件目</span>
                  <button
                    type="button"
                    onClick={() => setPreviewIndex((i) => Math.min(payloads.length - 1, i + 1))}
                    disabled={previewIndex === payloads.length - 1}
                    className="px-2 py-1 rounded-md bg-slate-100 text-slate-600 hover:bg-slate-200 disabled:opacity-40 transition-colors"
                  >
                    次へ
                  </button>
                </div>

                {preview.hits.length > 0 && (
                  <div className="text-xs bg-amber-50 border border-amber-200 rounded-md p-3">
                    <p className="font-bold text-amber-900 mb-1">この件で伏せ字にした箇所</p>
                    <ul className="text-amber-900 space-y-0.5">
                      {preview.hits.map((hit) => (
                        <li key={hit.from}>「{hit.from}」→ {hit.to}（{hit.count}箇所）</li>
                      ))}
                    </ul>
                  </div>
                )}

                <pre className="text-xs bg-slate-900 text-slate-100 rounded-md p-3 overflow-auto max-h-80 whitespace-pre-wrap break-all">
{JSON.stringify({ text: preview.text, courseContext: courseContext.trim() }, null, 2)}
                </pre>
              </div>
            )}
          </div>

          <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-sm">
            <h4 className="text-sm font-bold text-cyan-800 mb-4 border-b border-cyan-100 pb-2">4. 解析を実行する</h4>
            <div className="flex flex-wrap items-center gap-2">
              {/* 全件を投げる前に1件で結果の形と採点の妥当性を確かめられるようにしておく */}
              <button
                type="button"
                onClick={onRunOne}
                disabled={isRunning}
                className="flex items-center gap-2 bg-slate-100 text-slate-700 py-2 px-4 rounded-lg font-bold hover:bg-slate-200 disabled:opacity-50 transition-colors"
              >
                <FlaskConical className="w-4 h-4" />
                1件だけ試す
              </button>
              <button
                type="button"
                onClick={onRun}
                disabled={isRunning}
                className="flex items-center gap-2 bg-cyan-700 text-white py-2 px-4 rounded-lg font-bold hover:bg-cyan-800 disabled:opacity-50 transition-colors"
              >
                <Play className="w-4 h-4" />
                {isRunning ? `解析中... ${progress.done}/${progress.total}件` : `${analyzableCount}件を解析する`}
              </button>
              {isRunning && (
                <button
                  type="button"
                  onClick={onStop}
                  className="flex items-center gap-2 bg-rose-50 text-rose-700 border border-rose-200 py-2 px-4 rounded-lg font-bold hover:bg-rose-100 transition-colors"
                >
                  <Square className="w-4 h-4" />
                  中止する
                </button>
              )}
            </div>
            <p className="mt-2 text-xs text-slate-500">
              まず「1件だけ試す」で採点の傾向を確かめてから、全件を実行することをおすすめします。
            </p>
          </div>
        </>
      )}
    </div>
  );
}
