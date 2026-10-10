'use client';

import React, { useState, useEffect } from 'react';
import {
  Users,
  Search,
  Plus,
  Mail,
  Phone,
  BookOpen,
  Calendar,
  CheckCircle2,
  XCircle,
  Clock,
  ArrowRight,
  Sparkles,
} from 'lucide-react';
import { api } from '@/lib/api';
import { Member, Issue } from '@/types';

export default function MembersPage() {
  const [members, setMembers] = useState<Member[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedMember, setSelectedMember] = useState<{
    member: Member;
    current: Issue[];
    history: Issue[];
    waiting: any[];
  } | null>(null);

  // New member modal
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [addError, setAddError] = useState<string | null>(null);

  const fetchMembers = async () => {
    try {
      setLoading(true);
      const res = await api.getMembers({ q: search || undefined, page_size: 50 });
      setMembers(res.items);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchMembers();
    }, 200);
    return () => clearTimeout(timer);
  }, [search]);

  const handleSelectMember = async (id: number) => {
    try {
      const res = await api.getMember(id);
      setSelectedMember(res);
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreateMember = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddError(null);
    try {
      await api.createMember({
        name: newName,
        email: newEmail,
        phone: newPhone,
      });
      setIsAddOpen(false);
      setNewName('');
      setNewEmail('');
      setNewPhone('');
      fetchMembers();
    } catch (err: any) {
      setAddError(err.message || 'Failed to register member');
    }
  };

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-300">
      {/* Header Bar */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-4 border-b border-[var(--border)]">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 text-xs font-semibold mb-3">
            <Users className="w-3.5 h-3.5" /> Patron & Membership System
          </div>
          <h1 className="text-3xl md:text-5xl font-black tracking-tight text-[var(--text-primary)]">
            Library Members
          </h1>
          <p className="mt-2 text-sm text-[var(--text-secondary)]">
            Manage patrons, issue quotas, borrowing logs, and active reservations.
          </p>
        </div>

        <button
          onClick={() => setIsAddOpen(true)}
          className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-2 shadow-lg shadow-blue-500/25 transition-all shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Register New Member</span>
        </button>
      </div>

      {/* Search Input Toolbar */}
      <div className="p-4 rounded-2xl bg-[var(--surface)] border border-[var(--border)] flex items-center gap-3">
        <Search className="w-4 h-4 text-[var(--text-secondary)] shrink-0" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name, member code (M0001), email, or phone..."
          className="w-full bg-transparent text-xs text-[var(--text-primary)] outline-none placeholder-[var(--text-secondary)]"
        />
      </div>

      {/* Members Grid / Table */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {members.map((member) => (
          <div
            key={member.id}
            onClick={() => handleSelectMember(member.id)}
            className="cursor-pointer p-5 rounded-2xl bg-[var(--surface)] border border-[var(--border)] hover:border-blue-500/40 hover:shadow-xl transition-all space-y-4 group"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-500 font-black text-sm flex items-center justify-center">
                  {member.name.charAt(0)}
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[var(--text-primary)] group-hover:text-blue-500 transition-colors">
                    {member.name}
                  </h3>
                  <span className="font-mono text-[11px] text-[var(--text-secondary)]">
                    {member.member_code}
                  </span>
                </div>
              </div>
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  member.active
                    ? 'bg-emerald-500/10 text-emerald-500'
                    : 'bg-rose-500/10 text-rose-500'
                }`}
              >
                {member.active ? 'Active' : 'Suspended'}
              </span>
            </div>

            <div className="space-y-1.5 text-xs text-[var(--text-secondary)]">
              <div className="flex items-center gap-2 truncate">
                <Mail className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">{member.email}</span>
              </div>
              <div className="flex items-center gap-2">
                <Phone className="w-3.5 h-3.5 shrink-0" />
                <span>{member.phone || 'No phone'}</span>
              </div>
            </div>

            <div className="pt-3 border-t border-[var(--border)] flex items-center justify-between text-xs">
              <div>
                <span className="font-bold text-[var(--text-primary)]">{member.active_issues}</span>{' '}
                <span className="text-[var(--text-secondary)]">on loan</span>
              </div>
              <div>
                <span className="font-bold text-amber-500">{member.waiting_count}</span>{' '}
                <span className="text-[var(--text-secondary)]">waiting</span>
              </div>
              <div>
                <span className="font-bold text-[var(--text-primary)]">{member.total_borrowed}</span>{' '}
                <span className="text-[var(--text-secondary)]">total</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Member Profile Drawer Modal */}
      {selectedMember && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
          <div className="w-full max-w-2xl bg-[var(--surface)] border border-[var(--border)] rounded-3xl p-6 shadow-2xl max-h-[85vh] flex flex-col space-y-6">
            <div className="flex items-center justify-between border-b border-[var(--border)] pb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-blue-600 text-white font-black text-lg flex items-center justify-center shadow-lg shadow-blue-500/20">
                  {selectedMember.member.name.charAt(0)}
                </div>
                <div>
                  <h2 className="text-xl font-black text-[var(--text-primary)]">
                    {selectedMember.member.name}
                  </h2>
                  <p className="text-xs text-[var(--text-secondary)] font-mono">
                    ID: {selectedMember.member.member_code} · {selectedMember.member.email}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedMember(null)}
                className="text-xs font-bold px-3 py-1.5 rounded-lg bg-[var(--surface-secondary)]"
              >
                Close
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-6 text-xs">
              {/* Currently Borrowed Books */}
              <div>
                <h3 className="font-bold text-[var(--text-primary)] mb-2">
                  Currently Issued Books ({selectedMember.current.length} / 5 limit)
                </h3>
                {selectedMember.current.length === 0 ? (
                  <p className="text-[var(--text-secondary)] italic">No active book loans.</p>
                ) : (
                  <div className="space-y-2">
                    {selectedMember.current.map((iss) => (
                      <div
                        key={iss.id}
                        className="p-3 bg-[var(--surface-secondary)] rounded-xl border border-[var(--border)] flex items-center justify-between"
                      >
                        <div>
                          <p className="font-semibold text-[var(--text-primary)]">{iss.book.title}</p>
                          <p className="text-[11px] text-[var(--text-secondary)]">
                            Due: {new Date(iss.due_at).toLocaleDateString()}
                          </p>
                        </div>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-500">
                          Active Loan
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Waiting Queues */}
              <div>
                <h3 className="font-bold text-[var(--text-primary)] mb-2">
                  Active Waiting List Reservations (FIFO Queue)
                </h3>
                {selectedMember.waiting.length === 0 ? (
                  <p className="text-[var(--text-secondary)] italic">Not waiting for any books.</p>
                ) : (
                  <div className="space-y-2">
                    {selectedMember.waiting.map((w, idx) => (
                      <div
                        key={idx}
                        className="p-3 bg-[var(--surface-secondary)] rounded-xl border border-[var(--border)] flex items-center justify-between"
                      >
                        <div>
                          <p className="font-semibold text-[var(--text-primary)]">{w.title}</p>
                          <p className="text-[11px] text-[var(--text-secondary)]">{w.author}</p>
                        </div>
                        <div className="text-right">
                          <span className="font-mono font-bold text-amber-500">
                            Position #{w.position} of {w.queue_size}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Member Modal */}
      {isAddOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
          <form
            onSubmit={handleCreateMember}
            className="w-full max-w-md bg-[var(--surface)] border border-[var(--border)] rounded-3xl p-6 shadow-2xl space-y-4"
          >
            <h3 className="text-lg font-black text-[var(--text-primary)]">Register New Member</h3>

            {addError && (
              <div className="p-3 rounded-xl bg-rose-500/10 text-rose-500 text-xs font-semibold">
                {addError}
              </div>
            )}

            <div className="space-y-1">
              <label className="text-xs font-semibold text-[var(--text-primary)]">Full Name</label>
              <input
                required
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="e.g. Anand Kumar"
                className="w-full p-2.5 rounded-xl bg-[var(--surface-secondary)] border border-[var(--border)] text-xs text-[var(--text-primary)] outline-none"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-[var(--text-primary)]">Email</label>
              <input
                required
                type="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                placeholder="e.g. anand@example.com"
                className="w-full p-2.5 rounded-xl bg-[var(--surface-secondary)] border border-[var(--border)] text-xs text-[var(--text-primary)] outline-none"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-[var(--text-primary)]">Phone Number</label>
              <input
                type="text"
                value={newPhone}
                onChange={(e) => setNewPhone(e.target.value)}
                placeholder="e.g. +91 98765 43210"
                className="w-full p-2.5 rounded-xl bg-[var(--surface-secondary)] border border-[var(--border)] text-xs text-[var(--text-primary)] outline-none"
              />
            </div>

            <div className="pt-4 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsAddOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-[var(--text-secondary)] hover:bg-[var(--surface-secondary)]"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-500/20"
              >
                Register Member
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
