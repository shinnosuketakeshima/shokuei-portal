// One-time data migration: import 令和8年度 rows from
// docs/事務補佐依頼表（クラウド）.xlsx into the assistant_requests Firestore collection.
//
// fiscalYear is hardcoded to 8 for every row (matching the source sheet's own
// tab, not recomputed from requestDate) because a handful of early rows are
// dated in March 2026 (pre-April orientation prep) but are operationally part
// of the 令和8年度 cycle. Date reconstruction rule (verified against this
// sheet's actual data): requestDate/completedDate are always calendar 2026
// (only months 3-7 appear); deadline is 2027 when the month is 1 or 2
// (the fiscal year's Jan/Feb tail), otherwise 2026.

import XLSX from 'xlsx';
import { initializeApp } from 'firebase/app';
import { getFirestore, writeBatch, doc, collection, serverTimestamp } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyA8atDFs0sE-EvdoGJ1xsXu1pf09R-7iiw",
  authDomain: "jumonji-shokuei-portal.firebaseapp.com",
  projectId: "jumonji-shokuei-portal",
  storageBucket: "jumonji-shokuei-portal.firebasestorage.app",
  messagingSenderId: "953075135474",
  appId: "1:953075135474:web:b7b896c21fb467d7c6716b"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

function toDateString(md, { janFebIsNextYear = false } = {}) {
  if (!md) return '';
  const [m, d] = md.split('/').map(Number);
  const year = janFebIsNextYear && (m === 1 || m === 2) ? 2027 : 2026;
  return `${year}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

const wb = XLSX.readFile('docs/事務補佐依頼表（クラウド）.xlsx');
const ws = wb.Sheets['令和8年度'];
const data = XLSX.utils.sheet_to_json(ws, { header: 1, raw: false, defval: '' });
const rows = data.slice(1).filter((r) => r[0] && r[0] !== '' && r[1] && r[1] !== '');

console.log(`Importing ${rows.length} rows...`);

const batch = writeBatch(db);
for (const r of rows) {
  const [no, requestDate, requester, category, detail, deadline, status, assignee, completedDate, duration, notes] = r;
  const docRef = doc(collection(db, 'assistant_requests'));
  batch.set(docRef, {
    fiscalYear: 8,
    no: Number(no),
    requestDate: toDateString(requestDate),
    requester,
    category,
    detail,
    deadline: toDateString(deadline, { janFebIsNextYear: true }),
    status: status || '未対応',
    assignee: assignee || '',
    completedDate: toDateString(completedDate),
    duration: duration || '',
    notes: notes || '',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });
}

await batch.commit();
console.log('Done.');
