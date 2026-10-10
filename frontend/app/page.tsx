'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  BookOpen,
  Users,
  Repeat,
  ListOrdered,
  Plus,
  ArrowRight,
  TrendingUp,
  Sparkles,
  Clock,
  RotateCcw,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { api } from '@/lib/api';
import { AnalyticsResponse, ActivityItem } from '@/types';
import BookCover from '@/components/BookCover';

const CATEGORY_COLORS = ['#3B82F6', '#10B981', '#A855F7', '#F59E0B', '#06B6D4', '#F43F5E', '#EC4899'];

export default function DashboardPage() {
  const [data, setData] = useState<AnalyticsResponse | null>(null);
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [undoStatus, setUndoStatus] = useState<string | null>(null);
  const [chartRange, setChartRange] = useState<'30D' | '12M'>('30D');

  const fetchData = async () => {
    try {
      setLoading(true);
      const [analyticsRes, actRes] = await Promise.all([
        api.getAnalytics(),
        api.getActivity(6),
      ]);
      setData(analyticsRes);
      setActivity(actRes);
    } catch (err) {
      console.error('Failed to load dashboard data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleQuickUndo = async () => {
    try {
      const res = await api.undoLastIssue();
      setUndoStatus(`Successfully undone: ${res.undone.book.title} (Member: ${res.undone.member.name})`);
      fetchData();
      setTimeout(() => setUndoStatus(null), 4000);
    } catch (err: any) {
      setUndoStatus(err.message || 'Nothing to undo');
      setTimeout(() => setUndoStatus(null), 3000);
    }
  };

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-300">
      {/* Editorial Welcome Hero Section */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-2 border-b border-[var(--border)]">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 text-xs font-semibold mb-3">
            <Sparkles className="w-3.5 h-3.5" /> BE CSE Data Structures Capstone Project
          </div>
          <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-[var(--text-primary)]">
            Good morning, Admin 👋
          </h1>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">
            Here's what's happening across books, circulation, and memory data structures today.
          </p>
        </div>

        {/* Global Action Buttons */}
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={handleQuickUndo}
            className="px-4 py-2.5 rounded-xl border border-[var(--border)] bg-[var(--surface)] hover:bg-[var(--surface-secondary)] text-xs font-semibold text-[var(--text-primary)] flex items-center gap-2 transition-all shadow-sm"
          >
            <RotateCcw className="w-4 h-4 text-amber-500" />
            <span>Undo Last Issue (Stack POP)</span>
          </button>
          <Link
            href="/books"
            className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold flex items-center gap-2 shadow-lg shadow-blue-500/25 transition-all"
          >
            <BookOpen className="w-4 h-4" />
            <span>Explore Collection</span>
          </Link>
        </div>
      </div>

      {undoStatus && (
        <div className="p-3.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-600 dark:text-blue-400 text-xs font-medium flex items-center justify-between">
          <span>{undoStatus}</span>
          <span className="font-mono text-[10px] uppercase">O(1) Stack Operation</span>
        </div>
      )}

      {/* KPI Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {[
          {
            label: 'Total Books',
            val: data?.totals.titles ?? 58,
            sub: `${data?.totals.copies ?? 174} total copies`,
            icon: BookOpen,
            color: 'text-blue-500',
            bg: 'bg-blue-500/10',
          },
          {
            label: 'Available',
            val: data?.totals.available ?? 112,
            sub: 'Ready to issue',
            icon: Sparkles,
            color: 'text-emerald-500',
            bg: 'bg-emerald-500/10',
          },
          {
            label: 'Issued Books',
            val: data?.totals.issued ?? 62,
            sub: `${data?.totals.overdue ?? 0} overdue`,
            icon: Repeat,
            color: 'text-indigo-500',
            bg: 'bg-indigo-500/10',
          },
          {
            label: 'Members',
            val: data?.totals.members ?? 24,
            sub: 'Active accounts',
            icon: Users,
            color: 'text-purple-500',
            bg: 'bg-purple-500/10',
          },
          {
            label: 'Waiting Lists',
            val: data?.totals.waiting ?? 14,
            sub: `Across ${data?.totals.waiting_books ?? 5} books (Queue)`,
            icon: ListOrdered,
            color: 'text-amber-500',
            bg: 'bg-amber-500/10',
          },
        ].map((card, i) => {
          const Icon = card.icon;
          return (
            <div
              key={i}
              className="p-5 rounded-2xl bg-[var(--surface)] border border-[var(--border)] shadow-sm hover:border-blue-500/30 transition-all flex flex-col justify-between"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-[var(--text-secondary)]">{card.label}</span>
                <div className={`w-8 h-8 rounded-lg ${card.bg} ${card.color} flex items-center justify-center`}>
                  <Icon className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-4">
                <div className="text-2xl font-black text-[var(--text-primary)] tracking-tight">
                  {loading ? '...' : card.val}
                </div>
                <div className="mt-1 text-[11px] text-[var(--text-secondary)]">{card.sub}</div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Analytics Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Circulation History Area Chart */}
        <div className="lg:col-span-2 p-6 rounded-2xl bg-[var(--surface)] border border-[var(--border)] shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-[var(--text-primary)]">Book Circulation Trends</h3>
              <p className="text-xs text-[var(--text-secondary)]">Historical issues and returns</p>
            </div>
            <div className="flex items-center gap-1 p-1 bg-[var(--surface-secondary)] rounded-lg text-xs">
              <button
                onClick={() => setChartRange('30D')}
                className={`px-2.5 py-1 rounded-md font-semibold transition-all ${
                  chartRange === '30D' ? 'bg-[var(--surface)] shadow-xs text-blue-500' : 'text-[var(--text-secondary)]'
                }`}
              >
                30 Days
              </button>
              <button
                onClick={() => setChartRange('12M')}
                className={`px-2.5 py-1 rounded-md font-semibold transition-all ${
                  chartRange === '12M' ? 'bg-[var(--surface)] shadow-xs text-blue-500' : 'text-[var(--text-secondary)]'
                }`}
              >
                12 Months
              </button>
            </div>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={
                  chartRange === '30D'
                    ? (data?.daily.slice(-15) || []).map((d) => ({
                        label: d.label,
                        issued: d.issued,
                        returned: d.returned,
                      }))
                    : (data?.monthly || []).map((m) => ({
                        label: m.month,
                        issued: m.issues,
                        returned: m.returns,
                      }))
                }
                margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="colorIssued" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#3B82F6" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="colorReturned" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10B981" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#10B981" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <XAxis
                  dataKey="label"
                  stroke="var(--text-secondary)"
                  fontSize={11}
                  tickLine={false}
                />
                <YAxis stroke="var(--text-secondary)" fontSize={11} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'var(--surface)',
                    borderColor: 'var(--border)',
                    borderRadius: '12px',
                    fontSize: '12px',
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="issued"
                  stroke="#3B82F6"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorIssued)"
                  name="Issued"
                />
                <Area
                  type="monotone"
                  dataKey="returned"
                  stroke="#10B981"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorReturned)"
                  name="Returned"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Category Breakdown Pie Chart */}
        <div className="p-6 rounded-2xl bg-[var(--surface)] border border-[var(--border)] shadow-sm flex flex-col justify-between">
          <div className="mb-4">
            <h3 className="text-sm font-bold text-[var(--text-primary)]">Books by Category</h3>
            <p className="text-xs text-[var(--text-secondary)]">Collection balance</p>
          </div>

          <div className="h-48 w-full flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data?.categories || []}
                  dataKey="books"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={75}
                  paddingAngle={4}
                >
                  {(data?.categories || []).map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={CATEGORY_COLORS[index % CATEGORY_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'var(--surface)',
                    borderColor: 'var(--border)',
                    borderRadius: '12px',
                    fontSize: '12px',
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2 text-[11px]">
            {(data?.categories.slice(0, 6) || []).map((cat, i) => (
              <div key={cat.slug} className="flex items-center gap-2">
                <span
                  className="w-2.5 h-2.5 rounded-full"
                  style={{ backgroundColor: CATEGORY_COLORS[i % CATEGORY_COLORS.length] }}
                />
                <span className="text-[var(--text-secondary)] truncate">{cat.name}</span>
                <span className="font-semibold text-[var(--text-primary)] ml-auto">{cat.books}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Featured Book Showcase & Recent Activity Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Editorial Spotlight Card */}
        <div className="p-6 rounded-2xl bg-gradient-to-br from-blue-900/30 via-[var(--surface)] to-[var(--surface)] border border-blue-500/20 shadow-sm flex flex-col sm:flex-row items-center gap-6">
          <BookCover
            title="Clean Code"
            author="Robert C. Martin"
            categorySlug="programming"
            size="md"
            className="shrink-0"
          />
          <div className="flex-1 space-y-3">
            <div className="inline-block px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-blue-500/20 text-blue-400">
              FEATURED TITLE
            </div>
            <h3 className="text-xl font-extrabold text-[var(--text-primary)]">Clean Code</h3>
            <p className="text-xs text-[var(--text-secondary)] leading-relaxed line-clamp-3">
              A handbook of agile software craftsmanship. Master naming, formatting, error handling, and unit testing.
            </p>
            <div className="pt-2 flex items-center gap-3">
              <Link
                href="/books?id=2"
                className="px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold flex items-center gap-1.5 transition-all shadow-md shadow-blue-500/20"
              >
                <span>View Details</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
              <Link
                href="/books?isbn=9780132350884"
                className="px-3.5 py-1.5 rounded-lg border border-[var(--border)] hover:bg-[var(--surface-secondary)] text-xs font-semibold text-[var(--text-primary)] transition-all"
              >
                Hash Lookup
              </Link>
            </div>
          </div>
        </div>

        {/* Real-time Activity Feed (Backed by SinglyLinkedList) */}
        <div className="lg:col-span-2 p-6 rounded-2xl bg-[var(--surface)] border border-[var(--border)] shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-[var(--text-primary)]">Recent Circulation Activity</h3>
              <p className="text-xs text-[var(--text-secondary)]">Powered by Singly Linked List (HEAD insertion)</p>
            </div>
            <Link
              href="/circulation"
              className="text-xs font-semibold text-blue-500 hover:text-blue-600 flex items-center gap-1"
            >
              <span>View all</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="divide-y divide-[var(--border)]">
            {activity.map((item) => (
              <div key={item.id} className="py-3 flex items-center justify-between gap-4 text-xs">
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                      item.kind === 'issue'
                        ? 'bg-blue-500/10 text-blue-500'
                        : item.kind === 'return'
                        ? 'bg-emerald-500/10 text-emerald-500'
                        : 'bg-amber-500/10 text-amber-500'
                    }`}
                  >
                    {item.kind === 'issue' ? (
                      <Repeat className="w-3.5 h-3.5" />
                    ) : item.kind === 'return' ? (
                      <RotateCcw className="w-3.5 h-3.5" />
                    ) : (
                      <ListOrdered className="w-3.5 h-3.5" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-[var(--text-primary)] truncate">{item.message}</p>
                    <p className="text-[11px] text-[var(--text-secondary)] truncate">
                      {item.member ? `By ${item.member}` : 'System operation'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1 text-[11px] text-[var(--text-secondary)] shrink-0 font-mono">
                  <Clock className="w-3 h-3" />
                  <span>{new Date(item.at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
