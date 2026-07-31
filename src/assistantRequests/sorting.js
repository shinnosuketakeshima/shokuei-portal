import { STATUSES } from './constants.js';

// Keep these sets/maps in sync with the COLUMNS list in AssistantRequestTable.jsx
// (every sortable column key must be classified here) and, for the numeric/date
// distinction specifically, with the corresponding field types in the Firestore
// document shape — an unclassified field silently falls back to string comparison
// instead of erroring.
const NUMERIC_KEYS = new Set(['no']);
const DATE_KEYS = new Set(['requestDate', 'deadline', 'completedDate']);
// Fields sorted by workflow order rather than string order (e.g. 受託状況 should
// sort 未対応→受託中→完了, not alphabetically).
const ORDINAL_KEYS = { status: STATUSES };

function isEmpty(value) {
  return value === '' || value === undefined || value === null;
}

function compareValues(va, vb, key) {
  if (NUMERIC_KEYS.has(key)) return va - vb;
  if (DATE_KEYS.has(key)) return va < vb ? -1 : va > vb ? 1 : 0;
  if (key in ORDINAL_KEYS) return ORDINAL_KEYS[key].indexOf(va) - ORDINAL_KEYS[key].indexOf(vb);
  return String(va).localeCompare(String(vb), 'ja');
}

export function sortRequests(requests, sortKey, sortDirection) {
  const directionMultiplier = sortDirection === 'desc' ? -1 : 1;
  return [...requests].sort((a, b) => {
    const va = a[sortKey];
    const vb = b[sortKey];
    const aEmpty = isEmpty(va);
    const bEmpty = isEmpty(vb);
    if (aEmpty && bEmpty) return a.no - b.no;
    if (aEmpty) return 1;
    if (bEmpty) return -1;
    const primary = compareValues(va, vb, sortKey) * directionMultiplier;
    return primary !== 0 ? primary : a.no - b.no;
  });
}
