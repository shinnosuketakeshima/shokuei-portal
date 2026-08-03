// src/assistantRequests/requestUtils.js
import { dateStringToFiscalYear } from './fiscalYear.js';
import { DEFAULT_STATUS } from './constants.js';

// 「依頼は締切日の1週間前までに出す」という運用ルール。これを下回る依頼は
// 警告を出すだけで、登録自体はブロックしない（急ぎの依頼を止めないため）。
export const REQUIRED_LEAD_DAYS = 7;

// 依頼日から締切日までの日数。どちらかが未入力・不正なら null。
export function leadTimeDays(requestDate, deadline) {
  if (!requestDate || !deadline) return null;
  // 'YYYY-MM-DD' をそのまま Date に渡すと UTC 深夜と解釈され、日本時間では
  // 前日にずれることがあるため、明示的にローカル時刻として解釈させる。
  const start = new Date(`${requestDate}T00:00:00`);
  const end = new Date(`${deadline}T00:00:00`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return null;
  return Math.round((end - start) / 86400000);
}

export function isShortLeadTime(requestDate, deadline) {
  const days = leadTimeDays(requestDate, deadline);
  return days !== null && days < REQUIRED_LEAD_DAYS;
}

export function computeNextNo(existingRequests, fiscalYear) {
  const nosInYear = existingRequests
    .filter((r) => r.fiscalYear === fiscalYear)
    .map((r) => r.no);
  return nosInYear.length > 0 ? Math.max(...nosInYear) + 1 : 1;
}

export function buildNewRequestFields(formValues, existingRequests) {
  const fiscalYear = dateStringToFiscalYear(formValues.requestDate);
  const no = computeNextNo(existingRequests, fiscalYear);
  return {
    fiscalYear,
    no,
    requestDate: formValues.requestDate,
    requester: formValues.requester,
    category: formValues.category,
    detail: formValues.detail,
    deadline: formValues.deadline,
    status: DEFAULT_STATUS,
    assignee: '',
    completedDate: '',
    duration: '',
    notes: ''
  };
}
