import { useState } from 'react';
import { CheckCircle2 } from 'lucide-react';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';

export default function PrinterForm() {
  const [formData, setFormData] = useState({
    applicationType: '印刷業務依頼',
    purpose: '',
    eventDate: '',
    applicantName: '',
    department: '食物栄養学科',
    departmentHead: '竹嶋伸之輔',
    phone: '',
    pickupDate: '',
    paperType: 'フォト・ペーパー（薄手半光沢紙）',
    baseDataSize: '',
    outputSize: '',
    outputCount: '',
    remarks: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState(null);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const response = await fetch('/template-printer.xlsx?v=' + Date.now());
      if (!response.ok) throw new Error('テンプレート取得失敗');
      const arrayBuffer = await response.arrayBuffer();

      const wb = new ExcelJS.Workbook();
      await wb.xlsx.load(arrayBuffer);
      const ws = wb.getWorksheet(1);

      // 曜日変換ヘルパー
      const dayNames = ['日', '月', '火', '水', '木', '金', '土'];

      // 申請日 (行8: F8=年, I8=月, K8=日)
      const today = new Date();
      ws.getCell('F8').value = today.getFullYear();
      ws.getCell('I8').value = today.getMonth() + 1;
      ws.getCell('K8').value = today.getDate();
      ws.getCell('M8').value = `（${dayNames[today.getDay()]}）`;

      // 申請事項（○印）
      if (formData.applicationType === '印刷業務依頼') {
        ws.getCell('A9').value = '○印 刷 業 務 依 頼　　　　　　・　　　　　　機 器 使 用 願 い';
      } else {
        ws.getCell('A9').value = '印 刷 業 務 依 頼　　　　　　・　　　　　　○機 器 使 用 願 い';
      }

      // 催事目的
      ws.getCell('F11').value = formData.purpose;

      // 催事日 (行12: F12=年, I12=月, K12=日, M12=曜日)
      if (formData.eventDate) {
        const ed = new Date(formData.eventDate);
        ws.getCell('F12').value = ed.getFullYear();
        ws.getCell('I12').value = ed.getMonth() + 1;
        ws.getCell('K12').value = ed.getDate();
        ws.getCell('M12').value = `（${dayNames[ed.getDay()]}）`;
      }

      // 申請者氏名
      ws.getCell('F13').value = formData.applicantName;
      // 所属
      ws.getCell('F14').value = formData.department;
      // 所属長
      ws.getCell('F15').value = formData.departmentHead;
      // 緊急連絡先
      ws.getCell('F16').value = formData.phone;

      // 受取り希望日 (行17: E17=年, H17=月, J17=日, L17=曜日)
      if (formData.pickupDate) {
        const pd = new Date(formData.pickupDate);
        ws.getCell('E17').value = pd.getFullYear();
        ws.getCell('H17').value = pd.getMonth() + 1;
        ws.getCell('J17').value = pd.getDate();
        ws.getCell('L17').value = `（${dayNames[pd.getDay()]}）`;
      }

      // 基データサイズ
      ws.getCell('F24').value = formData.baseDataSize;
      // 出力サイズ
      ws.getCell('F25').value = formData.outputSize;
      // 出力枚数
      ws.getCell('F26').value = formData.outputCount;
      // 備考欄
      ws.getCell('F27').value = formData.remarks;

      const buffer = await wb.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      saveAs(blob, `大型カラープリンター申請書_${formData.applicantName}.xlsx`);

      setSubmitStatus('success');
      setFormData({
        applicationType: '印刷業務依頼', purpose: '', eventDate: '', applicantName: '',
        department: '食物栄養学科', departmentHead: '竹嶋伸之輔', phone: '', pickupDate: '',
        paperType: 'フォト・ペーパー（薄手半光沢紙）', baseDataSize: '', outputSize: '',
        outputCount: '', remarks: ''
      });
      setTimeout(() => setSubmitStatus(null), 5000);
    } catch (err) {
      console.error('Excel生成エラー:', err);
      setSubmitStatus('error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-slate-50 border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
      <div className="bg-violet-800 text-white p-5 border-b border-violet-700">
        <h3 className="text-xl font-bold">大型カラープリンター 利用申請</h3>
        <p className="text-violet-200 text-sm mt-1">印刷業務依頼・機器使用願い</p>
      </div>
      <div className="p-6">
        {submitStatus === 'success' ? (
          <div className="bg-emerald-50 text-emerald-800 p-6 rounded-lg border border-emerald-200 text-center flex flex-col items-center">
            <CheckCircle2 className="w-12 h-12 text-emerald-500 mb-3" />
            <p className="font-bold text-lg mb-1">申請書がダウンロードされました</p>
            <p className="text-emerald-600 text-sm mb-4">Excelファイルを施設課・五十嵐宛にメール添付してください。</p>
            <button onClick={() => setSubmitStatus(null)} className="text-emerald-700 bg-emerald-100 hover:bg-emerald-200 px-4 py-2 rounded-md text-sm font-medium transition-colors">
              続けて別の申請を行う
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-8">
            <section className="bg-white p-5 rounded-lg border border-slate-200 shadow-sm">
              <h4 className="text-sm font-bold text-violet-800 mb-4 border-b border-violet-100 pb-2">1. 申請種別</h4>
              <div className="flex gap-6">
                {['印刷業務依頼', '機器使用願い'].map(t => (
                  <label key={t} className="inline-flex items-center cursor-pointer">
                    <input type="radio" name="applicationType" value={t} checked={formData.applicationType === t} onChange={handleChange} className="text-violet-600 focus:ring-violet-500 w-4 h-4" />
                    <span className="ml-2 text-sm font-bold text-slate-700">{t}</span>
                  </label>
                ))}
              </div>
            </section>

            <section className="bg-white p-5 rounded-lg border border-slate-200 shadow-sm">
              <h4 className="text-sm font-bold text-violet-800 mb-4 border-b border-violet-100 pb-2">2. 申請者情報</h4>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">申請者氏名</label>
                    <input type="text" name="applicantName" value={formData.applicantName} onChange={handleChange} required className="w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:ring-violet-500 focus:border-violet-500 sm:text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">所属（部署・団体名）</label>
                    <input type="text" name="department" value={formData.department} onChange={handleChange} required className="w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:ring-violet-500 focus:border-violet-500 sm:text-sm" />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">所属長</label>
                    <input type="text" name="departmentHead" value={formData.departmentHead} onChange={handleChange} required className="w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:ring-violet-500 focus:border-violet-500 sm:text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">緊急連絡先（携帯番号等）</label>
                    <input type="text" name="phone" value={formData.phone} onChange={handleChange} required placeholder="例: 090-1234-5678" className="w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:ring-violet-500 focus:border-violet-500 sm:text-sm" />
                  </div>
                </div>
              </div>
            </section>

            <section className="bg-white p-5 rounded-lg border border-slate-200 shadow-sm">
              <h4 className="text-sm font-bold text-violet-800 mb-4 border-b border-violet-100 pb-2">3. 催事・印刷内容</h4>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">催事目的</label>
                  <input type="text" name="purpose" value={formData.purpose} onChange={handleChange} required className="w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:ring-violet-500 focus:border-violet-500 sm:text-sm" />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">催事日</label>
                    <input type="date" name="eventDate" value={formData.eventDate} onChange={handleChange} required className="w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:ring-violet-500 focus:border-violet-500 sm:text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">受取り希望日</label>
                    <input type="date" name="pickupDate" value={formData.pickupDate} onChange={handleChange} required className="w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:ring-violet-500 focus:border-violet-500 sm:text-sm" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-2">用紙種類</label>
                  <div className="flex flex-wrap gap-4">
                    {['フォト・ペーパー（薄手半光沢紙）', 'マット合成紙', 'ポンジクロス（懸垂幕等）'].map(p => (
                      <label key={p} className="inline-flex items-center cursor-pointer">
                        <input type="radio" name="paperType" value={p} checked={formData.paperType === p} onChange={handleChange} className="text-violet-600 focus:ring-violet-500 w-4 h-4" />
                        <span className="ml-2 text-sm font-bold text-slate-700">{p}</span>
                      </label>
                    ))}
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">基データサイズ</label>
                    <input type="text" name="baseDataSize" value={formData.baseDataSize} onChange={handleChange} placeholder="例: A3" className="w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:ring-violet-500 focus:border-violet-500 sm:text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">出力サイズ</label>
                    <input type="text" name="outputSize" value={formData.outputSize} onChange={handleChange} placeholder="例: B1 (728×1030mm)" className="w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:ring-violet-500 focus:border-violet-500 sm:text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">出力枚数</label>
                    <input type="text" name="outputCount" value={formData.outputCount} onChange={handleChange} placeholder="例: 3枚" className="w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:ring-violet-500 focus:border-violet-500 sm:text-sm" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">備考欄</label>
                  <textarea name="remarks" value={formData.remarks} onChange={handleChange} rows={3} className="w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:ring-violet-500 focus:border-violet-500 sm:text-sm resize-none" />
                </div>
              </div>
            </section>

            <div className="pt-4 pb-8">
              <button type="submit" disabled={isSubmitting} className="w-full bg-violet-700 text-white py-3 px-4 border border-transparent rounded-lg shadow-md text-base font-bold hover:bg-violet-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-violet-500 disabled:opacity-50 transition-colors">
                {isSubmitting ? '生成中...' : 'Excelファイルをダウンロード'}
              </button>
              {submitStatus === 'error' && (
                <p className="text-rose-600 text-sm mt-3 text-center font-medium bg-rose-50 p-2 rounded-md">エラーが発生しました。</p>
              )}
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
