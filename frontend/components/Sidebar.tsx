'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  BookOpen,
  LayoutDashboard,
  Library,
  Users,
  Repeat,
  ListOrdered,
  Share2,
  BarChart3,
  Cpu,
  Bookmark,
} from 'lucide-react';

const NAV_ITEMS = [
  { href: '/', label: 'Home', icon: LayoutDashboard },
  { href: '/books', label: 'Books', icon: Library },
  { href: '/members', label: 'Members', icon: Users },
  { href: '/circulation', label: 'Circulation', icon: Repeat },
  { href: '/waiting-list', label: 'Waiting Lists', icon: ListOrdered },
  { href: '/recommendations', label: 'Recommendations', icon: Share2 },
  { href: '/analytics', label: 'Analytics', icon: BarChart3 },
  { href: '/data-structures', label: 'Data Structures', icon: Cpu },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <>
      {/* Desktop Fixed Sidebar */}
      <aside className="hidden md:flex flex-col w-64 fixed inset-y-0 left-0 z-40 bg-[var(--surface)] border-r border-[var(--border)] transition-colors duration-200">
        {/* Brand Logo */}
        <div className="h-18 flex items-center px-6 gap-3 border-b border-[var(--border)]">
          <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-lg shadow-blue-500/25">
            <BookOpen className="w-5 h-5" />
          </div>
          <div>
            <span className="font-extrabold tracking-wider text-sm uppercase text-[var(--text-primary)]">
              LIBRARY
            </span>
            <span className="block text-[10px] tracking-widest text-[var(--text-secondary)] font-medium uppercase">
              DSA Capstone
            </span>
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 px-3 py-6 space-y-1.5 overflow-y-auto">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive =
              item.href === '/' ? pathname === '/' : pathname.startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3.5 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                  isActive
                    ? 'bg-blue-600/10 text-blue-600 dark:text-blue-400 font-semibold shadow-sm'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-secondary)]'
                }`}
              >
                <Icon
                  className={`w-4.5 h-4.5 transition-transform duration-200 ${
                    isActive ? 'scale-110 text-blue-600 dark:text-blue-400' : ''
                  }`}
                />
                <span>{item.label}</span>
                {isActive && (
                  <span className="ml-auto w-1.5 h-1.5 rounded-full bg-blue-600 dark:bg-blue-400" />
                )}
              </Link>
            );
          })}
        </nav>

        {/* Admin profile footer */}
        <div className="p-4 border-t border-[var(--border)]">
          <div className="flex items-center gap-3 p-2 rounded-xl bg-[var(--surface-secondary)]">
            <div className="w-8 h-8 rounded-full bg-slate-700 text-white flex items-center justify-center text-xs font-bold">
              AD
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-[var(--text-primary)] truncate">Admin</p>
              <p className="text-[10px] text-[var(--text-secondary)] truncate">Library Administrator</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Mobile Bottom Navigation Bar */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-[var(--surface)] border-t border-[var(--border)] px-2 py-1.5 flex items-center justify-around backdrop-blur-md">
        {NAV_ITEMS.slice(0, 5).map((item) => {
          const Icon = item.icon;
          const isActive =
            item.href === '/' ? pathname === '/' : pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center gap-0.5 py-1 px-2.5 rounded-lg text-[10px] font-medium transition-colors ${
                isActive
                  ? 'text-blue-600 dark:text-blue-400 font-semibold'
                  : 'text-[var(--text-secondary)]'
              }`}
            >
              <Icon className="w-5 h-5" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </>
  );
}
