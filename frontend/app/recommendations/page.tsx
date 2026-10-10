'use client';

import React, { useState, useEffect } from 'react';
import {
  Share2,
  Sparkles,
  ArrowRight,
  BookOpen,
  GitFork,
  Layers,
} from 'lucide-react';
import { api } from '@/lib/api';
import { GraphResponse, RecommendationResponse, Book } from '@/types';
import BookCover from '@/components/BookCover';

export default function RecommendationsPage() {
  const [graphData, setGraphData] = useState<GraphResponse | null>(null);
  const [selectedBookId, setSelectedBookId] = useState<number | null>(null);
  const [recs, setRecs] = useState<RecommendationResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getRecommendationGraph()
      .then((data) => {
        setGraphData(data);
        if (data.nodes.length > 0) {
          setSelectedBookId(data.nodes[0].id);
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (selectedBookId) {
      api.getRecommendations(selectedBookId, 6).then(setRecs).catch(console.error);
    }
  }, [selectedBookId]);

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-4 border-b border-[var(--border)]">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 text-xs font-semibold mb-3">
            <Share2 className="w-3.5 h-3.5" /> Adjacency-List Graph & BFS Recommendations
          </div>
          <h1 className="text-3xl md:text-5xl font-black tracking-tight text-[var(--text-primary)]">
            Recommendation Network
          </h1>
          <p className="mt-2 text-sm text-[var(--text-secondary)]">
            Discover books connected through topics, shared authors, and prerequisite relations via Breadth-First Search (BFS).
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Graph Nodes Selector */}
        <div className="lg:col-span-5 space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)]">
            Graph Vertices (Select a Source Book)
          </h3>
          <div className="max-h-[560px] overflow-y-auto space-y-2 pr-1">
            {graphData?.nodes.map((node) => (
              <button
                key={node.id}
                onClick={() => setSelectedBookId(node.id)}
                className={`w-full text-left p-3.5 rounded-2xl border transition-all flex items-center justify-between ${
                  selectedBookId === node.id
                    ? 'bg-[var(--surface-secondary)] border-blue-500/60 shadow-md'
                    : 'bg-[var(--surface)] border-[var(--border)] hover:border-blue-500/30'
                }`}
              >
                <div className="min-w-0 pr-2">
                  <p className="text-xs font-bold text-[var(--text-primary)] truncate">
                    {node.title}
                  </p>
                  <p className="text-[11px] text-[var(--text-secondary)] truncate">
                    {node.author}
                  </p>
                </div>
                <span className="font-mono text-[10px] px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-500 font-bold shrink-0">
                  {node.degree} edges
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Recommendations & BFS Paths */}
        <div className="lg:col-span-7 space-y-6">
          {recs ? (
            <>
              {/* Selected Origin Card */}
              <div className="p-6 rounded-3xl bg-[var(--surface)] border border-[var(--border)] shadow-sm flex items-center gap-6">
                <BookCover
                  title={recs.book.title}
                  author={recs.book.author}
                  categorySlug={recs.book.category.slug}
                  size="sm"
                  className="shrink-0"
                />
                <div>
                  <span className="text-[10px] font-mono uppercase font-bold text-blue-500">
                    STARTING VERTEX (HOP 0)
                  </span>
                  <h3 className="text-lg font-black text-[var(--text-primary)] mt-0.5">
                    {recs.book.title}
                  </h3>
                  <p className="text-xs text-[var(--text-secondary)]">
                    by {recs.book.author} · {recs.book.category.name}
                  </p>
                  <div className="mt-2 text-[11px] text-[var(--text-secondary)]">
                    Direct neighbours in adjacency list: <strong>{recs.neighbors.length}</strong>
                  </div>
                </div>
              </div>

              {/* BFS Recommendations Cards */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)]">
                    Recommended for You (BFS Depth ≤ 2)
                  </h3>
                  <span className="font-mono text-[11px] text-blue-500">
                    O(V + E) Traversal
                  </span>
                </div>

                <div className="space-y-2.5">
                  {recs.recommendations.map((item, idx) => (
                    <div
                      key={item.book.id}
                      className="p-4 rounded-2xl bg-[var(--surface)] border border-[var(--border)] hover:border-blue-500/40 shadow-xs flex items-center justify-between gap-4 transition-all"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="w-6 h-6 rounded-lg bg-blue-500/10 text-blue-500 font-bold font-mono text-xs flex items-center justify-center shrink-0">
                          {idx + 1}
                        </span>
                        <div className="min-w-0">
                          <p className="font-bold text-xs text-[var(--text-primary)] truncate">
                            {item.book.title}
                          </p>
                          <p className="text-[11px] text-[var(--text-secondary)] truncate">
                            {item.book.author} · {item.reason}
                          </p>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 block">
                          {item.distance} Hop{item.distance > 1 ? 's' : ''} away
                        </span>
                        <span className="text-[10px] text-[var(--text-secondary)] font-mono">
                          Score: {item.score}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* BFS Traversal Order */}
              <div className="p-4 rounded-2xl bg-[var(--surface-secondary)] border border-[var(--border)] text-xs space-y-2">
                <span className="font-semibold text-[var(--text-primary)] block">
                  BFS Traversal Order:
                </span>
                <p className="font-mono text-[11px] text-[var(--text-secondary)] break-words">
                  {recs.bfs_order.join(' ➔ ')}
                </p>
              </div>
            </>
          ) : (
            <div className="py-20 text-center text-xs text-[var(--text-secondary)]">
              Loading graph traversal...
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
