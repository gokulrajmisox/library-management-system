'use client';

import React from 'react';

// Generates high quality book cover aesthetic based on title and category
const CATEGORY_STYLES: Record<
  string,
  { bg: string; accent: string; pattern: string; tag: string }
> = {
  programming: {
    bg: 'from-blue-950 via-slate-900 to-indigo-950',
    accent: '#3B82F6',
    pattern: 'radial-gradient(circle at 20% 20%, rgba(59, 130, 246, 0.25), transparent 45%)',
    tag: 'CODE',
  },
  'data-structures': {
    bg: 'from-emerald-950 via-slate-900 to-teal-950',
    accent: '#10B981',
    pattern: 'radial-gradient(circle at 80% 30%, rgba(16, 185, 129, 0.25), transparent 45%)',
    tag: 'DSA',
  },
  'ai-ml': {
    bg: 'from-purple-950 via-slate-900 to-violet-950',
    accent: '#A855F7',
    pattern: 'radial-gradient(circle at 50% 10%, rgba(168, 85, 247, 0.25), transparent 50%)',
    tag: 'AI / ML',
  },
  dbms: {
    bg: 'from-amber-950 via-slate-900 to-orange-950',
    accent: '#F59E0B',
    pattern: 'radial-gradient(circle at 30% 70%, rgba(245, 158, 11, 0.2), transparent 45%)',
    tag: 'DATA',
  },
  networking: {
    bg: 'from-cyan-950 via-slate-900 to-sky-950',
    accent: '#06B6D4',
    pattern: 'radial-gradient(circle at 70% 80%, rgba(6, 182, 212, 0.25), transparent 45%)',
    tag: 'NETWORK',
  },
  'operating-systems': {
    bg: 'from-rose-950 via-slate-900 to-red-950',
    accent: '#F43F5E',
    pattern: 'radial-gradient(circle at 10% 50%, rgba(244, 63, 94, 0.25), transparent 45%)',
    tag: 'KERNEL',
  },
  fiction: {
    bg: 'from-fuchsia-950 via-slate-900 to-pink-950',
    accent: '#EC4899',
    pattern: 'radial-gradient(circle at 80% 80%, rgba(236, 72, 153, 0.25), transparent 45%)',
    tag: 'SCI-FI',
  },
};

interface BookCoverProps {
  title: string;
  author: string;
  categorySlug?: string;
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showSpine?: boolean;
}

export default function BookCover({
  title,
  author,
  categorySlug = 'programming',
  className = '',
  size = 'md',
  showSpine = true,
}: BookCoverProps) {
  const style = CATEGORY_STYLES[categorySlug] || CATEGORY_STYLES['programming'];

  const sizeDimensions = {
    sm: 'w-24 h-36 text-[10px]',
    md: 'w-44 h-64 text-xs',
    lg: 'w-60 h-88 text-sm',
    xl: 'w-72 h-104 text-base',
  }[size];

  return (
    <div
      className={`relative select-none rounded-xl overflow-hidden shadow-2xl transition-all duration-300 ${sizeDimensions} ${className}`}
      style={{
        boxShadow: `0 20px 35px -10px rgba(0, 0, 0, 0.6), 0 0 25px -5px ${style.accent}33`,
      }}
    >
      {/* Background Gradient & Geometric Glow */}
      <div
        className={`absolute inset-0 bg-gradient-to-br ${style.bg}`}
        style={{ backgroundImage: style.pattern }}
      />

      {/* Book Spine Texture / Lighting Effect */}
      {showSpine && (
        <>
          <div className="absolute top-0 left-0 bottom-0 w-3 bg-gradient-to-r from-white/20 via-transparent to-black/30 z-20 pointer-events-none" />
          <div className="absolute top-0 left-3 bottom-0 w-px bg-white/10 z-20 pointer-events-none" />
        </>
      )}

      {/* Outer subtle foil border */}
      <div className="absolute inset-2 border border-white/15 rounded-lg pointer-events-none z-10" />

      {/* Book Content */}
      <div className="relative z-10 h-full p-4 flex flex-col justify-between">
        {/* Top Tag & Accent Line */}
        <div>
          <div className="flex items-center justify-between gap-2">
            <span
              className="text-[9px] tracking-widest font-mono font-bold uppercase px-1.5 py-0.5 rounded border"
              style={{
                color: style.accent,
                borderColor: `${style.accent}44`,
                backgroundColor: `${style.accent}15`,
              }}
            >
              {style.tag}
            </span>
            <div
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: style.accent }}
            />
          </div>
          <div
            className="h-0.5 w-8 mt-2 rounded"
            style={{ backgroundColor: style.accent }}
          />
        </div>

        {/* Center Title */}
        <div className="my-auto py-2">
          <h3 className="font-extrabold text-white leading-tight tracking-tight drop-shadow-md line-clamp-3">
            {title}
          </h3>
          <p className="mt-1 text-white/70 font-medium text-[11px] line-clamp-1">
            {author}
          </p>
        </div>

        {/* Bottom Editorial Hallmark */}
        <div className="pt-2 border-t border-white/10 flex items-center justify-between text-[9px] text-white/40 font-mono tracking-wider">
          <span>LIBRARY PRESS</span>
          <span>EDITION I</span>
        </div>
      </div>
    </div>
  );
}
