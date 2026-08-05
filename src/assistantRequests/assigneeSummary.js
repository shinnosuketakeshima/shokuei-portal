// src/assistantRequests/assigneeSummary.js
// Sheet1 相当の担当者別集計。依頼合計 = 担当者名の件数、
// 日割り = 合計 ÷ その人の週あたり勤務日数。

const REIWA_EPOCH_YEAR = 2018;

/** 担当者別集計から除外する名前（依頼者枠・非個人カウントなど） */
const EXCLUDED_ASSIGNEE_NAMES = new Set(['九澤', '有期助手']);

/** 担当者列の表示順（左→右）。未登録名は末尾に五十音順で追加 */
const ASSIGNEE_DISPLAY_ORDER = [
  '鈴木歩美',
  '鈴木夏美',
  '清原',
  '寺西',
  '中村',
  '飯島',
  '板倉',
  '助手全員',
];
const ASSIGNEE_ORDER_INDEX = new Map(ASSIGNEE_DISPLAY_ORDER.map((name, i) => [name, i]));

/** 非常勤など、週あたり勤務日数が 5 未満の担当者 */
export const WORK_DAYS_BY_ASSIGNEE = {
  中村: 3,
  飯島: 2,
  板倉: 4
};

export const DEFAULT_WORK_DAYS = 5;

/**
 * 担当者名から週あたり勤務日数を返す。
 * 「中村先生」のように敬称が付いていても、先頭一致で非常勤設定を拾う。
 */
export function workDaysForAssignee(name) {
  const trimmed = (name ?? '').trim();
  if (!trimmed) return DEFAULT_WORK_DAYS;
  if (WORK_DAYS_BY_ASSIGNEE[trimmed] != null) return WORK_DAYS_BY_ASSIGNEE[trimmed];
  for (const [key, days] of Object.entries(WORK_DAYS_BY_ASSIGNEE)) {
    if (trimmed.startsWith(key)) return days;
  }
  return DEFAULT_WORK_DAYS;
}

/** 令和年度 → その年度の西暦開始年（令和8 → 2026） */
export function fiscalYearToCalendarStart(fiscalYear) {
  return fiscalYear + REIWA_EPOCH_YEAR;
}

/** 年度タブ用の月リスト（4月始まり） */
export function fiscalMonthOptions(fiscalYear) {
  const startYear = fiscalYearToCalendarStart(fiscalYear);
  const months = [];
  for (let m = 4; m <= 12; m++) {
    months.push({ year: startYear, month: m, label: `${m}月` });
  }
  for (let m = 1; m <= 3; m++) {
    months.push({ year: startYear + 1, month: m, label: `${m}月` });
  }
  return months;
}

function requestYearMonth(requestDate) {
  if (!requestDate || typeof requestDate !== 'string') return null;
  const [y, m] = requestDate.split('-').map(Number);
  if (!y || !m) return null;
  return { year: y, month: m };
}

function filterRequestsForPeriod(requests, mode, fiscalYear, yearMonth) {
  if (mode === 'fiscalYear') {
    return requests.filter((r) => r.fiscalYear === fiscalYear);
  }
  const { year, month } = yearMonth;
  return requests.filter((r) => {
    const ym = requestYearMonth(r.requestDate);
    return ym && ym.year === year && ym.month === month;
  });
}

/**
 * @returns {{
 *   names: string[],
 *   totals: number[],
 *   workDays: number[],
 *   dailyAverages: number[]
 * }}
 */
export function buildAssigneeSummary(requests, { mode, fiscalYear, yearMonth }) {
  const scoped = filterRequestsForPeriod(requests, mode, fiscalYear, yearMonth);

  const counts = new Map();
  for (const r of scoped) {
    const name = (r.assignee ?? '').trim();
    if (!name || EXCLUDED_ASSIGNEE_NAMES.has(name)) continue;
    counts.set(name, (counts.get(name) ?? 0) + 1);
  }

  const names = [...counts.keys()].sort((a, b) => {
    const ia = ASSIGNEE_ORDER_INDEX.has(a) ? ASSIGNEE_ORDER_INDEX.get(a) : Infinity;
    const ib = ASSIGNEE_ORDER_INDEX.has(b) ? ASSIGNEE_ORDER_INDEX.get(b) : Infinity;
    if (ia !== ib) return ia - ib;
    return a.localeCompare(b, 'ja');
  });
  const totals = names.map((n) => counts.get(n));
  const workDays = names.map((n) => workDaysForAssignee(n));
  const dailyAverages = totals.map((t, i) => (workDays[i] > 0 ? t / workDays[i] : 0));

  return { names, totals, workDays, dailyAverages };
}

export function formatDailyAverage(value) {
  if (!Number.isFinite(value)) return '—';
  // Sheet1 同様、割り切れるときは整数、それ以外は小数1桁
  const rounded = Math.round(value * 10) / 10;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
}
