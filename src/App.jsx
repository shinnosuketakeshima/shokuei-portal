import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Link, useNavigate, Navigate } from 'react-router-dom';
import { Home, Users, FileText, Settings, Bell, Search, LayoutDashboard, ExternalLink, FolderKanban, Calendar, FileEdit, CheckCircle2, Megaphone, Trash2, Printer } from 'lucide-react';
import { collection, addDoc, serverTimestamp, query, orderBy, limit, getDocs, deleteDoc, doc } from 'firebase/firestore';
import { db } from './firebase';
import PizZip from 'pizzip';
import Docxtemplater from 'docxtemplater';
import { saveAs } from 'file-saver';
import PrinterForm from './PrinterForm';

function Sidebar() {
  return (
    <div className="w-64 bg-blue-900 border-r border-blue-800 h-screen flex-col hidden md:flex text-white shadow-xl z-20">
      <div className="p-6">
        <h1 className="text-xl font-bold text-white flex items-center gap-2">
          <LayoutDashboard className="w-6 h-6 text-blue-200" />
          学科ポータル
        </h1>
      </div>
      <nav className="flex-1 p-4 space-y-1">
        <Link to="/" className="flex items-center gap-3 px-4 py-3 text-white bg-blue-800/80 rounded-lg font-medium transition-colors shadow-sm">
          <Home className="w-5 h-5 text-blue-200" />
          ホーム
        </Link>
        <Link to="#" className="flex items-center gap-3 px-4 py-3 text-blue-100 rounded-lg font-medium transition-colors hover:bg-blue-800/50 hover:text-white">
          <Users className="w-5 h-5 text-blue-300" />
          教職員一覧
        </Link>
        <Link to="#" className="flex items-center gap-3 px-4 py-3 text-blue-100 rounded-lg font-medium transition-colors hover:bg-blue-800/50 hover:text-white">
          <FileText className="w-5 h-5 text-blue-300" />
          資料・申請書
        </Link>
        <Link to="/applications-list" className="flex items-center gap-3 px-4 py-3 text-blue-100 rounded-lg font-medium transition-colors hover:bg-blue-800/50 hover:text-white">
          <FolderKanban className="w-5 h-5 text-blue-300" />
          非常勤講師一覧
        </Link>
        <Link to="/general-list" className="flex items-center gap-3 px-4 py-3 text-blue-100 rounded-lg font-medium transition-colors hover:bg-blue-800/50 hover:text-white">
          <FolderKanban className="w-5 h-5 text-blue-300" />
          兼業一覧
        </Link>
      </nav>
      <div className="p-4 border-t border-blue-800/50">
        <Link to="#" className="flex items-center gap-3 px-4 py-3 text-blue-100 rounded-lg font-medium transition-colors hover:bg-blue-800/50 hover:text-white">
          <Settings className="w-5 h-5 text-blue-300" />
          設定
        </Link>
      </div>
    </div>
  );
}

function Header() {
  return (
    <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 sticky top-0 z-10 shadow-sm">
      <div className="flex items-center gap-4 w-96">
        <div className="relative w-full">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input 
            type="text" 
            placeholder="学内検索..." 
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
          />
        </div>
      </div>
      <div className="flex items-center gap-4">
        <button className="relative p-2 text-slate-500 hover:bg-slate-100 rounded-full transition-colors">
          <Bell className="w-5 h-5" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-rose-500 rounded-full border-2 border-white"></span>
        </button>
        <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-900 font-bold border border-blue-200">
          教
        </div>
      </div>
    </header>
  );
}

