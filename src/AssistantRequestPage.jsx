// src/AssistantRequestPage.jsx
import { useState, useEffect, useMemo } from 'react';
import { FolderKanban, AlertTriangle } from 'lucide-react';
import {
  fetchAllAssistantRequests,
  addAssistantRequest,
  updateAssistantRequest,
  deleteAssistantRequest
} from './assistantRequests/firestoreHelpers.js';
import { saveAs } from 'file-saver';
import { currentFiscalYear, fiscalYearLabel } from './assistantRequests/fiscalYear.js';
import { sortRequests } from './assistantRequests/sorting.js';
import { filterRequests, emptyFilters } from './assistantRequests/filtering.js';
import { buildAssistantRequestWorkbook } from './assistantRequests/exportXlsx.js';
import AssistantRequestForm from './assistantRequests/AssistantRequestForm';
import AssistantRequestTable from './assistantRequests/AssistantRequestTable';
import AssistantRequestEditModal from './assistantRequests/AssistantRequestEditModal';
import AssistantRequestDeleteDialog from './assistantRequests/AssistantRequestDeleteDialog';
import AssistantRequestFilterBar from './assistantRequests/AssistantRequestFilterBar';
import AssigneeSummaryPanel from './assistantRequests/AssigneeSummaryPanel';

