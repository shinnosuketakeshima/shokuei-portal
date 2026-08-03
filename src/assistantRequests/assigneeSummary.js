// src/assistantRequests/assigneeSummary.js
// Sheet1 相当の担当者別集計。依頼合計 = 担当者名の件数、
// 日割り = 合計 ÷ 期間の分割単位（年度=経過月数、月=その月の暦日数）。

const REIWA_EPOCH_YEAR = 2018;

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

function daysInMonth(year, month) {
  return new Date(year, month, 0).getDate();
}

/**
 * 年度単位の日割り除数 = その年度のうち「集計対象となる月数」。
 * 進行中の年度は 4月〜当月、過去年度は 12。
 */
export function fiscalYearDivisor(fiscalYear, now = new Date()) {
  const startYear = fiscalYearToCalendarStart(fiscalYear);
  const currentFy = (() => {
    const y = now.getFullYear();
    const m = now.getMonth() + 1;
    return (m >= 4 ? y : y - 1) - REIWA_EPOCH_YEAR;
  })();

  if (fiscalYear < currentFy) return 12;
  if (fiscalYear > currentFy) return 1;

  const month = now.getMonth() + 1;
  if (month >= 4) return month - 3; // 4→1 … 12→9
  return month + 9; // 1→10, 2→11, 3→12
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
  // month
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
 *   dailyAverages: number[],
 *   divisor: number,
 *   divisorLabel: string
 * }}
 */
export function buildAssigneeSummary(requests, { mode, fiscalYear, yearMonth, now = new Date() }) {
  const scoped = filterRequestsForPeriod(requests, mode, fiscalYear, yearMonth);

  const counts = new Map();
  for (const r of scoped) {
    const name = (r.assignee ?? '').trim();
    if (!name) continue;
    counts.set(name, (counts.get(name) ?? 0) + 1);
  }

  const names = [...counts.keys()].sort((a, b) => a.localeCompare(b, 'ja'));
  const totals = names.map((n) => counts.get(n));

  let divisor;
  let divisorLabel;
  if (mode === 'fiscalYear') {
    divisor = fiscalYearDivisor(fiscalYear, now);
    divisorLabel = `${divisor}ヶ月`;
  } else {
    divisor = daysInMonth(yearMonth.year, yearMonth.month);
    divisorLabel = `${divisor}日`;
  }

  const dailyAverages = totals.map((t) => (divisor > 0 ? t / divisor : 0));

  return { names, totals, dailyAverages, divisor, divisorLabel };
}

export function formatDailyAverage(value) {
  if (!Number.isFinite(value)) return '—';
  // Sheet1 同様、割り切れるときは整数、それ以外は小数1桁前後
  const rounded = Math.round(value * 10) / 10;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
}
