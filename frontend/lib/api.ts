const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let errMessage = 'An error occurred';
    try {
      const errData = await res.json();
      errMessage = errData.detail || errData.message || JSON.stringify(errData);
    } catch {
      errMessage = res.statusText || `Request failed with status ${res.status}`;
    }
    throw new Error(errMessage);
  }
  if (res.status === 204) {
    return {} as T;
  }
  return res.json();
}

export const api = {
  // Books
  getBooks: async (params?: {
    page?: number;
    page_size?: number;
    category?: string;
    q?: string;
    sort?: string;
    order?: string;
    available_only?: boolean;
  }) => {
    const searchParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, val]) => {
        if (val !== undefined && val !== null && val !== '') {
          searchParams.append(key, String(val));
        }
      });
    }
    const res = await fetch(`${API_BASE}/books?${searchParams.toString()}`);
    return handleResponse<import('@/types').PageResponse<import('@/types').Book>>(res);
  },

  getBook: async (id: number) => {
    const res = await fetch(`${API_BASE}/books/${id}`);
    return handleResponse<import('@/types').Book>(res);
  },

  getCategories: async () => {
    const res = await fetch(`${API_BASE}/categories`);
    return handleResponse<import('@/types').Category[]>(res);
  },

  createBook: async (data: {
    isbn: string;
    title: string;
    author: string;
    category_id: number;
    publication_year: number;
    description: string;
    total_copies: number;
  }) => {
    const res = await fetch(`${API_BASE}/books`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return handleResponse<import('@/types').Book>(res);
  },

  updateBook: async (
    id: number,
    data: {
      isbn: string;
      title: string;
      author: string;
      category_id: number;
      publication_year: number;
      description: string;
      total_copies: number;
    }
  ) => {
    const res = await fetch(`${API_BASE}/books/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return handleResponse<import('@/types').Book>(res);
  },

  deleteBook: async (id: number) => {
    const res = await fetch(`${API_BASE}/books/${id}`, { method: 'DELETE' });
    return handleResponse<void>(res);
  },

  searchBooks: async (q: string, limit = 8) => {
    const res = await fetch(`${API_BASE}/books/search?q=${encodeURIComponent(q)}&limit=${limit}`);
    return handleResponse<import('@/types').SearchResponse>(res);
  },

  searchByISBN: async (isbn: string) => {
    const res = await fetch(`${API_BASE}/books/isbn/${encodeURIComponent(isbn)}`);
    return handleResponse<import('@/types').HashSearchResponse>(res);
  },

  searchByTitleBST: async (title: string) => {
    const res = await fetch(`${API_BASE}/books/title/${encodeURIComponent(title)}`);
    return handleResponse<import('@/types').BSTSearchResponse>(res);
  },

  sortBooks: async (data: {
    book_ids: number[];
    key: 'title' | 'author' | 'year' | 'availability';
    algorithm: 'insertion' | 'quick';
    order: 'asc' | 'desc';
  }) => {
    const res = await fetch(`${API_BASE}/books/sort`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return handleResponse<import('@/types').SortResponse>(res);
  },

  getRelatedBooks: async (id: number, limit = 10) => {
    const res = await fetch(`${API_BASE}/books/${id}/related?limit=${limit}`);
    return handleResponse<import('@/types').Book[]>(res);
  },

  getBookBorrowers: async (id: number) => {
    const res = await fetch(`${API_BASE}/books/${id}/borrowers`);
    return handleResponse<import('@/types').BookBorrower[]>(res);
  },

  // Members
  importMembersCsv: async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    const res = await fetch(`${API_BASE}/members/import-csv`, {
      method: 'POST',
      body: formData,
    });
    return handleResponse<import('@/types').CsvImportResult>(res);
  },

  getMembers: async (params?: { page?: number; page_size?: number; q?: string }) => {
    const searchParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, val]) => {
        if (val !== undefined && val !== null && val !== '') {
          searchParams.append(key, String(val));
        }
      });
    }
    const res = await fetch(`${API_BASE}/members?${searchParams.toString()}`);
    return handleResponse<import('@/types').PageResponse<import('@/types').Member>>(res);
  },

  getMember: async (id: number) => {
    const res = await fetch(`${API_BASE}/members/${id}`);
    return handleResponse<{
      member: import('@/types').Member;
      current: import('@/types').Issue[];
      history: import('@/types').Issue[];
      waiting: {
        book_id: number;
        title: string;
        author: string;
        position: number;
        queue_size: number;
        joined_at: string | null;
      }[];
    }>(res);
  },

  createMember: async (data: { name: string; email: string; phone: string }) => {
    const res = await fetch(`${API_BASE}/members`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return handleResponse<import('@/types').Member>(res);
  },

  updateMember: async (
    id: number,
    data: { name: string; email: string; phone: string; active: boolean }
  ) => {
    const res = await fetch(`${API_BASE}/members/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return handleResponse<import('@/types').Member>(res);
  },

  deleteMember: async (id: number) => {
    const res = await fetch(`${API_BASE}/members/${id}`, { method: 'DELETE' });
    return handleResponse<void>(res);
  },

  // Circulation / Issues
  getIssues: async (params?: { status?: string; member_id?: number; book_id?: number; limit?: number }) => {
    const searchParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, val]) => {
        if (val !== undefined && val !== null && val !== '') {
          searchParams.append(key, String(val));
        }
      });
    }
    const res = await fetch(`${API_BASE}/issues?${searchParams.toString()}`);
    return handleResponse<import('@/types').Issue[]>(res);
  },

  issueBook: async (data: { book_id: number; member_id: number }) => {
    const res = await fetch(`${API_BASE}/issues`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return handleResponse<import('@/types').Issue>(res);
  },

  peekUndo: async () => {
    const res = await fetch(`${API_BASE}/issues/undo`);
    return handleResponse<{ issue: import('@/types').Issue; stack_size: number }>(res);
  },

  undoLastIssue: async () => {
    const res = await fetch(`${API_BASE}/issues/undo`, { method: 'POST' });
    return handleResponse<{ undone: import('@/types').Issue; stack_size: number; message: string }>(res);
  },

  returnBook: async (data: { issue_id?: number; book_id?: number; member_id?: number }) => {
    const res = await fetch(`${API_BASE}/returns`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return handleResponse<{
      issue: import('@/types').Issue;
      next_in_queue: import('@/types').Issue | null;
      message: string;
    }>(res);
  },

  // Waiting List
  getWaitingSummaries: async () => {
    const res = await fetch(`${API_BASE}/waiting-list`);
    return handleResponse<import('@/types').WaitingSummary[]>(res);
  },

  getWaitingList: async (bookId: number) => {
    const res = await fetch(`${API_BASE}/waiting-list/${bookId}`);
    return handleResponse<import('@/types').WaitingListDetails>(res);
  },

  joinWaitingList: async (bookId: number, memberId: number) => {
    const res = await fetch(`${API_BASE}/waiting-list/${bookId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ member_id: memberId }),
    });
    return handleResponse<import('@/types').WaitingListDetails>(res);
  },

  leaveWaitingList: async (bookId: number, memberId?: number) => {
    const url = memberId !== undefined ? `${API_BASE}/waiting-list/${bookId}?member_id=${memberId}` : `${API_BASE}/waiting-list/${bookId}`;
    const res = await fetch(url, { method: 'DELETE' });
    return handleResponse<import('@/types').WaitingListDetails>(res);
  },

  // Recommendations & Graph
  getRecommendations: async (bookId: number, limit = 6) => {
    const res = await fetch(`${API_BASE}/recommendations/${bookId}?limit=${limit}`);
    return handleResponse<import('@/types').RecommendationResponse>(res);
  },

  getRecommendationGraph: async () => {
    const res = await fetch(`${API_BASE}/recommendations/graph`);
    return handleResponse<import('@/types').GraphResponse>(res);
  },

  // Analytics & Reports
  getAnalytics: async () => {
    const res = await fetch(`${API_BASE}/analytics`);
    return handleResponse<import('@/types').AnalyticsResponse>(res);
  },

  getActivity: async (limit = 15) => {
    const res = await fetch(`${API_BASE}/activity?limit=${limit}`);
    return handleResponse<import('@/types').ActivityItem[]>(res);
  },

  getExportReportUrl: () => `${API_BASE}/reports/export`,

  // Data Structures Playground & Status
  getDSStatus: async () => {
    const res = await fetch(`${API_BASE}/data-structures/status`);
    return handleResponse<import('@/types').DSStatusResponse>(res);
  },

  getHashTableDetail: async () => {
    const res = await fetch(`${API_BASE}/data-structures/hash-table`);
    return handleResponse<{
      capacity: number;
      size: number;
      load_factor: number;
      buckets: {
        index: number;
        entries: { isbn: string; book_id: number; title: string }[];
      }[];
    }>(res);
  },

  getBSTDetail: async () => {
    const res = await fetch(`${API_BASE}/data-structures/bst`);
    return handleResponse<{
      root: any;
      height: number;
      nodes: number;
    }>(res);
  },

  getPlaygroundState: async (structure: 'list' | 'stack' | 'queue') => {
    const res = await fetch(`${API_BASE}/data-structures/playground/${structure}`);
    return handleResponse<{
      structure: string;
      state: string[];
      complexity: Record<string, string>;
    }>(res);
  },

  runPlaygroundOp: async (
    structure: 'list' | 'stack' | 'queue',
    op: string,
    value?: string,
    index?: number
  ) => {
    const res = await fetch(`${API_BASE}/data-structures/playground/${structure}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ op, value, index }),
    });
    return handleResponse<{
      structure: string;
      op: string;
      result: string | null;
      state: string[];
      message: string;
      complexity: string;
    }>(res);
  },
};