export default function AssistantRequestPage() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedFiscalYear, setSelectedFiscalYear] = useState(currentFiscalYear());
  const [editingRequest, setEditingRequest] = useState(null);
  const [deletingRequest, setDeletingRequest] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [filters, setFilters] = useState(emptyFilters());
  const [sortKey, setSortKey] = useState('no');
  const [sortDirection, setSortDirection] = useState('asc');
  const [isExporting, setIsExporting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetchAllAssistantRequests()
      .then((data) => { if (!cancelled) setRequests(data); })
      .catch((err) => {
        console.error('Error fetching assistant requests:', err);
        if (!cancelled) setError('依頼一覧の読み込みに失敗しました。');
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const availableFiscalYears = useMemo(() => {
    const years = new Set(requests.map((r) => r.fiscalYear));
    years.add(currentFiscalYear());
    return [...years].sort((a, b) => b - a);
  }, [requests]);

  const visibleRequests = useMemo(() => {
    const forYear = requests.filter((r) => r.fiscalYear === selectedFiscalYear);
    const filtered = filterRequests(forYear, filters);
    return sortRequests(filtered, sortKey, sortDirection);
  }, [requests, selectedFiscalYear, filters, sortKey, sortDirection]);

  const isFiltered = Object.values(filters).some(Boolean);

  // 書き込み成功後の一覧再取得。ここでの失敗は書き込み自体の失敗ではないので、
  // 「失敗しました」とは言わず、例外も投げない（投げるとフォーム／モーダルが
  // 開いたままになり、利用者が再送信して重複データを作ってしまうため）。
  const refreshRequests = async () => {
    try {
      setRequests(await fetchAllAssistantRequests());
    } catch (err) {
      console.error('Error refreshing assistant requests:', err);
      setError('処理は完了しましたが、一覧の再読み込みに失敗しました。ページを再読み込みしてください。');
    }
  };

  const handleAdd = async (formValues) => {
    setError(null);
    let newRequest;
    try {
      // 採番のため、書き込み直前に最新の一覧を取り直す。
      const freshRequests = await fetchAllAssistantRequests();
      newRequest = await addAssistantRequest(formValues, freshRequests);
    } catch (err) {
      console.error('Error adding assistant request:', err);
      setError('依頼の登録に失敗しました。');
      throw err;
    }
    setSelectedFiscalYear(newRequest.fiscalYear);
    await refreshRequests();
  };

  const handleSaveEdit = async (fields) => {
    setError(null);
    try {
      await updateAssistantRequest(editingRequest.id, fields);
    } catch (err) {
      console.error('Error updating assistant request:', err);
      setError('依頼の更新に失敗しました。');
      throw err;
    }
    await refreshRequests();
  };

  const handleConfirmDelete = async () => {
    setError(null);
    setIsDeleting(true);
    try {
      await deleteAssistantRequest(deletingRequest.id);
    } catch (err) {
      console.error('Error deleting assistant request:', err);
      setError('削除に失敗しました。');
      return;
    } finally {
      setIsDeleting(false);
      setDeletingRequest(null);
    }
    await refreshRequests();
  };

  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
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

  // フィルタバーのプルダウン用。項目と方向を直接指定する。
  const handleSortChange = (key, direction) => {
    setSortKey(key);
    setSortDirection(direction);
  };

  const handleExport = async () => {
    setError(null);
    setIsExporting(true);
    try {
      const buffer = await buildAssistantRequestWorkbook(visibleRequests, selectedFiscalYear);
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      saveAs(blob, `事務補佐依頼一覧_${fiscalYearLabel(selectedFiscalYear)}.xlsx`);
    } catch (err) {
      console.error('Error exporting assistant requests:', err);
      setError('エクスポートに失敗しました。');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
      <div className="p-5 border-b border-slate-100 bg-blue-900 flex items-center gap-2 text-white">
        <FolderKanban className="w-5 h-5 text-blue-200" />
        <h3 className="text-base font-bold">事務補佐依頼一覧</h3>
      </div>
      <div className="p-6 space-y-6">
        {error && <p className="text-rose-600 text-sm bg-rose-50 p-2 rounded-md">{error}</p>}

        <div className="flex items-start gap-2 text-sm text-amber-900 bg-amber-50 border border-amber-300 rounded-md p-4">
          <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0 text-amber-600" />
          <ul className="list-disc pl-4 space-y-1.5 marker:text-amber-500">
            <li>助手室への依頼期限は7日以前とします。</li>
            <li>印刷依頼などは、原本を4日前（土日は含みません）までにご提出ください。直前になった場合は、ご自身での対応をお願いします。</li>
            <li>講義や授業を実施するために依頼できる仕事量は、一週間で90分程度です。実験実習のための準備は、90分に含まれません。</li>
            <li>ご依頼内容の具体的な指示は担当者に直接ご連絡ください。（依頼日の翌出勤日に担当者を決める予定です。）</li>
            <li>総合演習Ⅱに関する授業資料の印刷は事務補佐依頼の対象外です。</li>
            <li>月～金曜日、8：40～17：10の出勤時間以外となる依頼は事前にご相談ください。</li>
          </ul>
        </div>

        <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-3">
          {availableFiscalYears.map((fy) => (
            <button
              key={fy}
              onClick={() => setSelectedFiscalYear(fy)}
              className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors ${
                fy === selectedFiscalYear ? 'bg-blue-800 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {fiscalYearLabel(fy)}
            </button>
          ))}
        </div>

        <AssistantRequestForm onSubmit={handleAdd} />

        {!loading && (
          <AssigneeSummaryPanel
            requests={requests}
            fiscalYear={selectedFiscalYear}
          />
        )}

        <AssistantRequestFilterBar
          filters={filters}
          onFilterChange={handleFilterChange}
          sortKey={sortKey}
          sortDirection={sortDirection}
          onSortChange={handleSortChange}
          onExport={handleExport}
          isExporting={isExporting}
          disabled={isExporting || loading || visibleRequests.length === 0}
        />

        {/*
          一覧は自前の高さ・スクロールを持つ。ページ全体を画面高さに押し込む
          （h-full + flex-1 min-h-0）方式だと、上のフィルタバーが伸びた分だけ
          ここの高さが 0 に潰れて表が見えなくなるため、max-h で持たせている。
        */}
        {loading ? (
          <div className="p-8 text-center text-slate-500">読み込み中...</div>
        ) : (
          <div className="max-h-[70vh] min-h-[16rem] overflow-auto border border-slate-200 rounded-lg">
            <AssistantRequestTable
              requests={visibleRequests}
              onRowClick={setEditingRequest}
              onDelete={setDeletingRequest}
              sortKey={sortKey}
              sortDirection={sortDirection}
              onSort={handleSort}
              isFiltered={isFiltered}
            />
          </div>
        )}
      </div>

      {editingRequest && (
        <AssistantRequestEditModal
          request={editingRequest}
          onSave={handleSaveEdit}
          onClose={() => setEditingRequest(null)}
        />
      )}

      {deletingRequest && (
        <AssistantRequestDeleteDialog
          request={deletingRequest}
          onConfirm={handleConfirmDelete}
          onCancel={() => setDeletingRequest(null)}
          isDeleting={isDeleting}
        />
      )}
    </div>
  );
}
