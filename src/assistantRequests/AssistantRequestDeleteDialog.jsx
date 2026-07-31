// src/assistantRequests/AssistantRequestDeleteDialog.jsx
import { AlertTriangle } from 'lucide-react';

// 削除確認はブラウザ標準の window.confirm ではなくアプリ内ダイアログで出す。
// 標準ダイアログは「このサイトでは追加のダイアログを表示しない」設定などで
// 抑制されることがあり、その場合そのまま削除されずに黙って失敗するため。
export default function AssistantRequestDeleteDialog({ request, onConfirm, onCancel, isDeleting }) {
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={onCancel}>
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 bg-rose-50 rounded-full flex items-center justify-center shrink-0">
            <AlertTriangle className="w-5 h-5 text-rose-600" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-800">本当に削除しますか？</h3>
            <p className="text-sm text-slate-600 mt-1">
              この操作は取り消せません。削除した依頼は元に戻せません。
            </p>
          </div>
        </div>

        {/* 消す対象を取り違えていないか確認できるよう、依頼の中身を見せる */}
        <dl className="mt-4 bg-slate-50 border border-slate-200 rounded-lg p-3 text-sm space-y-1">
          <div className="flex gap-2">
            <dt className="text-slate-500 shrink-0 w-16">No</dt>
            <dd className="font-bold text-slate-800">{request.no}</dd>
          </div>
          <div className="flex gap-2">
            <dt className="text-slate-500 shrink-0 w-16">依頼日</dt>
            <dd className="text-slate-800">{request.requestDate}</dd>
          </div>
          <div className="flex gap-2">
            <dt className="text-slate-500 shrink-0 w-16">依頼者</dt>
            <dd className="text-slate-800">{request.requester}</dd>
          </div>
          <div className="flex gap-2">
            <dt className="text-slate-500 shrink-0 w-16">依頼内容</dt>
            <dd className="text-slate-800">{request.category}</dd>
          </div>
          <div className="flex gap-2">
            <dt className="text-slate-500 shrink-0 w-16">依頼詳細</dt>
            <dd className="text-slate-800 break-words">{request.detail}</dd>
          </div>
        </dl>

        <div className="flex gap-3 mt-6">
          <button onClick={onConfirm} disabled={isDeleting}
            className="bg-rose-600 text-white py-2 px-4 rounded-lg font-bold hover:bg-rose-700 disabled:opacity-50 transition-colors">
            {isDeleting ? '削除中...' : '削除する'}
          </button>
          <button onClick={onCancel} disabled={isDeleting}
            className="py-2 px-4 rounded-lg font-bold text-slate-500 hover:bg-slate-100 disabled:opacity-50 transition-colors">
            キャンセル
          </button>
        </div>
      </div>
    </div>
  );
}
