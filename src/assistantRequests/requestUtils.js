// src/assistantRequests/requestUtils.js
import { dateStringToFiscalYear } from './fiscalYear.js';
import { DEFAULT_STATUS } from './constants.js';

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
