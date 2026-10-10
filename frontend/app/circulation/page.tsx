'use client';

import React, { useState, useEffect } from 'react';
import {
  Repeat,
  RotateCcw,
  Plus,
  Search,
  CheckCircle2,
  AlertCircle,
  Clock,
  Layers,
  Sparkles,
} from 'lucide-react';
import { api } from '@/lib/api';
import { Issue, Book, Member } from '@/types';

export default function CirculationPage() {
  const [issues, setIssues] = useState<Issue[]>([]);
  const [filterStatus, setFilterStatus] = useState<string>('active');
  const [loading, setLoading] = useState(true);
  const [undoMeta, setUndoMeta] = useState<{ issue: Issue; stack_size: number } | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  // Issue modal
  const [isIssueModalOpen, setIsIssueModalOpen] = useState(false);
  const [books, setBooks] = useState<Book[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [selectedBookId, setSelectedBookId] = useState<number | null>(null);
  const [selectedMemberId, setSelectedMemberId] = useState<number | null>(null);

  const fetchIssues = async () => {
    try {
      setLoading(true);
      const res = await api.getIssues({ status: filterStatus || undefined, limit: 100 });
      setIssues(res);
      // Peek undo stack
      try {
        const undoRes = await api.peekUndo();
        setUndoMeta(undoRes);
      } catch {
        setUndoMeta(null);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchIssues();
  }, [filterStatus]);

  const handleReturn = async (issueId: number) => {
    try {
      const res = await api.returnBook({ issue_id: issueId });
      setFeedback(res.message);
      fetchIssues();
      setTimeout(() => setFeedback(null), 4000);
    } catch (err: any) {
      setFeedback(err.message || 'Return failed');
    }
  };

  const handleUndo = async () => {
    try {
      const res = await api.undoLastIssue();
      setFeedback(`Undid: ${res.undone.book.title} (Restored copy to collection)`);
      fetchIssues();
      setTimeout(() => setFeedback(null), 4000);
    } catch (err: any) {
      setFeedback(err.message || 'Undo failed');
    }
  };

  const openIssueModal = async () => {
    const [bRes, mRes] = await Promise.all([
      api.getBooks({ page_size: 50, available_only: true }),
      api.getMembers({ page_size: 50 }),
    ]);
    setBooks(bRes.items);
    setMembers(mRes.items);
    setIsIssueModalOpen(true);
  };

  const handleCreateIssue = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBookId || !selectedMemberId) return;
    try {
      await api.issueBook({ book_id: selectedBookId, member_id: selectedMemberId });
      setIsIssueModalOpen(false);
      setFeedback('Book issued successfully! Pushed to Undo Stack.');
      fetchIssues();
      setTimeout(() => setFeedback(null), 4000);
    } catch (err: any) {
      setFeedback(err.message || 'Issue failed');
    }
  };

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-4 border-b border-[var(--border)]">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 text-xs font-semibold mb-3">
            <Repeat className="w-3.5 h-3.5" /> Book Loans & Undo Stack Engine
          </div>
          <h1 className="text-3xl md:text-5xl font-black tracking-tight text-[var(--text-primary)]">
            Circulation Desk
          </h1>
          <p className="mt-2 text-sm text-[var(--text-secondary)]">
            Process issues, returns, and execute instant O(1) stack undo operations.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Undo Action Button */}
          {undoMeta && (
            <button
              onClick={handleUndo}
              className="px-4 py-2.5 rounded-xl border border-amber-500/40 bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-400 text-xs font-bold flex items-center gap-2 transition-all shadow-xs"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Undo Last Issue ({undoMeta.stack_size} on Stack)</span>
            </button>
          )}

          <button
            onClick={openIssueModal}
            className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-2 shadow-lg shadow-blue-500/25 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Issue New Book</span>
          </button>
        </div>
      </div>

      {feedback && (
        <div className="p-3.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-600 dark:text-blue-400 text-xs font-medium flex items-center justify-between">
          <span>{feedback}</span>
        </div>
      )}

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-[var(--border)] pb-2">
        {[
          { id: 'active', label: 'Currently Active Loans' },
          { id: 'overdue', label: 'Overdue' },
          { id: 'returned', label: 'Returned History' },
          { id: '', label: 'All Records' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setFilterStatus(tab.id)}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
              filterStatus === tab.id
                ? 'bg-[var(--surface-secondary)] text-blue-600 dark:text-blue-400'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Issues Table */}
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[var(--surface-secondary)] text-[var(--text-secondary)] uppercase font-mono tracking-wider text-[10px] border-b border-[var(--border)]">
              <tr>
                <th className="py-3 px-4">Book Title</th>
                <th className="py-3 px-4">Borrower</th>
                <th className="py-3 px-4">Issued On</th>
                <th className="py-3 px-4">Due Date</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {issues.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-[var(--text-secondary)] italic">
                    No records found for this filter.
                  </td>
                </tr>
              ) : (
                issues.map((iss) => (
                  <tr key={iss.id} className="hover:bg-[var(--surface-secondary)]/50 transition-colors">
                    <td className="py-3.5 px-4">
                      <p className="font-bold text-[var(--text-primary)]">{iss.book.title}</p>
                      <p className="text-[11px] text-[var(--text-secondary)]">ISBN: {iss.book.isbn}</p>
                    </td>
                    <td className="py-3.5 px-4">
                      <p className="font-semibold text-[var(--text-primary)]">{iss.member.name}</p>
                      <p className="text-[11px] text-[var(--text-secondary)] font-mono">
                        {iss.member.member_code}
                      </p>
                    </td>
                    <td className="py-3.5 px-4 text-[var(--text-secondary)]">
                      {new Date(iss.issued_at).toLocaleDateString()}
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={
                          iss.overdue
                            ? 'text-rose-500 font-bold'
                            : 'text-[var(--text-secondary)]'
                        }
                      >
                        {new Date(iss.due_at).toLocaleDateString()}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          iss.status === 'active'
                            ? iss.overdue
                              ? 'bg-rose-500/10 text-rose-500'
                              : 'bg-blue-500/10 text-blue-500'
                            : 'bg-emerald-500/10 text-emerald-500'
                        }`}
                      >
                        {iss.status === 'active'
                          ? iss.overdue
                            ? 'Overdue'
                            : 'On Loan'
                          : 'Returned'}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      {iss.status === 'active' && (
                        <button
                          onClick={() => handleReturn(iss.id)}
                          className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs shadow-xs transition-all"
                        >
                          Return Copy
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Issue Modal */}
      {isIssueModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
          <form
            onSubmit={handleCreateIssue}
            className="w-full max-w-md bg-[var(--surface)] border border-[var(--border)] rounded-3xl p-6 shadow-2xl space-y-4"
          >
            <h3 className="text-lg font-black text-[var(--text-primary)]">Issue Book to Patron</h3>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-[var(--text-primary)]">
                Select Available Book:
              </label>
              <select
                required
                value={selectedBookId || ''}
                onChange={(e) => setSelectedBookId(Number(e.target.value))}
                className="w-full p-2.5 rounded-xl bg-[var(--surface-secondary)] border border-[var(--border)] text-xs text-[var(--text-primary)] outline-none"
              >
                <option value="">-- Choose Book --</option>
                {books.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.title} ({b.available_copies} available)
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-[var(--text-primary)]">
                Select Member:
              </label>
              <select
                required
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

            <div className="pt-4 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsIssueModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-[var(--text-secondary)] hover:bg-[var(--surface-secondary)]"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-500/20"
              >
                Confirm Issue (PUSH)
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
