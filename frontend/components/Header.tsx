'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Search,
  Sun,
  Moon,
  Bell,
  BookMarked,
  ArrowRight,
  Database,
  Hash,
  Binary,
} from 'lucide-react';
import { useTheme } from '@/components/ThemeProvider';
import { api } from '@/lib/api';
import { SearchSuggestion } from '@/types';

export default function Header() {
  const { theme, toggleTheme } = useTheme();
  const router = useRouter();

  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
  const [totalMatches, setTotalMatches] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Debounced search
  useEffect(() => {
    if (!query.trim()) {
      setSuggestions([]);
      setIsOpen(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await api.searchBooks(query, 6);
        setSuggestions(res.suggestions);
        setTotalMatches(res.total);
        setIsOpen(true);
      } catch (err) {
        console.error('Search error', err);
      } finally {
        setIsSearching(false);
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [query]);

  // Click outside to close
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (id: number) => {
    setIsOpen(false);
    setQuery('');
    router.push(`/books?id=${id}`);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && query.trim()) {
      setIsOpen(false);
      router.push(`/books?q=${encodeURIComponent(query)}`);
    }
  };

  return (
    <header className="h-18 px-6 md:px-8 border-b border-[var(--border)] bg-[var(--surface)]/80 backdrop-blur-md sticky top-0 z-30 flex items-center justify-between gap-4 transition-colors">
      {/* Search Input Bar */}
      <div ref={containerRef} className="relative flex-1 max-w-xl">
        <div className="relative flex items-center">
          <Search className="w-4 h-4 text-[var(--text-secondary)] absolute left-3.5 pointer-events-none" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => query.trim() && setIsOpen(true)}
            placeholder="Search books by title, author, or ISBN (e.g. Clean Code, 9780132350884)..."
            className="w-full pl-10 pr-20 py-2 rounded-xl bg-[var(--surface-secondary)] border border-transparent focus:border-blue-500/40 focus:bg-[var(--surface)] text-sm text-[var(--text-primary)] placeholder-[var(--text-secondary)] transition-all outline-none"
          />
          {query && (
            <span className="absolute right-3 text-[11px] font-medium text-[var(--text-secondary)]">
              {isSearching ? 'Searching...' : `${totalMatches} found`}
            </span>
          )}
        </div>

        {/* Dropdown Suggestions */}
        {isOpen && suggestions.length > 0 && (
          <div className="absolute top-full left-0 right-0 mt-2 bg-[var(--surface)] border border-[var(--border)] rounded-2xl shadow-2xl p-2 z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150">
            <div className="px-3 py-1.5 flex items-center justify-between border-b border-[var(--border)] text-[11px] font-semibold uppercase text-[var(--text-secondary)] tracking-wider">
              <span>Instant Suggestions (BST & Hash Index)</span>
              <span>{totalMatches} matches</span>
            </div>
            <div className="py-1 divide-y divide-[var(--border)]/40 max-h-80 overflow-y-auto">
              {suggestions.map((item) => (
                <button
                  key={item.id}
                  onClick={() => handleSelect(item.id)}
                  className="w-full text-left p-3 hover:bg-[var(--surface-secondary)] rounded-xl transition-colors flex items-center justify-between gap-4 group"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-[var(--text-primary)] group-hover:text-blue-500 transition-colors truncate">
                      {item.title}
                    </p>
                    <p className="text-xs text-[var(--text-secondary)] truncate">
                      {item.author} · {item.category}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                        item.available_copies > 0
                          ? 'bg-emerald-500/10 text-emerald-500'
                          : 'bg-rose-500/10 text-rose-500'
                      }`}
                    >
                      {item.available_copies > 0 ? `${item.available_copies} available` : 'Waitlist'}
                    </span>
                    <ArrowRight className="w-3.5 h-3.5 text-[var(--text-secondary)] group-hover:translate-x-0.5 transition-transform" />
                  </div>
                </button>
              ))}
            </div>

            {/* Quick links to technical visualizations */}
            <div className="p-2 border-t border-[var(--border)] bg-[var(--surface-secondary)]/50 rounded-xl flex items-center justify-between text-xs text-[var(--text-secondary)]">
              <span>Try technical searches:</span>
              <div className="flex gap-2">
                <Link
                  href="/books?isbn=9780132350884"
                  onClick={() => setIsOpen(false)}
                  className="px-2 py-1 bg-[var(--surface)] rounded border border-[var(--border)] hover:text-blue-500 flex items-center gap-1 text-[11px]"
                >
                  <Hash className="w-3 h-3" /> Hash ISBN Lookup
                </Link>
                <Link
                  href="/books?titleSearch=Operating%20Systems"
                  onClick={() => setIsOpen(false)}
                  className="px-2 py-1 bg-[var(--surface)] rounded border border-[var(--border)] hover:text-blue-500 flex items-center gap-1 text-[11px]"
                >
                  <Binary className="w-3 h-3" /> BST Search
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Header Actions */}
      <div className="flex items-center gap-3 shrink-0">
        {/* Theme Toggle */}
        <button
          onClick={toggleTheme}
          aria-label="Toggle color theme"
          className="p-2.5 rounded-xl border border-[var(--border)] bg-[var(--surface)] hover:bg-[var(--surface-secondary)] text-[var(--text-primary)] transition-all"
        >
          {theme === 'dark' ? (
            <Sun className="w-4.5 h-4.5 text-amber-400" />
          ) : (
            <Moon className="w-4.5 h-4.5 text-slate-700" />
          )}
        </button>

        {/* Notifications Icon */}
        <div className="relative">
          <button
            aria-label="Notifications"
            className="p-2.5 rounded-xl border border-[var(--border)] bg-[var(--surface)] hover:bg-[var(--surface-secondary)] text-[var(--text-primary)] transition-all"
          >
            <Bell className="w-4.5 h-4.5 text-[var(--text-secondary)]" />
            <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-blue-600 ring-2 ring-[var(--surface)]" />
          </button>
        </div>

        {/* User avatar badge */}
        <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white text-xs font-bold shadow-md shadow-blue-500/20">
          A
        </div>
      </div>
    </header>
  );
}
