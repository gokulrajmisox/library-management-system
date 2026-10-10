'use client';

import React, { useState, useEffect } from 'react';
import {
  BarChart3,
  Download,
  TrendingUp,
  Award,
  BookOpen,
  Users,
  Sparkles,
  Layers,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { api } from '@/lib/api';
import { AnalyticsResponse } from '@/types';

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getAnalytics().then(setData).catch(console.error).finally(() => setLoading(false));
  }, []);

  const handleExportCSV = () => {
    window.open(api.getExportReportUrl(), '_blank');
  };

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-4 border-b border-[var(--border)]">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 text-xs font-semibold mb-3">
            <BarChart3 className="w-3.5 h-3.5" /> Comprehensive Circulation Analytics
          </div>
          <h1 className="text-3xl md:text-5xl font-black tracking-tight text-[var(--text-primary)]">
            Reports & Analytics
          </h1>
          <p className="mt-2 text-sm text-[var(--text-secondary)]">
            Deep dive into circulation statistics, most borrowed titles, and category demand.
          </p>
        </div>

        <button
          onClick={handleExportCSV}
          className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-2 shadow-lg shadow-blue-500/25 transition-all shrink-0"
        >
          <Download className="w-4 h-4" />
          <span>Export CSV Report</span>
        </button>
      </div>

      {/* Hall of Fame Highlights */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            label: 'Most Issued Book',
            val: data?.highlights.most_issued_book?.title || 'Clean Code',
            sub: `${data?.highlights.most_issued_book?.issues || 0} loans`,
            icon: BookOpen,
          },
          {
            label: 'Most Active Patron',
            val: data?.highlights.most_active_member?.name || 'Rahul Kumar',
            sub: `${data?.highlights.most_active_member?.issues || 0} checkouts`,
            icon: Users,
          },
          {
            label: 'Top Category',
            val: data?.highlights.most_popular_category?.name || 'Programming',
            sub: `${data?.highlights.most_popular_category?.issues || 0} issues`,
            icon: Award,
          },
          {
            label: 'Highest Queue Demand',
            val: data?.highlights.longest_waiting_list?.title || 'Introduction to Algorithms',
            sub: `${data?.highlights.longest_waiting_list?.queue || 0} patrons waiting`,
            icon: TrendingUp,
          },
        ].map((item, idx) => {
          const Icon = item.icon;
          return (
            <div
              key={idx}
              className="p-5 rounded-2xl bg-[var(--surface)] border border-[var(--border)] shadow-xs flex flex-col justify-between"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-[var(--text-secondary)]">{item.label}</span>
                <Icon className="w-4 h-4 text-blue-500" />
              </div>
              <div className="mt-4">
                <p className="text-sm font-black text-[var(--text-primary)] truncate">{item.val}</p>
                <p className="text-[11px] font-mono text-[var(--text-secondary)] mt-0.5">{item.sub}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Monthly Circulation Bar Chart */}
      <div className="p-6 rounded-3xl bg-[var(--surface)] border border-[var(--border)] shadow-xs space-y-4">
        <div>
          <h3 className="text-sm font-bold text-[var(--text-primary)]">
            Monthly Circulation Volume (Issues vs Returns)
          </h3>
          <p className="text-xs text-[var(--text-secondary)]">Historical 12 months</p>
        </div>

        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data?.monthly || []} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <XAxis dataKey="month" stroke="var(--text-secondary)" fontSize={11} tickLine={false} />
              <YAxis stroke="var(--text-secondary)" fontSize={11} tickLine={false} />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'var(--surface)',
                  borderColor: 'var(--border)',
                  borderRadius: '12px',
                  fontSize: '12px',
                }}
              />
              <Bar dataKey="issues" fill="#3B82F6" radius={[4, 4, 0, 0]} name="Issues" />
              <Bar dataKey="returns" fill="#10B981" radius={[4, 4, 0, 0]} name="Returns" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Top Books and Authors Tables */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Top Books */}
        <div className="p-6 rounded-3xl bg-[var(--surface)] border border-[var(--border)] shadow-xs space-y-4">
          <h3 className="text-sm font-bold text-[var(--text-primary)]">Most Issued Titles</h3>
          <div className="divide-y divide-[var(--border)] text-xs">
            {data?.top_books.map((b, i) => (
              <div key={b.id} className="py-2.5 flex items-center justify-between">
                <div className="min-w-0 pr-2">
                  <p className="font-bold text-[var(--text-primary)] truncate">{b.title}</p>
                  <p className="text-[11px] text-[var(--text-secondary)]">{b.author}</p>
                </div>
                <span className="font-mono font-bold text-blue-500 shrink-0">
                  {b.issues} loans
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Top Authors */}
        <div className="p-6 rounded-3xl bg-[var(--surface)] border border-[var(--border)] shadow-xs space-y-4">
          <h3 className="text-sm font-bold text-[var(--text-primary)]">Most Borrowed Authors</h3>
          <div className="divide-y divide-[var(--border)] text-xs">
            {data?.top_authors.map((a, i) => (
              <div key={i} className="py-2.5 flex items-center justify-between">
                <p className="font-bold text-[var(--text-primary)] truncate">{a.author}</p>
                <span className="font-mono font-bold text-emerald-500 shrink-0">
                  {a.issues} loans
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
