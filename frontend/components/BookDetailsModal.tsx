'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  BookOpen,
  Calendar,
  Layers,
  Sparkles,
  ArrowRight,
  Share2,
  Clock,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  Hash,
} from 'lucide-react';
import { Book, Member, BookBorrower } from '@/types';
import BookCover from '@/components/BookCover';
import { api } from '@/lib/api';

interface BookModalProps {
  book: Book;
  initialTab?: 'details' | 'borrowers' | 'issue' | 'waitlist' | 'related';
  onClose: () => void;
  onRefresh: () => void;
}

export default function BookDetailsModal({ book, initialTab = 'details', onClose, onRefresh }: BookModalProps) {
  const [activeTab, setActiveTab] = useState<'details' | 'borrowers' | 'issue' | 'waitlist' | 'related'>(initialTab);
  const [members, setMembers] = useState<Member[]>([]);
  const [selectedMemberId, setSelectedMemberId] = useState<number | null>(null);
  const [relatedBooks, setRelatedBooks] = useState<Book[]>([]);
  const [borrowers, setBorrowers] = useState<BookBorrower[]>([]);
  const [loadingBorrowers, setLoadingBorrowers] = useState(false);
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    // Load members for issue flow
    api.getMembers({ page_size: 50 }).then((res) => setMembers(res.items)).catch(console.error);
    // Load related books via graph BFS
    api.getRelatedBooks(book.id, 4).then(setRelatedBooks).catch(console.error);
    // Load current borrowers who have this book
    setLoadingBorrowers(true);
    api.getBookBorrowers(book.id)
      .then(setBorrowers)
      .catch(console.error)
      .finally(() => setLoadingBorrowers(false));
  }, [book.id]);

  const handleIssue = async () => {
    if (!selectedMemberId) {
      setFeedback({ type: 'error', message: 'Please select a member first.' });
      return;
    }
    setLoading(true);
    try {
      await api.issueBook({ book_id: book.id, member_id: selectedMemberId });
      setFeedback({ type: 'success', message: 'Book issued successfully! Operation pushed to Undo Stack.' });
      onRefresh();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Failed to issue book' });
    } finally {
      setLoading(false);
    }
  };

  const handleJoinWaitlist = async () => {
    if (!selectedMemberId) {
      setFeedback({ type: 'error', message: 'Please select a member first.' });
      return;
    }
    setLoading(true);
    try {
      await api.joinWaitingList(book.id, selectedMemberId);
      setFeedback({ type: 'success', message: 'Member enqueued to Waiting List (FIFO Queue)!' });
      onRefresh();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Failed to join waitlist' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-6 bg-black/70 backdrop-blur-md">
      <motion.div
        layoutId={`book-card-${book.id}`}
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className="w-full max-w-4xl bg-[var(--surface)] border border-[var(--border)] rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Header bar */}
        <div className="px-6 py-4 border-b border-[var(--border)] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-bold uppercase px-2 py-0.5 rounded bg-blue-500/10 text-blue-500">
              {book.category.name}
            </span>
            <span className="text-xs text-[var(--text-secondary)]">ISBN: {book.isbn}</span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-[var(--surface-secondary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 md:p-8 overflow-y-auto flex-1 grid grid-cols-1 md:grid-cols-12 gap-8">
          {/* Left Column: Book Cover & Status */}
          <div className="md:col-span-5 flex flex-col items-center text-center">
            <BookCover
              title={book.title}
              author={book.author}
              categorySlug={book.category.slug}
              size="lg"
              className="mb-4"
            />
            <div className="w-full bg-[var(--surface-secondary)] p-4 rounded-2xl border border-[var(--border)] space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-[var(--text-secondary)]">Availability:</span>
                <span
                  className={`font-semibold ${
                    book.available_copies > 0 ? 'text-emerald-500' : 'text-rose-500'
                  }`}
                >
                  {book.available_copies} of {book.total_copies} Copies
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[var(--text-secondary)]">Waiting Queue:</span>
                <span className="font-semibold text-[var(--text-primary)]">
                  {book.waiting_count} Members waiting
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[var(--text-secondary)]">Rating:</span>
                <span className="font-semibold text-amber-500">★ {book.rating.toFixed(1)} / 5.0</span>
              </div>
            </div>
          </div>

          {/* Right Column: Metadata & Interactive Actions */}
          <div className="md:col-span-7 flex flex-col justify-between">
            <div>
              <h2 className="text-2xl md:text-3xl font-black text-[var(--text-primary)] tracking-tight">
                {book.title}
              </h2>
              <p className="text-sm font-medium text-[var(--text-secondary)] mt-1">
                by <span className="text-[var(--text-primary)]">{book.author}</span> · {book.publication_year}
              </p>

              {/* Navigation Tabs */}
              <div className="flex flex-wrap gap-2 border-b border-[var(--border)] my-5">
                {[
                  { id: 'details', label: 'Overview' },
                  { id: 'borrowers', label: `Borrowers (${borrowers.length})` },
                  { id: 'issue', label: 'Issue Copy' },
                  { id: 'waitlist', label: 'Join Queue' },
                  { id: 'related', label: 'Related Books' },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => {
                      setActiveTab(tab.id as any);
                      setFeedback(null);
                    }}
                    className={`pb-2.5 px-2 text-xs font-semibold border-b-2 transition-all ${
                      activeTab === tab.id
                        ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                        : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Feedback messages */}
              {feedback && (
                <div
                  className={`mb-4 p-3 rounded-xl text-xs font-medium flex items-center gap-2 ${
                    feedback.type === 'success'
                      ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                      : 'bg-rose-500/10 text-rose-500 border border-rose-500/20'
                  }`}
                >
                  {feedback.type === 'success' ? (
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                  ) : (
                    <AlertCircle className="w-4 h-4 shrink-0" />
                  )}
                  <span>{feedback.message}</span>
                </div>
              )}

              {/* Tab: Details */}
              {activeTab === 'details' && (
                <div className="space-y-4 text-xs leading-relaxed text-[var(--text-secondary)]">
                  <p>{book.description}</p>
                  <div className="p-3 bg-[var(--surface-secondary)] rounded-xl border border-[var(--border)] space-y-1">
                    <span className="font-semibold text-[var(--text-primary)] block">
                      Data Structures Integration:
                    </span>
                    <p>
                      • Fast ISBN lookup indexed via <strong>Hash Table with Separate Chaining (O(1))</strong>.
                    </p>
                    <p>
                      • Title ordered index searchable through <strong>Binary Search Tree (O(log n))</strong>.
                    </p>
                    <p>
                      • Issue operations backed by an <strong>Undo Stack (LIFO)</strong>.
                    </p>
                  </div>
                </div>
              )}

              {/* Tab: Current Borrowers */}
              {activeTab === 'borrowers' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-[var(--text-primary)]">
                      Members Who Currently Have This Book
                    </span>
                    <span className="text-[var(--text-secondary)]">
                      {book.total_copies - book.available_copies} of {book.total_copies} Copies Checked Out
                    </span>
                  </div>

                  {loadingBorrowers ? (
                    <p className="text-xs text-[var(--text-secondary)] italic py-4">Loading active borrowers...</p>
                  ) : borrowers.length === 0 ? (
                    <div className="p-6 rounded-2xl bg-[var(--surface-secondary)] text-center text-xs text-[var(--text-secondary)] space-y-1">
                      <p className="font-semibold text-[var(--text-primary)]">All copies are in the library</p>
                      <p>No members currently have this book issued.</p>
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                      {borrowers.map((borrower) => (
                        <div
                          key={borrower.issue_id}
                          className="p-3 bg-[var(--surface-secondary)] rounded-xl border border-[var(--border)] flex items-center justify-between gap-3 text-xs"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-500 font-bold text-xs flex items-center justify-center shrink-0">
                              {borrower.name.charAt(0)}
                            </div>
                            <div className="min-w-0">
                              <p className="font-bold text-[var(--text-primary)] truncate">
                                {borrower.name}
                              </p>
                              <p className="text-[11px] text-[var(--text-secondary)] font-mono truncate">
                                ID: {borrower.member_code} · {borrower.email}
                              </p>
                            </div>
                          </div>
                          <div className="text-right shrink-0">
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                borrower.overdue
                                  ? 'bg-rose-500/10 text-rose-500'
                                  : 'bg-emerald-500/10 text-emerald-500'
                              }`}
                            >
                              {borrower.overdue ? 'Overdue' : 'On Loan'}
                            </span>
                            <span className="block text-[10px] text-[var(--text-secondary)] mt-0.5">
                              Due: {new Date(borrower.due_at).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Tab: Issue Book */}
              {activeTab === 'issue' && (
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-[var(--text-primary)]">
                      Select Member to Issue to:
                    </label>
                    <select
                      value={selectedMemberId || ''}
                      onChange={(e) => setSelectedMemberId(Number(e.target.value))}
                      className="w-full p-2.5 rounded-xl bg-[var(--surface-secondary)] border border-[var(--border)] text-xs text-[var(--text-primary)] outline-none"
                    >
                      <option value="">-- Choose Member --</option>
                      {members.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.name} ({m.member_code}) - {m.active_issues} currently borrowed
                        </option>
                      ))}
                    </select>
                  </div>

                  <button
                    disabled={book.available_copies <= 0 || loading}
                    onClick={handleIssue}
                    className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold text-xs transition-all shadow-md shadow-blue-500/20"
                  >
                    {book.available_copies > 0 ? 'Confirm Issue (Stack PUSH)' : 'No Copies Available'}
                  </button>
                </div>
              )}

              {/* Tab: Join Waitlist */}
              {activeTab === 'waitlist' && (
                <div className="space-y-4">
                  <p className="text-xs text-[var(--text-secondary)]">
                    If copies are unavailable, members can enter the <strong>FIFO Waiting Queue</strong>. When a copy is returned, the front member receives it automatically.
                  </p>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-[var(--text-primary)]">
                      Select Member to Enqueue:
                    </label>
                    <select
                      value={selectedMemberId || ''}
                      onChange={(e) => setSelectedMemberId(Number(e.target.value))}
                      className="w-full p-2.5 rounded-xl bg-[var(--surface-secondary)] border border-[var(--border)] text-xs text-[var(--text-primary)] outline-none"
                    >
                      <option value="">-- Choose Member --</option>
                      {members.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.name} ({m.member_code})
                        </option>
                      ))}
                    </select>
                  </div>

                  <button
                    disabled={loading}
                    onClick={handleJoinWaitlist}
                    className="w-full py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white font-semibold text-xs transition-all shadow-md shadow-amber-500/20"
                  >
                    Join Waiting List (Queue ENQUEUE)
                  </button>
                </div>
              )}

              {/* Tab: Related Books (Graph BFS) */}
              {activeTab === 'related' && (
                <div className="space-y-3">
                  <p className="text-xs text-[var(--text-secondary)]">
                    Derived using <strong>Graph BFS (Breadth-First Search)</strong> over adjacency lists:
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    {relatedBooks.map((rel) => (
                      <div
                        key={rel.id}
                        className="p-3 bg-[var(--surface-secondary)] rounded-xl border border-[var(--border)] flex items-center gap-3"
                      >
                        <BookCover
                          title={rel.title}
                          author={rel.author}
                          categorySlug={rel.category.slug}
                          size="sm"
                          showSpine={false}
                          className="shrink-0"
                        />
                        <div className="min-w-0">
                          <p className="font-semibold text-xs text-[var(--text-primary)] truncate">
                            {rel.title}
                          </p>
                          <p className="text-[10px] text-[var(--text-secondary)] truncate">
                            {rel.author}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Quick Actions Footer */}
            <div className="pt-6 border-t border-[var(--border)] mt-6 flex items-center justify-between">
              <button
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-[var(--text-secondary)] hover:bg-[var(--surface-secondary)]"
              >
                Close
              </button>
              <div className="flex gap-2">
                <button
                  onClick={() => setActiveTab('issue')}
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-md shadow-blue-500/20"
                >
                  Issue Book
                </button>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
