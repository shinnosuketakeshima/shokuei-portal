export function emptyFilters() {
  return {
    requestDateStart: '',
    requestDateEnd: '',
    deadlineStart: '',
    deadlineEnd: '',
    status: '',
    category: '',
    requester: '',
    assignee: '',
    keyword: ''
  };
}

export function filterRequests(requests, filters) {
  return requests.filter((r) => {
    if (filters.requestDateStart && r.requestDate < filters.requestDateStart) return false;
    if (filters.requestDateEnd && r.requestDate > filters.requestDateEnd) return false;
    if (filters.deadlineStart && r.deadline < filters.deadlineStart) return false;
    if (filters.deadlineEnd && r.deadline > filters.deadlineEnd) return false;
    if (filters.status && r.status !== filters.status) return false;
    if (filters.category && r.category !== filters.category) return false;
    if (filters.requester && !(r.requester ?? '').includes(filters.requester)) return false;
    if (filters.assignee && !(r.assignee ?? '').includes(filters.assignee)) return false;
    if (filters.keyword) {
      const haystack = `${r.detail ?? ''} ${r.notes ?? ''}`;
      if (!haystack.includes(filters.keyword)) return false;
    }
    return true;
  });
}
