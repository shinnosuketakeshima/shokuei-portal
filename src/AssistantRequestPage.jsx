// src/AssistantRequestPage.jsx
import { useState, useEffect, useMemo } from 'react';
import { FolderKanban } from 'lucide-react';
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
import AssistantRequestFilterBar from './assistantRequests/AssistantRequestFilterBar';

export default function AssistantRequestPage() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedFiscalYear, setSelectedFiscalYear] = useState(currentFiscalYear());
  const [editingRequest, setEditingRequest] = useState(null);
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

  const handleAdd = async (formValues) => {
    setError(null);
    try {
      const freshRequests = await fetchAllAssistantRequests();
      const newRequest = await addAssistantRequest(formValues, freshRequests);
      const updatedRequests = await fetchAllAssistantRequests();
      setRequests(updatedRequests);
      setSelectedFiscalYear(newRequest.fiscalYear);
    } catch (err) {
      console.error('Error adding assistant request:', err);
      setError('依頼の登録に失敗しました。');
      throw err;
    }
  };

  const handleSaveEdit = async (fields) => {
    setError(null);
    try {
      await updateAssistantRequest(editingRequest.id, fields);
      const updatedRequests = await fetchAllAssistantRequests();
      setRequests(updatedRequests);
    } catch (err) {
      console.error('Error updating assistant request:', err);
      setError('依頼の更新に失敗しました。');
      throw err;
    }
  };

  const handleDelete = async (id, no) => {
    if (!window.confirm(`No.${no} の依頼を削除します。よろしいですか？`)) return;
    setError(null);
    try {
      await deleteAssistantRequest(id);
      const updatedRequests = await fetchAllAssistantRequests();
      setRequests(updatedRequests);
    } catch (err) {
      console.error('Error deleting assistant request:', err);
      setError('削除に失敗しました。');
    }
  };

  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

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
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden h-full flex flex-col">
      <div className="p-5 border-b border-slate-100 bg-blue-900 flex items-center gap-2 text-white">
        <FolderKanban className="w-5 h-5 text-blue-200" />
        <h3 className="text-base font-bold">事務補佐依頼一覧</h3>
      </div>
      <div className="p-6 space-y-6 flex-1 min-h-0 flex flex-col">
        {error && <p className="text-rose-600 text-sm bg-rose-50 p-2 rounded-md">{error}</p>}

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

        <AssistantRequestFilterBar
          filters={filters}
          onFilterChange={handleFilterChange}
          onExport={handleExport}
          isExporting={isExporting}
          disabled={isExporting || loading || visibleRequests.length === 0}
        />

        {loading ? (
          <div className="p-8 text-center text-slate-500">読み込み中...</div>
        ) : (
          <div className="flex-1 min-h-0 overflow-auto border border-slate-200 rounded-lg">
            <AssistantRequestTable
              requests={visibleRequests}
              onRowClick={setEditingRequest}
              onDelete={handleDelete}
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
    </div>
  );
}
