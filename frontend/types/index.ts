export interface Category {
  id: number;
  name: string;
  slug: string;
  book_count?: number;
}

export interface Book {
  id: number;
  isbn: string;
  title: string;
  author: string;
  category: Category;
  publication_year: number;
  description: string;
  total_copies: number;
  available_copies: number;
  rating: number;
  waiting_count: number;
  status: 'available' | 'limited' | 'unavailable';
  created_at: string;
}

export interface PageResponse<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
  pages: number;
}

export interface SearchSuggestion {
  id: number;
  title: string;
  author: string;
  isbn: string;
  category: string;
  available_copies: number;
  match: 'title' | 'author' | 'isbn';
}

export interface SearchResponse {
  query: string;
  total: number;
  method: string;
  suggestions: SearchSuggestion[];
}

export interface HashSearchChainItem {
  isbn: string;
  book_id: number | null;
  title: string;
  visited: boolean;
}

export interface HashSearchResponse {
  isbn: string;
  hash_value: number;
  hash_function: string;
  capacity: number;
  bucket: number;
  chain: HashSearchChainItem[];
  comparisons: number;
  found: boolean;
  book: Book | null;
  complexity: string;
}

export interface BSTSearchStep {
  title: string;
  book_id: number;
  direction: 'left' | 'right' | 'found';
}

export interface BSTSearchResponse {
  query: string;
  found: boolean;
  comparisons: number;
  path: BSTSearchStep[];
  tree_height: number;
  node_count: number;
  book: Book | null;
  complexity: string;
}

export interface SortResponse {
  algorithm: {
    name: string;
    best: string;
    average: string;
    worst: string;
    space: string;
    stable: string;
    description: string;
  };
  key: string;
  order: string;
  comparisons: number;
  moves: number;
  steps: number[][];
  sorted_ids: number[];
  elapsed_ms: number;
}

export interface Member {
  id: number;
  member_code: string;
  name: string;
  email: string;
  phone: string;
  joined_at: string;
  active: boolean;
  active_issues: number;
  total_borrowed: number;
  waiting_count: number;
}

export interface CsvImportResult {
  total_rows: number;
  registered: number;
  skipped: number;
  errors: string[];
  members: Member[];
}

export interface BookBorrower {
  member_id: number;
  member_code: string;
  name: string;
  email: string;
  phone: string;
  issue_id: number;
  issued_at: string;
  due_at: string;
  overdue: boolean;
  status: string;
}

export interface Issue {
  id: number;
  book: {
    id: number;
    title: string;
    author: string;
    isbn: string;
  };
  member: {
    id: number;
    name: string;
    member_code: string;
  };
  issued_at: string;
  due_at: string;
  returned_at: string | null;
  status: 'active' | 'returned';
  overdue: boolean;
  via_waitlist: boolean;
}

export interface WaitingListEntry {
  id: number;
  position: number;
  member: {
    id: number;
    name: string;
    member_code: string;
  };
  created_at: string;
}

export interface WaitingListDetails {
  book: {
    id: number;
    title: string;
    author: string;
    isbn: string;
  };
  available_copies: number;
  total_copies: number;
  queue: WaitingListEntry[];
  front: WaitingListEntry | null;
  rear: WaitingListEntry | null;
}

export interface WaitingSummary {
  book: {
    id: number;
    title: string;
    author: string;
    isbn: string;
  };
  queue_size: number;
  next_member: {
    id: number;
    name: string;
    member_code: string;
  } | null;
  available_copies: number;
}

export interface GraphNode {
  id: number;
  title: string;
  author: string;
  category: string;
  degree: number;
}

export interface GraphEdge {
  source: number;
  target: number;
  weight: number;
  reason: string;
}

export interface GraphResponse {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export interface RecommendationItem {
  book: Book;
  score: number;
  distance: number;
  path: number[];
  reason: string;
}

export interface RecommendationResponse {
  book: Book;
  recommendations: RecommendationItem[];
  neighbors: number[];
  bfs_order: number[];
  algorithm: string;
}

export interface ActivityItem {
  id: number;
  kind: string;
  message: string;
  member: string | null;
  book: string | null;
  at: string;
}

export interface AnalyticsResponse {
  totals: {
    titles: number;
    copies: number;
    available: number;
    issued: number;
    overdue: number;
    members: number;
    waiting: number;
    waiting_books: number;
  };
  categories: {
    name: string;
    slug: string;
    books: number;
    copies: number;
  }[];
  monthly: {
    month: string;
    key: string;
    issues: number;
    returns: number;
  }[];
  daily: {
    date: string;
    label: string;
    issued: number;
    returned: number;
  }[];
  top_authors: {
    author: string;
    issues: number;
  }[];
  top_books: {
    id: number;
    title: string;
    author: string;
    issues: number;
  }[];
  top_members: {
    id: number;
    name: string;
    member_code: string;
    issues: number;
  }[];
  category_popularity: {
    name: string;
    issues: number;
  }[];
  longest_waiting: {
    id: number;
    title: string;
    queue: number;
  }[];
  highlights: {
    most_issued_book: { id: number; title: string; author: string; issues: number } | null;
    most_active_member: { id: number; name: string; member_code: string; issues: number } | null;
    most_popular_category: { name: string; issues: number } | null;
    longest_waiting_list: { id: number; title: string; queue: number } | null;
  };
  generated_at: string;
}

export interface DSStatusResponse {
  hash_table: {
    size: number;
    capacity: number;
    load_factor: number;
    collisions: number;
    longest_chain: number;
    empty_buckets: number;
    hash_function: string;
  };
  bst: {
    nodes: number;
    height: number;
    root: string | null;
  };
  graph: {
    vertices: number;
    edges: number;
  };
  stack: {
    size: number;
    capacity: number;
    top: { issue_id: number; member: string; book: string }[];
  };
  queues: {
    books_with_queue: number;
    total_waiting: number;
  };
  linked_list: {
    size: number;
    head: { kind: string; message: string; member: string | null }[];
  };
}
