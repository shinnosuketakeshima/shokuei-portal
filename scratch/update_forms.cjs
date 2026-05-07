const fs = require('fs');

let appJsx = fs.readFileSync('src/App.jsx', 'utf8');

// ========== ConcurrentWorkForm の修正 ==========
// 1. state の初期値
appJsx = appJsx.replace(
  "periodEnd: '',\n    dayAndTime: '',",
  "periodEnd: '',\n    dayOfWeek: '月',\n    startTime: '',\n    endTime: '',"
);

// 2. setFormData 初期化
appJsx = appJsx.replace(
  "periodType: 'range', specificDates: '', periodStart: '', periodEnd: '', dayAndTime: '', credits: '',",
  "periodType: 'range', specificDates: '', periodStart: '', periodEnd: '', dayOfWeek: '月', startTime: '', endTime: '', credits: '',"
);

// 3. Word出力ロジック
const replaceLogic1 = `
          let reiwaPeriodStart = '';
          let reiwaPeriodEnd = '';

          if (formData.periodType === 'specific') {
            reiwaPeriodStart = formData.specificDates;
            reiwaPeriodEnd = '（同左）';
          } else {
            reiwaPeriodStart = toReiwa(formData.periodStart);
            reiwaPeriodEnd = toReiwa(formData.periodEnd);
          }
`;

const newLogic1 = `
          let reiwaPeriodStart = '';
          let reiwaPeriodEnd = '';
          let day = '';
          let startTime = '';
          let endTime = '';
          let specificDatesOut = '';

          if (formData.periodType === 'specific') {
            specificDatesOut = formData.specificDates;
          } else {
            reiwaPeriodStart = toReiwa(formData.periodStart);
            reiwaPeriodEnd = toReiwa(formData.periodEnd);
            day = formData.dayOfWeek;
            startTime = formData.startTime;
            endTime = formData.endTime;
          }
`;
appJsx = appJsx.replace(replaceLogic1, newLogic1);

// doc.render の修正
appJsx = appJsx.replace(
  "periodStart: reiwaPeriodStart,\n            periodEnd: reiwaPeriodEnd,\n            termZenki,",
  "periodStart: reiwaPeriodStart,\n            periodEnd: reiwaPeriodEnd,\n            day,\n            startTime,\n            endTime,\n            specificDates: specificDatesOut,\n            termZenki,"
);

// UI の修正
const oldUI1 = `
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
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">曜日・時限</label>
                    <input type="text" name="dayAndTime" value={formData.dayAndTime} onChange={handleChange} placeholder="例: 火曜日 13:00〜16:00" required
                      className="w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm" />
                  </div>
`;

const newUI1 = `
                  {formData.periodType === 'range' ? (
                    <div className="space-y-4">
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
                      <div className="grid grid-cols-3 gap-4 border-t border-slate-200 pt-4 mt-4">
                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1.5">曜日</label>
                          <select name="dayOfWeek" value={formData.dayOfWeek} onChange={handleChange} required={formData.periodType === 'range'}
                            className="w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm bg-white">
                            {['月', '火', '水', '木', '金', '土', '日'].map(d => <option key={d} value={d}>{d}</option>)}
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1.5">開始時間</label>
                          <input type="time" name="startTime" value={formData.startTime} onChange={handleChange} required={formData.periodType === 'range'}
                            className="w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm" />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1.5">終了時間</label>
                          <input type="time" name="endTime" value={formData.endTime} onChange={handleChange} required={formData.periodType === 'range'}
                            className="w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm" />
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1.5">特定の日付（日程・曜日・時間をすべて自由に記入してください）</label>
                      <textarea name="specificDates" value={formData.specificDates} onChange={handleChange} placeholder="例: 5/10(火) 13:00〜14:30、5/20(木) 10:00〜11:30" required={formData.periodType === 'specific'} rows={3}
                        className="w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm resize-none" />
                    </div>
                  )}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
`;

appJsx = appJsx.replace(oldUI1, newUI1);


// ========== GeneralConcurrentWorkForm の修正 ==========
// 1. state の初期値
appJsx = appJsx.replace(
  "periodEnd: '',\n    dayAndTime: '',",
  "periodEnd: '',\n    dayOfWeek: '月',\n    startTime: '',\n    endTime: '',"
);

// 2. setFormData 初期化
appJsx = appJsx.replace(
  "periodType: 'range', specificDates: '', periodStart: '', periodEnd: '', dayAndTime: '',",
  "periodType: 'range', specificDates: '', periodStart: '', periodEnd: '', dayOfWeek: '月', startTime: '', endTime: '',"
);

// 3. Word出力ロジック
// (先ほどと同じなのでreplaceLogic1を使うと両方置換されるか？いや、GeneralConcurrentWorkForm内は少し違う)
const replaceLogic2 = `
          let reiwaPeriodStart = '';
          let reiwaPeriodEnd = '';

          if (formData.periodType === 'specific') {
            reiwaPeriodStart = formData.specificDates;
            reiwaPeriodEnd = '（同左）';
          } else {
            reiwaPeriodStart = toReiwa(formData.periodStart);
            reiwaPeriodEnd = toReiwa(formData.periodEnd);
          }
`;
// これを再度置換すると2回目がマッチする（1回目は既に置換済みだから）
appJsx = appJsx.replace(replaceLogic2, newLogic1);

// doc.render の修正 (General用)
const renderLogic2 = `
          doc.render({
            ...formData,
            reiwaDate: reiwaDateStr,
            periodStart: reiwaPeriodStart,
            periodEnd: reiwaPeriodEnd
          });
`;
const newRenderLogic2 = `
          doc.render({
            ...formData,
            reiwaDate: reiwaDateStr,
            periodStart: reiwaPeriodStart,
            periodEnd: reiwaPeriodEnd,
            day,
            startTime,
            endTime,
            specificDates: specificDatesOut
          });
`;
appJsx = appJsx.replace(renderLogic2, newRenderLogic2);

// UI の修正 (General用)
const oldUI2 = `
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
`;

const newUI2 = `
                  {formData.periodType === 'range' ? (
                    <div className="space-y-4">
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
                      <div className="grid grid-cols-3 gap-4 border-t border-slate-200 pt-4 mt-4">
                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1.5">曜日</label>
                          <select name="dayOfWeek" value={formData.dayOfWeek} onChange={handleChange} required={formData.periodType === 'range'}
                            className="w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm bg-white">
                            {['月', '火', '水', '木', '金', '土', '日'].map(d => <option key={d} value={d}>{d}</option>)}
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1.5">開始時間</label>
                          <input type="time" name="startTime" value={formData.startTime} onChange={handleChange} required={formData.periodType === 'range'}
                            className="w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm" />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1.5">終了時間</label>
                          <input type="time" name="endTime" value={formData.endTime} onChange={handleChange} required={formData.periodType === 'range'}
                            className="w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm" />
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1.5">特定の日付（日程・曜日・時間をすべて自由に記入してください）</label>
                      <textarea name="specificDates" value={formData.specificDates} onChange={handleChange} placeholder="例: 5/10(火) 13:00〜14:30、5/20(木) 10:00〜11:30" required={formData.periodType === 'specific'} rows={3}
                        className="w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm resize-none" />
                    </div>
                  )}
                </div>
`;
appJsx = appJsx.replace(oldUI2, newUI2);

fs.writeFileSync('src/App.jsx', appJsx);
console.log('App.jsx has been updated successfully.');
