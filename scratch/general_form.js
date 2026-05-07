function GeneralConcurrentWorkForm() {
  const [formData, setFormData] = useState({
    department: '',
    title: '',
    name: '',
    workplace: '',
    jobDescription: '',
    income: '',
    periodType: 'range',
    specificDates: '',
    periodStart: '',
    periodEnd: '',
    dayAndTime: '',
    relationComment: '',
    noHinderanceComment: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await addDoc(collection(db, "concurrent_works"), {
        ...formData,
        applicationType: 'general',
        createdAt: serverTimestamp()
      });

      // Wordファイルの生成
      try {
        const response = await fetch('/template-general.docx?v=' + new Date().getTime());
        if (!response.ok) {
          console.warn('テンプレートファイル(/template-general.docx)が見つかりません。');
        } else {
          const blob = await response.blob();
          const arrayBuffer = await blob.arrayBuffer();

          const zip = new PizZip(arrayBuffer);
          const doc = new Docxtemplater(zip, {
            paragraphLoop: true,
            linebreaks: true,
            delimiters: { start: '【', end: '】' }
          });

          const today = new Date();
          const yearReiwa = today.getFullYear() - 2018; 
          const reiwaDateStr = `令和${yearReiwa}年${today.getMonth() + 1}月${today.getDate()}日`;

          const toReiwa = (dateString) => {
            if (!dateString) return '';
            const d = new Date(dateString);
            const year = d.getFullYear() - 2018;
            return `令和${year}年${d.getMonth() + 1}月${d.getDate()}日`;
          };

          let reiwaPeriodStart = '';
          let reiwaPeriodEnd = '';

          if (formData.periodType === 'specific') {
            reiwaPeriodStart = formData.specificDates;
            reiwaPeriodEnd = '（同左）';
          } else {
            reiwaPeriodStart = toReiwa(formData.periodStart);
            reiwaPeriodEnd = toReiwa(formData.periodEnd);
          }

          doc.render({
            ...formData,
            reiwaDate: reiwaDateStr,
            periodStart: reiwaPeriodStart,
            periodEnd: reiwaPeriodEnd
          });

          const out = doc.getZip().generate({
            type: "blob",
            mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
          });
          saveAs(out, `学外兼務承認申請書_${formData.name}.docx`);
        }
      } catch (err) {
        console.error('Wordファイルの生成に失敗しました:', err);
      }

      setSubmitStatus('success');
      setFormData({
        department: '', title: '', name: '', workplace: '', jobDescription: '', income: '',
        periodType: 'range', specificDates: '', periodStart: '', periodEnd: '', dayAndTime: '',
        relationComment: '', noHinderanceComment: ''
      });
      setTimeout(() => setSubmitStatus(null), 5000);
    } catch (e) {
      console.error("Error adding document: ", e);
      setSubmitStatus('error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  return (
    <div className="bg-slate-50 border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
      <div className="bg-blue-900 text-white p-5 border-b border-blue-800">
        <h3 className="text-xl font-bold">学外兼務 承認申請（一般）</h3>
        <p className="text-blue-200 text-sm mt-1">※学外の兼務ごとに提出してください。</p>
      </div>
      
      <div className="p-6">
        {submitStatus === 'success' ? (
          <div className="bg-emerald-50 text-emerald-800 p-6 rounded-lg border border-emerald-200 text-center flex flex-col items-center">
            <CheckCircle2 className="w-12 h-12 text-emerald-500 mb-3" />
            <p className="font-bold text-lg mb-1">申請が完了しました</p>
            <p className="text-emerald-600 text-sm mb-4">内容が送信され、自動生成されたWordファイルがダウンロードされました。</p>
            <button onClick={() => setSubmitStatus(null)} className="text-emerald-700 bg-emerald-100 hover:bg-emerald-200 px-4 py-2 rounded-md text-sm font-medium transition-colors">
              続けて別の申請を行う
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-8">
            <section className="bg-white p-5 rounded-lg border border-slate-200 shadow-sm">
              <h4 className="text-sm font-bold text-blue-800 mb-4 border-b border-blue-100 pb-2">1. 申請者情報</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">所属</label>
                  <input type="text" name="department" value={formData.department} onChange={handleChange} required
                    className="w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">職名</label>
                  <input type="text" name="title" value={formData.title} onChange={handleChange} required
                    className="w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm" />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">氏名</label>
                  <input type="text" name="name" value={formData.name} onChange={handleChange} required
                    className="w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm" />
                </div>
              </div>
            </section>

            <section className="bg-white p-5 rounded-lg border border-slate-200 shadow-sm">
              <h4 className="text-sm font-bold text-blue-800 mb-4 border-b border-blue-100 pb-2">2. 兼務先・業務内容</h4>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">兼業する名称、所在地</label>
                  <input type="text" name="workplace" value={formData.workplace} onChange={handleChange} required
                    className="w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">業務内容</label>
                  <input type="text" name="jobDescription" value={formData.jobDescription} onChange={handleChange} required
                    className="w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">月額収入見込</label>
                  <input type="text" name="income" value={formData.income} onChange={handleChange} placeholder="例: 100,000円 / 交通費実費支給" required
                    className="w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm" />
                </div>
                
                <div className="bg-slate-50 p-4 rounded-md border border-slate-200">
                  <label className="block text-xs font-bold text-slate-700 mb-2">期間の指定方法</label>
                  <div className="flex gap-6 mb-4">
                    <label className="inline-flex items-center cursor-pointer">
                      <input type="radio" name="periodType" value="range" checked={formData.periodType === 'range'} onChange={handleChange} className="text-blue-600 focus:ring-blue-500 w-4 h-4" />
                      <span className="ml-2 text-sm font-bold text-slate-700">期間で指定（開始〜終了）</span>
                    </label>
                    <label className="inline-flex items-center cursor-pointer">
                      <input type="radio" name="periodType" value="specific" checked={formData.periodType === 'specific'} onChange={handleChange} className="text-blue-600 focus:ring-blue-500 w-4 h-4" />
                      <span className="ml-2 text-sm font-bold text-slate-700">特定の日付で指定（複数日など）</span>
                    </label>
                  </div>

                  {formData.periodType === 'range' ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1.5">期間（開始）</label>
                        <input type="date" name="periodStart" value={formData.periodStart} onChange={handleChange} required={formData.periodType === 'range'}
                          className="w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm" />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1.5">期間（終了）</label>
                        <input type="date" name="periodEnd" value={formData.periodEnd} onChange={handleChange} required={formData.periodType === 'range'}
                          className="w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm" />
                      </div>
                    </div>
                  ) : (
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1.5">特定の日付（自由に記入してください）</label>
                      <input type="text" name="specificDates" value={formData.specificDates} onChange={handleChange} placeholder="例: 令和6年5月10日、5月17日、5月24日" required={formData.periodType === 'specific'}
                        className="w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm" />
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">曜日・時限</label>
                  <input type="text" name="dayAndTime" value={formData.dayAndTime} onChange={handleChange} placeholder="例: 火曜日 13:00〜16:00" required
                    className="w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm" />
                </div>
              </div>
            </section>

            <section className="bg-white p-5 rounded-lg border border-slate-200 shadow-sm">
              <h4 className="text-sm font-bold text-blue-800 mb-4 border-b border-blue-100 pb-2">3. 関係性及び支障の有無</h4>
              <div className="space-y-6">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">当該業務と本学における担当授業及び専門分野との関係</label>
                  <textarea name="relationComment" value={formData.relationComment} onChange={handleChange} rows={3} required
                    className="w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm resize-none" />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">本学の勤務・授業等の遂行に支障が生じないことの説明</label>
                  <textarea name="noHinderanceComment" value={formData.noHinderanceComment} onChange={handleChange} rows={3} required
                    className="w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm resize-none" />
                </div>
              </div>
            </section>

            <div className="pt-4 pb-8">
              <button 
                type="submit" 
                disabled={isSubmitting}
                className="w-full bg-blue-800 text-white py-3 px-4 border border-transparent rounded-lg shadow-md text-base font-bold hover:bg-blue-900 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 transition-colors"
              >
                {isSubmitting ? '送信中...' : '提出する'}
              </button>
              {submitStatus === 'error' && (
                <p className="text-rose-600 text-sm mt-3 text-center font-medium bg-rose-50 p-2 rounded-md">エラーが発生しました。通信環境を確認してください。</p>
              )}
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
