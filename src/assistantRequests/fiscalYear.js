const REIWA_EPOCH_YEAR = 2018; // calendar year - 2018 = 令和 year (令和1年 = 2019)

export function dateStringToFiscalYear(dateString) {
  const [yearStr, monthStr] = dateString.split('-');
  const year = Number(yearStr);
  const month = Number(monthStr);
  const fiscalStartYear = month >= 4 ? year : year - 1;
  return fiscalStartYear - REIWA_EPOCH_YEAR;
}

export function fiscalYearLabel(fiscalYear) {
  return `令和${fiscalYear}年度`;
}

export function currentFiscalYear(now = new Date()) {
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  return dateStringToFiscalYear(`${yyyy}-${mm}-${dd}`);
}