function NoticeArea() {
  const [notices, setNotices] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchNotices = async () => {
      try {
        const q = query(collection(db, 'notices'), orderBy('createdAt', 'desc'), limit(5));
        const querySnapshot = await getDocs(q);
        const noticesData = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setNotices(noticesData);
      } catch (error) {
        console.error("Error fetching notices:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchNotices();
  }, []);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col h-full">
      <div className="p-5 border-b border-slate-100 bg-blue-900 flex items-center gap-2 text-white">
        <Megaphone className="w-5 h-5 text-blue-200" />
        <h3 className="text-base font-bold">お知らせ</h3>
      </div>
      <div className="p-0 flex-1 overflow-y-auto bg-slate-50/50">
        {loading ? (
          <div className="p-6 text-center text-slate-500 flex items-center justify-center h-full">
            <div className="animate-pulse">読み込み中...</div>
          </div>
        ) : notices.length > 0 ? (
          <ul className="divide-y divide-slate-100">
            {notices.map((notice) => (
              <li key={notice.id} className="p-4 hover:bg-white transition-colors cursor-pointer group">
                <div className="flex flex-col gap-1.5">
                  <span className="text-xs font-medium text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full w-fit">
                    {notice.createdAt?.toDate().toLocaleDateString('ja-JP')}
                  </span>
                  <p className="text-sm text-slate-800 font-medium group-hover:text-blue-700 transition-colors line-clamp-2">{notice.title}</p>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <div className="p-6 text-center text-slate-500 text-sm flex items-center justify-center h-full">現在お知らせはありません。</div>
        )}
      </div>
    </div>
  );
}

function ConcurrentWorksList() {
  const [works, setWorks] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchWorks = async () => {
      try {
        const q = query(collection(db, 'concurrent_works'), orderBy('createdAt', 'desc'));
        const snapshot = await getDocs(q);
        const worksData = snapshot.docs.map(d => ({
          id: d.id,
          ...d.data()
        }));
        setWorks(worksData);
      } catch (error) {
        console.error("Error fetching works:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchWorks();
  }, []);

  const handleDelete = async (id, name) => {
    if (!window.confirm(`${name} さんの申請を削除します。よろしいですか？`)) return;
    try {
      await deleteDoc(doc(db, 'concurrent_works', id));
      setWorks(prev => prev.filter(w => w.id !== id));
    } catch (error) {
      console.error('Error deleting:', error);
      alert('削除に失敗しました。');
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden h-full flex flex-col">
      <div className="p-5 border-b border-slate-100 bg-blue-900 flex items-center gap-2 text-white">
        <FolderKanban className="w-5 h-5 text-blue-200" />
        <h3 className="text-base font-bold">学外兼務 申請一覧</h3>
      </div>
      <div className="p-0 flex-1 overflow-auto bg-slate-50/30">
        {loading ? (
          <div className="p-8 text-center text-slate-500">読み込み中...</div>
        ) : works.length === 0 ? (
          <div className="p-8 text-center text-slate-500">申請データがありません。</div>
        ) : (
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-100 text-slate-700 font-bold sticky top-0">
              <tr>
                <th className="px-4 py-3 border-b border-slate-200 whitespace-nowrap">申請日</th>
                <th className="px-4 py-3 border-b border-slate-200 whitespace-nowrap">種別</th>
                <th className="px-4 py-3 border-b border-slate-200 whitespace-nowrap">申請教員</th>
                <th className="px-4 py-3 border-b border-slate-200">兼務先</th>
                <th className="px-4 py-3 border-b border-slate-200">期間 / 日付</th>
                <th className="px-3 py-3 border-b border-slate-200 w-12"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white">
              {works.map((work) => (
                <tr key={work.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3 whitespace-nowrap">
                    {work.createdAt ? new Date(work.createdAt.toDate()).toLocaleDateString('ja-JP') : '不明'}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    {work.applicationType === 'general' ? (
                      <span className="px-2 py-1 bg-amber-100 text-amber-800 text-xs font-bold rounded-md">一般兼務</span>
                    ) : (
                      <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs font-bold rounded-md">非常勤講師</span>
                    )}
                  </td>
                  <td className="px-4 py-3 font-medium text-slate-900 whitespace-nowrap">
                    {work.name}
                  </td>
                  <td className="px-4 py-3 text-slate-700">
                    {work.workplace}
                  </td>
                  <td className="px-4 py-3 text-slate-700">
                    {work.periodType === 'specific' 
                      ? work.specificDates 
                      : `${work.periodStart} 〜 ${work.periodEnd}`}
                  </td>
                  <td className="px-3 py-3">
                    <button onClick={() => handleDelete(work.id, work.name)} className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors" title="削除">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function GeneralWorksList() {
  const [works, setWorks] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchWorks = async () => {
      try {
        const q = query(collection(db, 'concurrent_works'), orderBy('createdAt', 'desc'));
        const snapshot = await getDocs(q);
        const worksData = snapshot.docs
          .map(d => ({ id: d.id, ...d.data() }))
          .filter(w => w.applicationType === 'general');
        setWorks(worksData);
      } catch (error) {
        console.error("Error fetching works:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchWorks();
  }, []);

  const handleDelete = async (id, name) => {
    if (!window.confirm(`${name} さんの申請を削除します。よろしいですか？`)) return;
    try {
      await deleteDoc(doc(db, 'concurrent_works', id));
      setWorks(prev => prev.filter(w => w.id !== id));
    } catch (error) {
      console.error('Error deleting:', error);
      alert('削除に失敗しました。');
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden h-full flex flex-col">
      <div className="p-5 border-b border-slate-100 bg-amber-700 flex items-center gap-2 text-white">
        <FolderKanban className="w-5 h-5 text-amber-200" />
        <h3 className="text-base font-bold">学外兼業 申請一覧</h3>
      </div>
      <div className="p-0 flex-1 overflow-auto bg-slate-50/30">
        {loading ? (
          <div className="p-8 text-center text-slate-500">読み込み中...</div>
        ) : works.length === 0 ? (
          <div className="p-8 text-center text-slate-500">申請データがありません。</div>
        ) : (
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-100 text-slate-700 font-bold sticky top-0">
              <tr>
                <th className="px-4 py-3 border-b border-slate-200 whitespace-nowrap">申請日</th>
                <th className="px-4 py-3 border-b border-slate-200 whitespace-nowrap">氏名</th>
                <th className="px-4 py-3 border-b border-slate-200">兼業名称</th>
                <th className="px-4 py-3 border-b border-slate-200">兼業内容</th>
                <th className="px-4 py-3 border-b border-slate-200">兼業期間</th>
                <th className="px-3 py-3 border-b border-slate-200 w-12"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white">
              {works.map((work) => (
                <tr key={work.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3 whitespace-nowrap">
                    {work.createdAt ? new Date(work.createdAt.toDate()).toLocaleDateString('ja-JP') : '不明'}
                  </td>
                  <td className="px-4 py-3 font-medium text-slate-900 whitespace-nowrap">
                    {work.name}
                  </td>
                  <td className="px-4 py-3 text-slate-700">
                    {work.workplace}
                  </td>
                  <td className="px-4 py-3 text-slate-700">
                    {work.jobDescription || '—'}
                  </td>
                  <td className="px-4 py-3 text-slate-700">
                    {work.periodType === 'specific'
                      ? work.specificDates
                      : `${work.periodStart} 〜 ${work.periodEnd}`}
                  </td>
                  <td className="px-3 py-3">
                    <button onClick={() => handleDelete(work.id, work.name)} className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors" title="削除">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function ConcurrentWorkForm() {
  const [formData, setFormData] = useState({
    department: '食物栄養学科',
    title: '',
    name: '',
    workplace: '',
    subjectName: '',
    term: '前期',
    periodType: 'range',
    specificDates: '',
    periodStart: '',
    periodEnd: '',
    dayOfWeek: '月',
    startTime: '',
    endTime: '',
    credits: '',
    relationComment: '',
    isEquivalentSubjectRequested: 'はい',
    noHinderanceComment: '',
    isNoHinderance: 'はい'
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await addDoc(collection(db, "concurrent_works"), {
        ...formData,
        applicationType: 'part-time',
        createdAt: serverTimestamp()
      });

      // Wordファイルの生成とダウンロード
      try {
        const response = await fetch('/template.docx?v=' + new Date().getTime());
        if (!response.ok) {
          console.warn('テンプレートファイル(/template.docx)が見つかりません。ダウンロードをスキップします。');
        } else {
          const blob = await response.blob();
          const arrayBuffer = await blob.arrayBuffer();

          const zip = new PizZip(arrayBuffer);
          const doc = new Docxtemplater(zip, {
            paragraphLoop: true,
            linebreaks: true,
            delimiters: { start: '【', end: '】' }
          });

          // 和暦（令和）での日付文字列を作成
          const today = new Date();
          const yearReiwa = today.getFullYear() - 2018; 
          const reiwaDateStr = `令和${yearReiwa}年${today.getMonth() + 1}月${today.getDate()}日`;

          // 期間の和暦変換
          const toReiwa = (dateString) => {
            if (!dateString) return '';
            const d = new Date(dateString);
            const year = d.getFullYear() - 2018;
            return `令和${year}年${d.getMonth() + 1}月${d.getDate()}日`;
          };

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

          // 担当時間の「○」付け変数
          const termZenki = formData.term === '前期' ? '○' : '　';
          const termKouki = formData.term === '後期' ? '○' : '　';
          const termTsunen = formData.term === '通年' ? '○' : '　';
          const termShuchu = formData.term === '集中講義' ? '○' : '　';

          // 同等科目の依頼の有無「○」付け変数
          const eqYes = formData.isEquivalentSubjectRequested === 'はい' ? '○' : '　';
          const eqNo = formData.isEquivalentSubjectRequested === 'いいえ' ? '○' : '　';

          // 勤務支障なし「○」付け変数
          const hinYes = formData.isNoHinderance === 'はい' ? '○' : '　';
          const hinNo = formData.isNoHinderance === 'いいえ' ? '○' : '　';

          // フォームデータをテンプレートに埋め込む
          doc.render({
            ...formData,
            reiwaDate: reiwaDateStr,
            periodStart: reiwaPeriodStart,
            periodEnd: reiwaPeriodEnd,
            day,
            startTime,
            endTime,
            specificDates: specificDatesOut,
            termZenki,
            termKouki,
            termTsunen,
            termShuchu,
            eqYes,
            eqNo,
            hinYes,
            hinNo
          });

          const out = doc.getZip().generate({
            type: "blob",
            mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
          });

          saveAs(out, `兼務承認申請書_${formData.name}.docx`);
        }
      } catch (docError) {
        console.error("Wordファイルの生成に失敗しました:", docError);
      }

      setSubmitStatus('success');
      setFormData({
        department: '食物栄養学科', title: '', name: '', workplace: '', subjectName: '',
        term: '前期', periodType: 'range', specificDates: '', periodStart: '', periodEnd: '', dayOfWeek: '月', startTime: '', endTime: '', credits: '',
        relationComment: '', isEquivalentSubjectRequested: 'はい',
        noHinderanceComment: '', isNoHinderance: 'はい'
      });
      setTimeout(() => setSubmitStatus(null), 4000);
    } catch (error) {
      console.error("Error adding document: ", error);
      setSubmitStatus('error');
    }
    setIsSubmitting(false);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden h-full flex flex-col">
      <div className="p-5 border-b border-slate-100 bg-blue-900 flex items-center gap-2 text-white">
        <FileEdit className="w-5 h-5 text-blue-200" />
        <h3 className="text-base font-bold">学外非常勤講師兼務 承認申請</h3>
      </div>
      <div className="p-6 flex-1 bg-slate-50/30 overflow-y-auto">
        {submitStatus === 'success' ? (
          <div className="h-full flex flex-col items-center justify-center text-emerald-600 gap-3 py-12">
            <CheckCircle2 className="w-16 h-16" />
            <p className="font-bold text-xl">申請を送信しました</p>
            <p className="text-sm text-slate-500 mt-2 text-center">
              担当者の確認をお待ちください。<br/>申請内容が記載されたWordファイルが自動的にダウンロードされました。
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-8">
            {/* 1. 申請者情報 */}
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

            {/* 2. 兼務先・授業情報 */}
            <section className="bg-white p-5 rounded-lg border border-slate-200 shadow-sm">
              <h4 className="text-sm font-bold text-blue-800 mb-4 border-b border-blue-100 pb-2">2. 兼務先・授業情報</h4>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">相手先大学等名</label>
                  <input type="text" name="workplace" value={formData.workplace} onChange={handleChange} required
                    className="w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">授業名</label>
                  <input type="text" name="subjectName" value={formData.subjectName} onChange={handleChange} required
                    className="w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">担当時間</label>
                  <div className="flex flex-wrap gap-4 mt-1">
                    {['前期', '後期', '通年', '集中講義'].map(t => (
                      <label key={t} className="inline-flex items-center">
                        <input type="radio" name="term" value={t} checked={formData.term === t} onChange={handleChange} className="text-blue-600 focus:ring-blue-500" />
                        <span className="ml-2 text-sm text-slate-700">{t}</span>
                      </label>
                    ))}
                  </div>
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
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">曜日・時限</label>
                    <input type="text" name="dayAndTime" value={formData.dayAndTime} onChange={handleChange} placeholder="例: 月曜日 3時限" required
                      className="w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">単位数</label>
                    <input type="number" name="credits" value={formData.credits} onChange={handleChange} required min="1"
                      className="w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm" />
                  </div>
                </div>
              </div>
            </section>

            {/* 3. 本学との関係及び支障の有無 */}
            <section className="bg-white p-5 rounded-lg border border-slate-200 shadow-sm">
              <h4 className="text-sm font-bold text-blue-800 mb-4 border-b border-blue-100 pb-2">3. 本学との関係及び支障の有無</h4>
              <div className="space-y-6">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">担当授業と本学における担当授業及び専門分野との関係（コメント）</label>
                  <textarea name="relationComment" value={formData.relationComment} onChange={handleChange} rows={3} required
                    className="w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm resize-none" />
                  <div className="mt-3 bg-slate-50 p-3 rounded-md border border-slate-200">
                    <p className="text-xs text-slate-600 font-medium mb-2">上記申請と同等の科目が本学で開講されている場合、その科目が非常勤講師等へ依頼されていませんか？</p>
                    <div className="flex gap-4">
                      {['はい', 'いいえ'].map(ans => (
                        <label key={ans} className="inline-flex items-center">
                          <input type="radio" name="isEquivalentSubjectRequested" value={ans} checked={formData.isEquivalentSubjectRequested === ans} onChange={handleChange} className="text-blue-600 focus:ring-blue-500" />
                          <span className="ml-2 text-sm font-bold text-slate-700">{ans}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">本学の勤務・授業等の遂行に支障が生じないことの説明（コメント）</label>
                  <textarea name="noHinderanceComment" value={formData.noHinderanceComment} onChange={handleChange} rows={3} required
                    className="w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm resize-none" />
                  <div className="mt-3 bg-slate-50 p-3 rounded-md border border-slate-200">
                    <p className="text-xs text-slate-600 font-medium mb-2">週４日以上、各日３時限相当分以上の勤務に支障がありませんか？（教育職員の勤務に関する細則第2・3条に基づく）</p>
                    <div className="flex gap-4">
                      {['はい', 'いいえ'].map(ans => (
                        <label key={ans} className="inline-flex items-center">
                          <input type="radio" name="isNoHinderance" value={ans} checked={formData.isNoHinderance === ans} onChange={handleChange} className="text-blue-600 focus:ring-blue-500" />
                          <span className="ml-2 text-sm font-bold text-slate-700">{ans}</span>
                        </label>
                      ))}
                    </div>
                  </div>
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

function GeneralConcurrentWorkForm() {
  const [formData, setFormData] = useState({
    department: '食物栄養学科',
    title: '',
    name: '',
    workplace: '',
    jobDescription: '',
    income: '',
    periodType: 'range',
    specificDates: '',
    periodStart: '',
    periodEnd: '',
    dayOfWeek: '月',
    startTime: '',
    endTime: '',
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
        department: '食物栄養学科', title: '', name: '', workplace: '', jobDescription: '', income: '',
        periodType: 'range', specificDates: '', periodStart: '', periodEnd: '', dayOfWeek: '月', startTime: '', endTime: '',
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


function Dashboard() {
  const navigate = useNavigate();

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="mb-8 border-b border-slate-200 pb-4">
        <h2 className="text-2xl font-bold text-blue-900 tracking-tight">ダッシュボード</h2>
        <p className="text-slate-500 mt-1.5 text-sm">十文字学園女子大学 食物栄養学科 ポータル</p>
      </div>
      
      {/* リンク＆パス セクション */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        
        {/* 学科会計へのリンク */}
        <a href="https://jumonjiuac-my.sharepoint.com/:x:/g/personal/k-ishii_jumonji-u_ac_jp/IQCwMXUJnTZpQriCYgk_AH4XAa74PFVWGFN1pTNMM_MGQ-Y?e=ttsOfg" target="_blank" rel="noopener noreferrer" className="group bg-white p-5 rounded-xl border border-slate-200 shadow-sm hover:shadow-md hover:border-blue-300 transition-all flex items-center gap-4">
          <div className="w-12 h-12 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-600 group-hover:scale-105 transition-transform shrink-0">
            <ExternalLink className="w-6 h-6" />
          </div>
          <div className="overflow-hidden">
            <h3 className="text-base font-bold text-slate-800 truncate">学科会計（Excel）</h3>
            <p className="text-xs text-slate-500 mt-1 truncate">オンラインExcelを開く</p>
          </div>
        </a>

        {/* 学内共有フォルダ */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4 group hover:border-blue-300 transition-all">
          <div className="w-12 h-12 bg-amber-50 rounded-xl flex items-center justify-center text-amber-600 shrink-0">
            <FolderKanban className="w-6 h-6" />
          </div>
          <div className="overflow-hidden w-full">
            <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
              学内共有フォルダ
              <span className="text-[10px] bg-rose-100 text-rose-700 px-1.5 py-0.5 rounded font-bold whitespace-nowrap">学内限定</span>
            </h3>
            <div className="mt-1.5 flex items-center">
              <code className="text-xs px-2 py-1 bg-slate-100 text-slate-700 rounded border border-slate-200 select-all overflow-hidden text-ellipsis whitespace-nowrap w-full block" title="\\filesv\教職員用\学科\食物栄養\食物栄養学科">
                \\filesv\教職員用\学科\食物栄養\食物栄養学科
              </code>
            </div>
          </div>
        </div>

        {/* 公式ホームページ CMS */}
        <a href="https://jumonji-u-artis-cms3.com/main/cms-admin/" target="_blank" rel="noopener noreferrer" className="group bg-white p-5 rounded-xl border border-slate-200 shadow-sm hover:shadow-md hover:border-indigo-300 transition-all flex flex-col gap-3 md:col-span-3">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600 group-hover:scale-105 transition-transform shrink-0">
              <ExternalLink className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                公式ホームページ（アーティスCMS）
                <span className="text-[10px] bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded font-bold whitespace-nowrap">管理者用</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">CMS管理画面を開く</p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-1">
            <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
              <p className="text-[10px] font-bold text-slate-500 mb-1.5">【CMS ログイン】</p>
              <div className="flex items-center gap-2 text-xs"><span className="text-slate-500 font-medium w-6">ID:</span><code className="select-all text-slate-800 font-bold">jumonji</code></div>
              <div className="flex items-center gap-2 text-xs mt-1"><span className="text-slate-500 font-medium w-6">PW:</span><code className="select-all text-slate-800 font-bold">NYr5si_sedEp</code></div>
            </div>
            <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
              <p className="text-[10px] font-bold text-slate-500 mb-1.5">【第2パスワード】</p>
              <div className="flex items-center gap-2 text-xs"><span className="text-slate-500 font-medium w-6">ID:</span><code className="select-all text-slate-800 font-bold">syokuei</code></div>
              <div className="flex items-center gap-2 text-xs mt-1"><span className="text-slate-500 font-medium w-6">PW:</span><code className="select-all text-slate-800 font-bold">0805pswd</code></div>
            </div>
          </div>
        </a>

        {/* 広報課 情報提供フォーム */}
        <a href="https://forms.office.com/r/apnXDygHmG" target="_blank" rel="noopener noreferrer" className="group bg-white p-5 rounded-xl border border-slate-200 shadow-sm hover:shadow-md hover:border-teal-300 transition-all flex flex-col gap-3 md:col-span-3">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-teal-50 rounded-xl flex items-center justify-center text-teal-600 group-hover:scale-105 transition-transform shrink-0">
              <Megaphone className="w-6 h-6" />
            </div>
            <div className="flex-1">
              <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                広報課 情報提供フォーム
                <span className="text-[10px] bg-teal-100 text-teal-700 px-1.5 py-0.5 rounded font-bold whitespace-nowrap">Microsoft Forms</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">学科の取組み・イベント等を広報課へ提供（クリックでフォームを開く）</p>
            </div>
          </div>
          <details className="mt-1" onClick={(e) => e.stopPropagation()}>
            <summary className="text-xs text-teal-700 font-bold cursor-pointer hover:underline">▶ 提供できる情報の例を見る</summary>
            <ul className="mt-2 text-xs text-slate-600 space-y-1 pl-4 list-disc">
              <li>学内・学外のイベントへの参加（お祭り、ブース出展など）</li>
              <li>学内で学生の展示・発表を行う</li>
              <li>授業でワークショップやグループワークを行う</li>
              <li>メニューなどのレシピ開発を行う</li>
              <li>普段の授業の様子を撮影してほしい</li>
              <li>学科教員および学生がメディアに出演</li>
              <li>ゼミでの活動</li>
              <li>学生の有志団体での活動</li>
              <li>学外授業に同行して撮影してほしい</li>
              <li>卒業生の活躍</li>
              <li>学生個人の活躍・表彰（スポーツ・文化・社会活動）など</li>
              <li>学外との連携活動・地域連携活動への参加</li>
            </ul>
            <p className="mt-2 text-xs text-slate-500">※ 撮影・取材をご希望の場合は、広報課にて調整の上、可能な限り対応いたします。</p>
          </details>
        </a>

        {/* 学外非常勤講師 兼務申請 */}
        <button onClick={() => navigate('/application')} className="group bg-white p-5 rounded-xl border border-slate-200 shadow-sm hover:shadow-lg hover:border-blue-400 hover:-translate-y-1 hover:bg-blue-50/50 transition-all duration-200 flex items-center gap-4 text-left">
          <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600 group-hover:scale-110 group-hover:bg-blue-100 transition-all duration-200 shrink-0">
            <FileEdit className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-800 group-hover:text-blue-700 transition-colors">学外非常勤講師 兼務申請</h3>
            <p className="text-xs text-slate-500 mt-1">申請フォームへ進む</p>
          </div>
        </button>

        {/* 学外兼務 承認申請（一般） */}
        <button onClick={() => navigate('/application-general')} className="group bg-white p-5 rounded-xl border border-slate-200 shadow-sm hover:shadow-lg hover:border-amber-400 hover:-translate-y-1 hover:bg-amber-50/50 transition-all duration-200 flex items-center gap-4 text-left">
          <div className="w-12 h-12 bg-amber-50 rounded-xl flex items-center justify-center text-amber-600 group-hover:scale-110 group-hover:bg-amber-100 transition-all duration-200 shrink-0">
            <FileEdit className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-800 group-hover:text-amber-700 transition-colors">学外兼務 承認申請（一般）</h3>
            <p className="text-xs text-slate-500 mt-1">非常勤講師以外の兼務申請</p>
          </div>
        </button>

        {/* 大型カラープリンター利用申請 */}
        <button onClick={() => navigate('/application-printer')} className="group bg-white p-5 rounded-xl border border-slate-200 shadow-sm hover:shadow-lg hover:border-violet-400 hover:-translate-y-1 hover:bg-violet-50/50 transition-all duration-200 flex items-center gap-4 text-left">
          <div className="w-12 h-12 bg-violet-50 rounded-xl flex items-center justify-center text-violet-600 group-hover:scale-110 group-hover:bg-violet-100 transition-all duration-200 shrink-0">
            <Printer className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-800 group-hover:text-violet-700 transition-colors">大型カラープリンター申請</h3>
            <p className="text-xs text-slate-500 mt-1">印刷業務依頼・機器使用願い</p>
          </div>
        </button>

      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* カレンダーセクション */}
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col h-[450px]">
          <div className="p-5 border-b border-slate-100 bg-blue-900 flex items-center gap-2 text-white">
            <Calendar className="w-5 h-5 text-blue-200" />
            <h3 className="text-base font-bold">学科スケジュール</h3>
          </div>
          <div className="flex-1 bg-slate-50 relative p-4">
            {/* Googleカレンダーiframe用のプレースホルダー */}
            <div className="w-full h-full border-2 border-dashed border-slate-300 rounded-xl bg-white flex flex-col items-center justify-center text-slate-400 gap-4 hover:bg-slate-50 transition-colors">
              <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center text-blue-300">
                <Calendar className="w-8 h-8" />
              </div>
              <div className="text-center">
                <p className="font-bold text-slate-600 mb-1">Googleカレンダー プレースホルダー</p>
                <p className="text-sm text-slate-400">※ ここにiframeを埋め込みます</p>
              </div>
            </div>
          </div>
        </div>

        {/* お知らせエリア */}
        <div className="lg:col-span-1 h-[450px]">
          <NoticeArea />
        </div>
      </div>
      
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <div className="flex h-screen bg-slate-50 font-sans text-slate-900">
        <Sidebar />
        <div className="flex-1 flex flex-col overflow-hidden">
          <Header />
          <main className="flex-1 overflow-y-auto">
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/index.html" element={<Navigate to="/" replace />} />
              <Route path="/applications-list" element={
                <div className="p-8 max-w-5xl mx-auto h-full flex flex-col">
                  <div className="mb-6 flex items-center justify-between">
                    <h2 className="text-2xl font-bold text-blue-900">学外非常勤講師 兼務申請一覧</h2>
                    <Link to="/" className="text-sm text-blue-600 hover:text-blue-800 font-medium">← ダッシュボードへ戻る</Link>
                  </div>
                  <div className="flex-1 min-h-0">
                    <ConcurrentWorksList />
                  </div>
                </div>
              } />
              <Route path="/general-list" element={
                <div className="p-8 max-w-6xl mx-auto h-full flex flex-col">
                  <div className="mb-6 flex items-center justify-between">
                    <h2 className="text-2xl font-bold text-blue-900">学外兼業 申請一覧</h2>
                    <Link to="/" className="text-sm text-blue-600 hover:text-blue-800 font-medium">← ダッシュボードへ戻る</Link>
                  </div>
                  <div className="flex-1 min-h-0">
                    <GeneralWorksList />
                  </div>
                </div>
              } />
              <Route path="/application" element={
                <div className="p-8 max-w-2xl mx-auto">
                  <div className="mb-6 flex items-center justify-between">
                    <h2 className="text-2xl font-bold text-blue-900">学外非常勤講師 兼務申請</h2>
                    <Link to="/" className="text-sm text-blue-600 hover:text-blue-800 font-medium">← ダッシュボードへ戻る</Link>
                  </div>
                  <div className="h-auto min-h-[500px]">
                    <ConcurrentWorkForm />
                  </div>
                </div>
              } />
              <Route path="/application-general" element={
                <div className="p-8 max-w-2xl mx-auto">
                  <div className="mb-6 flex items-center justify-between">
                    <h2 className="text-2xl font-bold text-blue-900">学外兼務 承認申請（一般）</h2>
                    <Link to="/" className="text-sm text-amber-600 hover:text-amber-800 font-medium">← ダッシュボードへ戻る</Link>
                  </div>
                  <div className="h-auto min-h-[500px]">
                    <GeneralConcurrentWorkForm />
                  </div>
                </div>
              } />
              <Route path="/application-printer" element={
                <div className="p-8 max-w-2xl mx-auto">
                  <div className="mb-6 flex items-center justify-between">
                    <h2 className="text-2xl font-bold text-blue-900">大型カラープリンター申請</h2>
                    <Link to="/" className="text-sm text-violet-600 hover:text-violet-800 font-medium">← ダッシュボードへ戻る</Link>
                  </div>
                  <div className="h-auto min-h-[500px]">
                    <PrinterForm />
                  </div>
                </div>
              } />
            </Routes>
          </main>
        </div>
      </div>
    </BrowserRouter>
  );
}

export default App;
