// src/assistantRequests/AssistantRequestEditModal.jsx
import { useState } from 'react';
import { CATEGORIES, STATUSES } from './constants';

export default function AssistantRequestEditModal({ request, onSave, onClose }) {
  const [formData, setFormData] = useState({
    requestDate: request.requestDate,
    requester: request.requester,
    category: request.category,
    detail: request.detail,
    deadline: request.deadline,
    status: request.status,
    assignee: request.assignee,
    completedDate: request.completedDate,
    duration: request.duration,
    notes: request.notes
  });
  const [isSaving, setIsSaving] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave(formData);
      onClose();
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-lg font-bold text-slate-800 mb-4">依頼 No.{request.no} を編集</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">依頼日</label>
            <input type="date" name="requestDate" value={formData.requestDate} onChange={handleChange}
              className="w-full px-3 py-2 border border-slate-300 rounded-md sm:text-sm" />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">依頼者</label>
            <input type="text" name="requester" value={formData.requester} onChange={handleChange}
              className="w-full px-3 py-2 border border-slate-300 rounded-md sm:text-sm" />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">依頼内容</label>
            <select name="category" value={formData.category} onChange={handleChange}
              className="w-full px-3 py-2 border border-slate-300 rounded-md sm:text-sm bg-white">
              {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">締切日</label>
            <input type="date" name="deadline" value={formData.deadline} onChange={handleChange}
              className="w-full px-3 py-2 border border-slate-300 rounded-md sm:text-sm" />
          </div>
          <div className="md:col-span-2">
            <label className="block text-xs font-bold text-slate-700 mb-1.5">依頼詳細</label>
            <textarea name="detail" value={formData.detail} onChange={handleChange} rows={2}
              className="w-full px-3 py-2 border border-slate-300 rounded-md sm:text-sm resize-none" />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">受託状況</label>
            <select name="status" value={formData.status} onChange={handleChange}
              className="w-full px-3 py-2 border border-slate-300 rounded-md sm:text-sm bg-white">
              {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">担当者</label>
            <input type="text" name="assignee" value={formData.assignee} onChange={handleChange}
              className="w-full px-3 py-2 border border-slate-300 rounded-md sm:text-sm" />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">完了日</label>
            <input type="date" name="completedDate" value={formData.completedDate} onChange={handleChange}
              className="w-full px-3 py-2 border border-slate-300 rounded-md sm:text-sm" />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">所要時間</label>
            <input type="text" name="duration" value={formData.duration} onChange={handleChange} placeholder="例: 20分"
              className="w-full px-3 py-2 border border-slate-300 rounded-md sm:text-sm" />
          </div>
          <div className="md:col-span-2">
            <label className="block text-xs font-bold text-slate-700 mb-1.5">備考</label>
            <textarea name="notes" value={formData.notes} onChange={handleChange} rows={2}
              className="w-full px-3 py-2 border border-slate-300 rounded-md sm:text-sm resize-none" />
          </div>
        </div>
        <div className="flex gap-3 mt-6">
          <button onClick={handleSave} disabled={isSaving}
            className="bg-blue-800 text-white py-2 px-4 rounded-lg font-bold hover:bg-blue-900 disabled:opacity-50 transition-colors">
            {isSaving ? '保存中...' : '保存する'}
          </button>
          <button onClick={onClose} className="py-2 px-4 rounded-lg font-bold text-slate-500 hover:bg-slate-100 transition-colors">
            キャンセル
          </button>
        </div>
      </div>
    </div>
  );
}
