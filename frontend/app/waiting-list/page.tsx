'use client';

import React, { useState, useEffect } from 'react';
import {
  ListOrdered,
  ArrowRight,
  UserCheck,
  Clock,
  Sparkles,
  Users,
  CheckCircle2,
  Trash2,
} from 'lucide-react';
import { api } from '@/lib/api';
import { WaitingSummary, WaitingListDetails } from '@/types';

export default function WaitingListPage() {
  const [summaries, setSummaries] = useState<WaitingSummary[]>([]);
  const [selectedBookId, setSelectedBookId] = useState<number | null>(null);
  const [queueDetails, setQueueDetails] = useState<WaitingListDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);

  const fetchSummaries = async () => {
    try {
      setLoading(true);
      const res = await api.getWaitingSummaries();
      setSummaries(res);
      if (res.length > 0 && !selectedBookId) {
        setSelectedBookId(res[0].book.id);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSummaries();
  }, []);

  useEffect(() => {
    if (selectedBookId) {
      api.getWaitingList(selectedBookId).then(setQueueDetails).catch(console.error);
    }
  }, [selectedBookId]);

  const handleDequeueFront = async () => {
    if (!selectedBookId) return;
    try {
      const res = await api.leaveWaitingList(selectedBookId);
      setQueueDetails(res);
      setMessage('Front member dequeued from the waiting list.');
      fetchSummaries();
      setTimeout(() => setMessage(null), 3000);
    } catch (err: any) {
      setMessage(err.message || 'Failed to dequeue');
    }
  };

  const handleCancelMember = async (memberId: number) => {
    if (!selectedBookId) return;
    try {
      const res = await api.leaveWaitingList(selectedBookId, memberId);
      setQueueDetails(res);
      setMessage('Reservation cancelled for member.');
      fetchSummaries();
      setTimeout(() => setMessage(null), 3000);
    } catch (err: any) {
      setMessage(err.message || 'Failed to cancel');
    }
  };

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-4 border-b border-[var(--border)]">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 text-xs font-semibold mb-3">
            <ListOrdered className="w-3.5 h-3.5" /> FIFO Queue (First-In, First-Out)
          </div>
          <h1 className="text-3xl md:text-5xl font-black tracking-tight text-[var(--text-primary)]">
            Waiting Lists
          </h1>
          <p className="mt-2 text-sm text-[var(--text-secondary)]">
            Fair allocation queues for popular titles. When a book is returned, the front member receives it automatically.
          </p>
        </div>
      </div>

      {message && (
        <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 text-xs font-medium">
          {message}
        </div>
      )}

      {/* Main Layout: List of Queued Books on Left, Visualizer on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Books with active queues */}
        <div className="lg:col-span-4 space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)]">
            Titles with Active Queues
          </h3>
          <div className="space-y-2">
            {summaries.length === 0 ? (
              <p className="text-xs text-[var(--text-secondary)] italic">No waiting lists active.</p>
            ) : (
              summaries.map((item) => (
                <button
                  key={item.book.id}
                  onClick={() => setSelectedBookId(item.book.id)}
                  className={`w-full text-left p-4 rounded-2xl border transition-all flex items-center justify-between ${
                    selectedBookId === item.book.id
                      ? 'bg-[var(--surface-secondary)] border-amber-500/50 shadow-md'
                      : 'bg-[var(--surface)] border-[var(--border)] hover:border-amber-500/30'
                  }`}
                >
                  <div className="min-w-0 pr-3">
                    <h4 className="font-bold text-xs text-[var(--text-primary)] truncate">
                      {item.book.title}
                    </h4>
                    <p className="text-[11px] text-[var(--text-secondary)] truncate">
                      {item.book.author}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="font-mono text-xs font-black text-amber-500">
                      {item.queue_size} in queue
                    </span>
                    <span className="block text-[10px] text-[var(--text-secondary)]">
                      {item.available_copies} copies free
                    </span>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Interactive FIFO Queue Visualizer */}
        <div className="lg:col-span-8 p-6 rounded-3xl bg-[var(--surface)] border border-[var(--border)] shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[var(--border)] pb-4">
            <div>
              <span className="text-[10px] font-mono uppercase tracking-widest text-amber-500 font-bold block">
                FIFO QUEUE VISUALIZATION
              </span>
              <h3 className="text-lg font-black text-[var(--text-primary)]">
                {queueDetails?.book.title || 'Select a title'}
              </h3>
            </div>
            {queueDetails && queueDetails.queue.length > 0 && (
              <button
                onClick={handleDequeueFront}
                className="px-3.5 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shadow-xs transition-all flex items-center gap-1.5 self-start sm:self-auto"
              >
                <span>Dequeue FRONT Node</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Queue Visualization Track */}
          <div className="space-y-4">
            <div className="flex items-center justify-between text-[11px] font-mono text-[var(--text-secondary)] px-2">
              <span className="font-bold text-emerald-500 flex items-center gap-1">
                ◀ FRONT (Next Priority)
              </span>
              <span className="font-bold text-blue-500">REAR (New Enqueues) ▶</span>
            </div>

            {queueDetails && queueDetails.queue.length > 0 ? (
              <div className="flex items-center gap-3 overflow-x-auto pb-4 pt-2">
                {queueDetails.queue.map((entry, idx) => (
                  <React.Fragment key={entry.id}>
                    <div
                      className={`shrink-0 w-48 p-4 rounded-2xl border transition-all shadow-xs ${
                        idx === 0
                          ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-600 dark:text-emerald-400'
                          : 'bg-[var(--surface-secondary)] border-[var(--border)] text-[var(--text-primary)]'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-[var(--surface)]">
                          Pos #{entry.position}
                        </span>
                        <button
                          onClick={() => handleCancelMember(entry.member.id)}
                          title="Remove from queue"
                          className="text-[var(--text-secondary)] hover:text-rose-500 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <p className="font-bold text-xs truncate">{entry.member.name}</p>
                      <p className="font-mono text-[10px] text-[var(--text-secondary)]">
                        {entry.member.member_code}
                      </p>
                      <p className="text-[10px] text-[var(--text-secondary)] mt-2">
                        Enqueued: {new Date(entry.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>

                    {idx < queueDetails.queue.length - 1 && (
                      <div className="text-[var(--text-secondary)] font-mono text-sm shrink-0">
                        ➔
                      </div>
                    )}
                  </React.Fragment>
                ))}
              </div>
            ) : (
              <div className="py-12 text-center text-xs text-[var(--text-secondary)] italic">
                Queue is currently empty for this title.
              </div>
            )}
          </div>

          {/* Educational Note */}
          <div className="p-4 rounded-2xl bg-[var(--surface-secondary)] text-xs text-[var(--text-secondary)] space-y-1">
            <span className="font-semibold text-[var(--text-primary)] block">
              Queue Specifications:
            </span>
            <p>
              • <strong>Enqueue (Rear):</strong> O(1) time complexity using linked list rear pointer.
            </p>
            <p>
              • <strong>Dequeue (Front):</strong> O(1) time complexity when a copy is returned.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
