'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Search,
  Filter,
  ArrowUpDown,
  BookOpen,
  Plus,
  Play,
  RotateCcw,
  Sparkles,
  Binary,
  Hash,
  Share2,
} from 'lucide-react';
import { api } from '@/lib/api';
import { Book, Category, SortResponse, HashSearchResponse, BSTSearchResponse } from '@/types';
import BookCover from '@/components/BookCover';
import BookDetailsModal from '@/components/BookDetailsModal';

export default function BooksPage() {
  const [books, setBooks] = useState<Book[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'title' | 'author' | 'year' | 'availability'>('title');
  const [sortAlgorithm, setSortAlgorithm] = useState<'quick' | 'insertion'>('quick');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [loading, setLoading] = useState(true);
  const [selectedBook, setSelectedBook] = useState<Book | null>(null);
  const [modalTab, setModalTab] = useState<'details' | 'borrowers'>('details');

  // Sorting animation states
  const [isSorting, setIsSorting] = useState(false);
  const [sortMeta, setSortMeta] = useState<SortResponse | null>(null);

  // Technical Search Visualizations Modal
  const [hashTrace, setHashTrace] = useState<HashSearchResponse | null>(null);
  const [bstTrace, setBstTrace] = useState<BSTSearchResponse | null>(null);
  const [technicalModal, setTechnicalModal] = useState<'hash' | 'bst' | null>(null);

  const fetchBooks = async () => {
    try {
      setLoading(true);
      const res = await api.getBooks({
        page_size: 48,
        category: selectedCategory === 'all' ? undefined : selectedCategory,
        q: searchQuery || undefined,
        sort: sortBy,
        order: sortOrder,
      });
      setBooks(res.items);
    } catch (err) {
      console.error('Failed to load books', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    api.getCategories().then(setCategories).catch(console.error);
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchBooks();
    }, 250);
    return () => clearTimeout(timer);
  }, [selectedCategory, searchQuery, sortBy, sortOrder]);

  // Animated sorting execution
  const handleExecuteSort = async () => {
    if (books.length === 0 || isSorting) return;
    setIsSorting(true);
    try {
      const bookIds = books.map((b) => b.id);
      const res = await api.sortBooks({
        book_ids: bookIds,
        key: sortBy,
        algorithm: sortAlgorithm,
        order: sortOrder,
      });
      setSortMeta(res);

      // Animate through each sorting snapshot step
      const steps = res.steps;
      for (let i = 0; i < steps.length; i++) {
        const stepIds = steps[i];
        setBooks((prev) => {
          const map = new Map(prev.map((b) => [b.id, b]));
          return stepIds.map((id) => map.get(id)!).filter(Boolean);
        });
        // Small delay to make the card rearrangement visually delightful
        await new Promise((r) => setTimeout(r, Math.max(30, 800 / steps.length)));
      }
    } catch (err) {
      console.error('Sorting failed', err);
    } finally {
      setIsSorting(false);
    }
  };

  // Inspect ISBN via Hash Table
  const handleInspectHash = async (isbn: string) => {
    try {
      const res = await api.searchByISBN(isbn);
      setHashTrace(res);
      setTechnicalModal('hash');
    } catch (err) {
      console.error(err);
    }
  };

  // Inspect Title via BST
  const handleInspectBST = async (title: string) => {
    try {
      const res = await api.searchByTitleBST(title);
      setBstTrace(res);
      setTechnicalModal('bst');
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-300">
      {/* Editorial Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-4 border-b border-[var(--border)]">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 text-xs font-semibold mb-3">
            <Sparkles className="w-3.5 h-3.5" /> Interactive Bookshelf & Motion Engine
          </div>
          <h1 className="text-3xl md:text-5xl font-black tracking-tight text-[var(--text-primary)]">
            Explore the Collection
          </h1>
          <p className="mt-2 text-sm text-[var(--text-secondary)]">
            Browse through computer science classics, operating systems, and algorithms.
          </p>
        </div>

        {/* Technical quick inspection triggers */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => handleInspectHash(books[0]?.isbn || '9780131103627')}
            className="px-3.5 py-2 rounded-xl bg-[var(--surface)] border border-[var(--border)] hover:border-blue-500/40 text-xs font-semibold text-[var(--text-primary)] flex items-center gap-1.5 transition-all shadow-xs"
          >
            <Hash className="w-3.5 h-3.5 text-blue-500" />
            <span>Hash Table Trace</span>
          </button>
          <button
            onClick={() => handleInspectBST(books[0]?.title || 'Clean Code')}
            className="px-3.5 py-2 rounded-xl bg-[var(--surface)] border border-[var(--border)] hover:border-blue-500/40 text-xs font-semibold text-[var(--text-primary)] flex items-center gap-1.5 transition-all shadow-xs"
          >
            <Binary className="w-3.5 h-3.5 text-emerald-500" />
            <span>BST Search Trace</span>
          </button>
        </div>
      </div>

      {/* Control Bar: Filters, Search, Sorting Engine */}
      <div className="space-y-4">
        {/* Categories Bar */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
          <button
            onClick={() => setSelectedCategory('all')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
              selectedCategory === 'all'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                : 'bg-[var(--surface)] text-[var(--text-secondary)] border border-[var(--border)] hover:text-[var(--text-primary)]'
            }`}
          >
            All Categories
          </button>
          {categories.map((c) => (
            <button
              key={c.slug}
              onClick={() => setSelectedCategory(c.slug)}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                selectedCategory === c.slug
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                  : 'bg-[var(--surface)] text-[var(--text-secondary)] border border-[var(--border)] hover:text-[var(--text-primary)]'
              }`}
            >
              {c.name}
            </button>
          ))}
        </div>

        {/* Search, Sort and Algorithm Selector Toolbar */}
        <div className="p-4 rounded-2xl bg-[var(--surface)] border border-[var(--border)] shadow-xs flex flex-wrap items-center justify-between gap-4">
          {/* Real-time Search input */}
          <div className="relative flex-1 min-w-[240px]">
            <Search className="w-4 h-4 text-[var(--text-secondary)] absolute left-3.5 top-3 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by title, author, or ISBN..."
              className="w-full pl-10 pr-4 py-2 rounded-xl bg-[var(--surface-secondary)] text-xs text-[var(--text-primary)] border border-transparent focus:border-blue-500/40 outline-none"
            />
          </div>

          {/* Sort Key Selector */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-[var(--text-secondary)] font-medium">Sort by:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="px-3 py-1.5 rounded-xl bg-[var(--surface-secondary)] text-xs font-semibold text-[var(--text-primary)] border border-[var(--border)] outline-none"
            >
              <option value="title">Title</option>
              <option value="author">Author</option>
              <option value="year">Year</option>
              <option value="availability">Availability</option>
            </select>
          </div>

          {/* Algorithm Choice */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-[var(--text-secondary)] font-medium">Algorithm:</span>
            <div className="inline-flex rounded-xl bg-[var(--surface-secondary)] p-1 border border-[var(--border)]">
              <button
                onClick={() => setSortAlgorithm('quick')}
                className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all ${
                  sortAlgorithm === 'quick' ? 'bg-blue-600 text-white shadow-xs' : 'text-[var(--text-secondary)]'
                }`}
              >
                Quick Sort (O(n log n))
              </button>
              <button
                onClick={() => setSortAlgorithm('insertion')}
                className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all ${
                  sortAlgorithm === 'insertion' ? 'bg-blue-600 text-white shadow-xs' : 'text-[var(--text-secondary)]'
                }`}
              >
                Insertion Sort (O(n²))
              </button>
            </div>
          </div>

          {/* Animate Sort Button */}
          <button
            onClick={handleExecuteSort}
            disabled={isSorting}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 text-white text-xs font-bold flex items-center gap-2 shadow-md shadow-blue-500/25 transition-all"
          >
            <Play className={`w-3.5 h-3.5 ${isSorting ? 'animate-spin' : ''}`} />
            <span>{isSorting ? 'Sorting Cards...' : 'Run Animated Sort'}</span>
          </button>
        </div>

        {/* Sorting Complexity Info Badge */}
        {sortMeta && (
          <div className="p-3.5 rounded-xl bg-blue-500/10 border border-blue-500/20 flex flex-wrap items-center justify-between text-xs text-blue-600 dark:text-blue-400 gap-4">
            <div>
              <strong>{sortMeta.algorithm.name}:</strong> {sortMeta.comparisons} comparisons, {sortMeta.moves} swaps/shifts executed in {sortMeta.elapsed_ms}ms.
            </div>
            <div className="font-mono text-[11px] space-x-3">
              <span>Avg: {sortMeta.algorithm.average}</span>
              <span>Worst: {sortMeta.algorithm.worst}</span>
              <span>Space: {sortMeta.algorithm.space}</span>
            </div>
          </div>
        )}
      </div>

      {/* Cinematic Scroll-Driven Book Grid */}
      <motion.div
        layout
        className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-6"
      >
        <AnimatePresence mode="popLayout">
          {books.map((book) => (
            <motion.div
              key={book.id}
              layout
              layoutId={`book-card-${book.id}`}
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.8 }}
              whileHover={{ scale: 1.05, y: -8 }}
              transition={{
                layout: { type: 'spring', damping: 25, stiffness: 300 },
                scale: { duration: 0.2 },
              }}
              onClick={() => {
                setSelectedBook(book);
                setModalTab('details');
              }}
              className="group cursor-pointer flex flex-col items-center text-center p-3 rounded-2xl bg-[var(--surface)] border border-[var(--border)] hover:border-blue-500/40 hover:shadow-2xl transition-all"
            >
              {/* Photorealistic 3D cover */}
              <div className="relative mb-3">
                <BookCover
                  title={book.title}
                  author={book.author}
                  categorySlug={book.category.slug}
                  size="md"
                />
                <span
                  className={`absolute top-2 right-2 text-[9px] font-bold px-2 py-0.5 rounded-full backdrop-blur-md ${
                    book.available_copies > 0
                      ? 'bg-emerald-500/80 text-white'
                      : 'bg-rose-500/80 text-white'
                  }`}
                >
                  {book.available_copies > 0 ? `${book.available_copies} left` : 'Waitlist'}
                </span>
              </div>

              {/* Title & Author */}
              <h3 className="w-full text-xs font-bold text-[var(--text-primary)] group-hover:text-blue-500 transition-colors line-clamp-1">
                {book.title}
              </h3>
              <p className="w-full text-[11px] text-[var(--text-secondary)] line-clamp-1 mt-0.5">
                {book.author}
              </p>

              {/* Year & ISBN */}
              <div className="mt-2 pt-2 w-full border-t border-[var(--border)] flex items-center justify-between text-[10px] text-[var(--text-secondary)]">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedBook(book);
                    setModalTab('borrowers');
                  }}
                  className="font-semibold text-blue-500 hover:text-blue-600 dark:hover:text-blue-400 hover:underline cursor-pointer"
                  title="Click to view which members have this book"
                >
                  {book.total_copies - book.available_copies > 0
                    ? `${book.total_copies - book.available_copies} on loan`
                    : 'All in library'}
                </button>
                <span className="font-mono text-[9px]">#{book.isbn.slice(-4)}</span>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </motion.div>

      {/* Selected Book Modal with Shared Layout Transition */}
      <AnimatePresence>
        {selectedBook && (
          <BookDetailsModal
            book={selectedBook}
            initialTab={modalTab}
            onClose={() => setSelectedBook(null)}
            onRefresh={fetchBooks}
          />
        )}
      </AnimatePresence>

      {/* Technical Modal: Hash Table Trace */}
      {technicalModal === 'hash' && hashTrace && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
          <div className="w-full max-w-2xl bg-[var(--surface)] border border-[var(--border)] rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
              <div>
                <h3 className="text-base font-extrabold text-[var(--text-primary)]">
                  Hash Table ISBN Lookup Trace
                </h3>
                <p className="text-xs text-[var(--text-secondary)]">
                  Algorithm: djb2 (h = h * 33 + c) mod capacity
                </p>
              </div>
              <button
                onClick={() => setTechnicalModal(null)}
                className="text-xs font-bold px-3 py-1.5 rounded-lg bg-[var(--surface-secondary)]"
              >
                Close
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 bg-[var(--surface-secondary)] rounded-xl">
                <span className="text-[var(--text-secondary)] block">Target ISBN:</span>
                <span className="font-mono font-bold text-blue-500">{hashTrace.isbn}</span>
              </div>
              <div className="p-3 bg-[var(--surface-secondary)] rounded-xl">
                <span className="text-[var(--text-secondary)] block">Calculated Bucket:</span>
                <span className="font-mono font-bold text-emerald-500">
                  Bucket #{hashTrace.bucket} (of {hashTrace.capacity})
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <h4 className="text-xs font-bold text-[var(--text-primary)]">Separate Chaining Walk:</h4>
              <div className="space-y-2">
                {hashTrace.chain.map((item, idx) => (
                  <div
                    key={idx}
                    className={`p-3 rounded-xl border flex items-center justify-between text-xs ${
                      item.isbn === hashTrace.isbn
                        ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-500 font-bold'
                        : 'bg-[var(--surface-secondary)] border-[var(--border)] text-[var(--text-secondary)]'
                    }`}
                  >
                    <span>
                      Node #{idx + 1}: ISBN {item.isbn} ({item.title})
                    </span>
                    <span>{item.isbn === hashTrace.isbn ? 'FOUND (Match)' : 'Chain Collision'}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-3 rounded-xl bg-blue-500/10 text-blue-400 text-xs font-mono">
              Average Lookup: O(1) · Comparisons: {hashTrace.comparisons}
            </div>
          </div>
        </div>
      )}

      {/* Technical Modal: BST Trace */}
      {technicalModal === 'bst' && bstTrace && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
          <div className="w-full max-w-2xl bg-[var(--surface)] border border-[var(--border)] rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
              <div>
                <h3 className="text-base font-extrabold text-[var(--text-primary)]">
                  Binary Search Tree Title Lookup Trace
                </h3>
                <p className="text-xs text-[var(--text-secondary)]">
                  Alphabetical In-Order Title Nodes
                </p>
              </div>
              <button
                onClick={() => setTechnicalModal(null)}
                className="text-xs font-bold px-3 py-1.5 rounded-lg bg-[var(--surface-secondary)]"
              >
                Close
              </button>
            </div>

            <div className="grid grid-cols-3 gap-3 text-xs">
              <div className="p-3 bg-[var(--surface-secondary)] rounded-xl">
                <span className="text-[var(--text-secondary)] block">Query:</span>
                <span className="font-bold text-blue-500">{bstTrace.query}</span>
              </div>
              <div className="p-3 bg-[var(--surface-secondary)] rounded-xl">
                <span className="text-[var(--text-secondary)] block">Tree Height:</span>
                <span className="font-bold">{bstTrace.tree_height} levels</span>
              </div>
              <div className="p-3 bg-[var(--surface-secondary)] rounded-xl">
                <span className="text-[var(--text-secondary)] block">Comparisons:</span>
                <span className="font-bold text-emerald-500">{bstTrace.comparisons}</span>
              </div>
            </div>

            <div className="space-y-2">
              <h4 className="text-xs font-bold text-[var(--text-primary)]">Visited Path from Root:</h4>
              <div className="space-y-1.5">
                {bstTrace.path.map((step, idx) => (
                  <div
                    key={idx}
                    className={`p-2.5 rounded-xl border flex items-center justify-between text-xs ${
                      step.direction === 'found'
                        ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-500 font-bold'
                        : 'bg-[var(--surface-secondary)] border-[var(--border)] text-[var(--text-secondary)]'
                    }`}
                  >
                    <span>
                      Level {idx}: &quot;{step.title}&quot;
                    </span>
                    <span className="font-mono uppercase text-[10px]">
                      {step.direction === 'found' ? '✓ MATCH FOUND' : `Traverse ${step.direction}`}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
