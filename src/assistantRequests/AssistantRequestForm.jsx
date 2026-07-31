import { useState } from 'react';
import { FileEdit } from 'lucide-react';
import { CATEGORIES } from './constants.js';

function todayString() {
  const now = new Date();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  return `${now.getFullYear()}-${mm}-${dd}`;
}

function emptyForm() {
  return {
    requestDate: todayString(),
    requester: '',
    category: CATEGORIES[0],
    detail: '',
    deadline: ''
  };
}

export default function AssistantRequestForm({ onSubmit }) {
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState(emptyForm);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await onSubmit(formData);
      setFormData(emptyForm());
      setOpen(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="w-full bg-white border border-dashed border-blue-300 text-blue-700 rounded-lg py-3 px-4 font-bold hover:bg-blue-50 transition-colors flex items-center justify-center gap-2"
      >
        <FileEdit className="w-4 h-4" />
        ＋ 新規依頼を追加
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white p-5 rounded-lg border border-slate-200 shadow-sm space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1.5">依頼日</label>
          <input type="date" name="requestDate" value={formData.requestDate} onChange={handleChange} required
            className="w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm sm:text-sm" />
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1.5">依頼者</label>
          <input type="text" name="requester" value={formData.requester} onChange={handleChange} required
            className="w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm sm:text-sm" />
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1.5">依頼内容</label>
          <select name="category" value={formData.category} onChange={handleChange}
            className="w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm sm:text-sm bg-white">
            {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1.5">締切日</label>
          <input type="date" name="deadline" value={formData.deadline} onChange={handleChange} required
            className="w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm sm:text-sm" />
        </div>
        <div className="md:col-span-2">
          <label className="block text-xs font-bold text-slate-700 mb-1.5">依頼詳細</label>
          <textarea name="detail" value={formData.detail} onChange={handleChange} rows={3} required
            className="w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm sm:text-sm resize-none" />
        </div>
      </div>
      <div className="flex gap-3">
        <button type="submit" disabled={isSubmitting}
          className="bg-blue-800 text-white py-2 px-4 rounded-lg font-bold hover:bg-blue-900 disabled:opacity-50 transition-colors">
          {isSubmitting ? '送信中...' : '登録する'}
        </button>
        <button type="button" onClick={() => setOpen(false)}
          className="py-2 px-4 rounded-lg font-bold text-slate-500 hover:bg-slate-100 transition-colors">
          キャンセル
        </button>
      </div>
    </form>
  );
}
