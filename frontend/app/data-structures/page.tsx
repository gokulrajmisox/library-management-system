'use client';

import React, { useState, useEffect } from 'react';
import {
  Cpu,
  Layers,
  Sparkles,
  Play,
  RotateCcw,
  ArrowRight,
  Database,
  Hash,
  Binary,
  Share2,
  ListOrdered,
  Plus,
  Trash2,
  Search,
} from 'lucide-react';
import { api } from '@/lib/api';
import { DSStatusResponse } from '@/types';

type Tab = 'list' | 'stack' | 'queue' | 'hashtable' | 'bst' | 'graph';

export default function DataStructuresLabPage() {
  const [activeTab, setActiveTab] = useState<Tab>('hashtable');
  const [status, setStatus] = useState<DSStatusResponse | null>(null);
  const [hashDetail, setHashDetail] = useState<any>(null);
  const [bstDetail, setBstDetail] = useState<any>(null);

  // Interactive Playground states for List / Stack / Queue
  const [pgStructure, setPgStructure] = useState<'list' | 'stack' | 'queue'>('stack');
  const [pgState, setPgState] = useState<string[]>([]);
  const [pgValue, setPgValue] = useState('');
  const [pgIndex, setPgIndex] = useState(0);
  const [pgFeedback, setPgFeedback] = useState<string | null>(null);

  const fetchStatus = async () => {
    try {
      const s = await api.getDSStatus();
      setStatus(s);
      const [h, b] = await Promise.all([
        api.getHashTableDetail(),
        api.getBSTDetail(),
      ]);
      setHashDetail(h);
      setBstDetail(b);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  const loadPlayground = async (st: 'list' | 'stack' | 'queue') => {
    setPgStructure(st);
    try {
      const res = await api.getPlaygroundState(st);
      setPgState(res.state);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (activeTab === 'list' || activeTab === 'stack' || activeTab === 'queue') {
      loadPlayground(activeTab);
    }
  }, [activeTab]);

  const handlePlaygroundOp = async (op: string) => {
    try {
      const res = await api.runPlaygroundOp(pgStructure, op, pgValue, pgIndex);
      setPgState(res.state);
      setPgFeedback(`${res.message} [Complexity: ${res.complexity}]`);
      setPgValue('');
      setTimeout(() => setPgFeedback(null), 3500);
    } catch (err: any) {
      setPgFeedback(`Error: ${err.message}`);
    }
  };

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-4 border-b border-[var(--border)]">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 text-xs font-semibold mb-3">
            <Cpu className="w-3.5 h-3.5" /> BE CSE Capstone Core Engine
          </div>
          <h1 className="text-3xl md:text-5xl font-black tracking-tight text-[var(--text-primary)]">
            Data Structures Lab
          </h1>
          <p className="mt-2 text-sm text-[var(--text-secondary)]">
            Interactive visual verification of the 6 in-memory C-compatible data structures powering the system.
          </p>
        </div>
      </div>

      {/* 6 Data Structure Tabs */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          { id: 'hashtable', label: 'Hash Table', sub: 'O(1) ISBN Lookup', icon: Hash },
          { id: 'bst', label: 'Binary Search Tree', sub: 'O(log n) Titles', icon: Binary },
          { id: 'stack', label: 'Stack (LIFO)', sub: 'Undo Issue Logs', icon: Layers },
          { id: 'queue', label: 'Queue (FIFO)', sub: 'Waiting Lists', icon: ListOrdered },
          { id: 'graph', label: 'Graph', sub: 'BFS Recs', icon: Share2 },
          { id: 'list', label: 'Linked List', sub: 'Activity Feed', icon: ArrowRight },
        ].map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`p-4 rounded-2xl border text-left transition-all ${
                activeTab === tab.id
                  ? 'bg-blue-600 text-white border-blue-600 shadow-lg shadow-blue-500/25 scale-102'
                  : 'bg-[var(--surface)] text-[var(--text-primary)] border-[var(--border)] hover:border-blue-500/30'
              }`}
            >
              <Icon className="w-5 h-5 mb-2" />
              <p className="font-bold text-xs">{tab.label}</p>
              <p
                className={`text-[10px] mt-0.5 ${
                  activeTab === tab.id ? 'text-white/80' : 'text-[var(--text-secondary)]'
                }`}
              >
                {tab.sub}
              </p>
            </button>
          );
        })}
      </div>

      {/* Tab 1: Hash Table Visualization */}
      {activeTab === 'hashtable' && (
        <div className="p-6 md:p-8 rounded-3xl bg-[var(--surface)] border border-[var(--border)] shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[var(--border)] pb-4">
            <div>
              <h3 className="text-lg font-black text-[var(--text-primary)]">
                Hash Table with Separate Chaining
              </h3>
              <p className="text-xs text-[var(--text-secondary)]">
                ISBN string keys mapped via 32-bit djb2 hash function into prime bucket arrays.
              </p>
            </div>
            {status && (
              <div className="flex items-center gap-3 font-mono text-xs">
                <span className="p-2 rounded-lg bg-[var(--surface-secondary)]">
                  Capacity: {status.hash_table.capacity}
                </span>
                <span className="p-2 rounded-lg bg-[var(--surface-secondary)]">
                  Load Factor: {status.hash_table.load_factor}
                </span>
                <span className="p-2 rounded-lg bg-emerald-500/10 text-emerald-500 font-bold">
                  Collisions: {status.hash_table.collisions}
                </span>
              </div>
            )}
          </div>

          {/* Buckets Grid */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)]">
              Buckets & Linked Chains
            </h4>
            <div className="max-h-[500px] overflow-y-auto space-y-2 pr-1">
              {hashDetail?.buckets.map((bucket: any) => (
                <div
                  key={bucket.index}
                  className="p-3 bg-[var(--surface-secondary)] rounded-xl border border-[var(--border)] flex flex-wrap items-center gap-3 text-xs"
                >
                  <span className="font-mono font-bold text-blue-500 shrink-0 w-20">
                    Bucket #{bucket.index}:
                  </span>
                  {bucket.entries.length === 0 ? (
                    <span className="text-[var(--text-secondary)] italic text-[11px]">NULL (Empty)</span>
                  ) : (
                    <div className="flex flex-wrap items-center gap-2">
                      {bucket.entries.map((entry: any, i: number) => (
                        <React.Fragment key={entry.isbn}>
                          <span className="px-2.5 py-1 rounded-lg bg-[var(--surface)] border border-[var(--border)] font-semibold text-[11px] text-[var(--text-primary)] shadow-2xs">
                            {entry.title} <span className="font-mono text-[9px] text-[var(--text-secondary)]">({entry.isbn.slice(-4)})</span>
                          </span>
                          {i < bucket.entries.length - 1 && (
                            <span className="text-blue-500 font-bold font-mono">➔</span>
                          )}
                        </React.Fragment>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: BST Visualization */}
      {activeTab === 'bst' && (
        <div className="p-6 md:p-8 rounded-3xl bg-[var(--surface)] border border-[var(--border)] shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[var(--border)] pb-4">
            <div>
              <h3 className="text-lg font-black text-[var(--text-primary)]">
                Binary Search Tree (Title Index)
              </h3>
              <p className="text-xs text-[var(--text-secondary)]">
                Alphabetically balanced binary tree providing O(log n) searches and prefix walks.
              </p>
            </div>
            {status && (
              <div className="flex items-center gap-3 font-mono text-xs">
                <span className="p-2 rounded-lg bg-[var(--surface-secondary)]">
                  Total Nodes: {status.bst.nodes}
                </span>
                <span className="p-2 rounded-lg bg-[var(--surface-secondary)]">
                  Height: {status.bst.height}
                </span>
                <span className="p-2 rounded-lg bg-blue-500/10 text-blue-500 font-bold">
                  Root: &quot;{status.bst.root}&quot;
                </span>
              </div>
            )}
          </div>

          <div className="p-6 bg-[var(--surface-secondary)] rounded-2xl border border-[var(--border)] text-center space-y-4">
            <span className="text-xs font-mono text-emerald-500 uppercase tracking-widest font-bold">
              HIERARCHICAL TREE STRUCTURE
            </span>
            <div className="max-w-md mx-auto p-4 bg-[var(--surface)] rounded-2xl border border-[var(--border)] shadow-sm text-xs font-bold">
              🌲 ROOT: {bstDetail?.root?.title || 'Loading...'}
            </div>
            <div className="grid grid-cols-2 gap-4 max-w-lg mx-auto text-xs">
              <div className="p-3 bg-[var(--surface)] rounded-xl border border-[var(--border)]">
                <span className="text-[10px] text-blue-500 font-mono block">LEFT SUBTREE (&lt; Root)</span>
                <span className="font-semibold">{bstDetail?.root?.left?.title || 'NULL'}</span>
              </div>
              <div className="p-3 bg-[var(--surface)] rounded-xl border border-[var(--border)]">
                <span className="text-[10px] text-emerald-500 font-mono block">RIGHT SUBTREE (&gt; Root)</span>
                <span className="font-semibold">{bstDetail?.root?.right?.title || 'NULL'}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: Interactive Sandbox for Stack, Queue, Linked List */}
      {(activeTab === 'stack' || activeTab === 'queue' || activeTab === 'list') && (
        <div className="p-6 md:p-8 rounded-3xl bg-[var(--surface)] border border-[var(--border)] shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[var(--border)] pb-4">
            <div>
              <h3 className="text-lg font-black text-[var(--text-primary)] uppercase">
                Interactive {activeTab} Sandbox
              </h3>
              <p className="text-xs text-[var(--text-secondary)]">
                Test real in-memory push/pop, enqueue/dequeue, or linked insertions with exact complexity measurements.
              </p>
            </div>
            <button
              onClick={() => handlePlaygroundOp('reset')}
              className="px-3.5 py-1.5 rounded-xl border border-[var(--border)] hover:bg-[var(--surface-secondary)] text-xs font-semibold flex items-center gap-1.5 transition-all self-start sm:self-auto"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset State</span>
            </button>
          </div>

          {pgFeedback && (
            <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-600 dark:text-blue-400 text-xs font-semibold">
              {pgFeedback}
            </div>
          )}

          {/* Action Toolbar */}
          <div className="p-4 bg-[var(--surface-secondary)] rounded-2xl border border-[var(--border)] flex flex-wrap items-center gap-3">
            <input
              type="text"
              value={pgValue}
              onChange={(e) => setPgValue(e.target.value)}
              placeholder="Enter node value (e.g. Issue #143, Member 04)..."
              className="px-3 py-2 rounded-xl bg-[var(--surface)] border border-[var(--border)] text-xs text-[var(--text-primary)] outline-none min-w-[220px]"
            />

            {/* Structure-specific operations */}
            {activeTab === 'stack' && (
              <>
                <button
                  onClick={() => handlePlaygroundOp('push')}
                  className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs transition-all"
                >
                  PUSH (Top)
                </button>
                <button
                  onClick={() => handlePlaygroundOp('pop')}
                  className="px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-xs transition-all"
                >
                  POP
                </button>
                <button
                  onClick={() => handlePlaygroundOp('peek')}
                  className="px-3.5 py-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] hover:bg-[var(--surface-secondary)] text-xs font-semibold transition-all"
                >
                  PEEK
                </button>
              </>
            )}

            {activeTab === 'queue' && (
              <>
                <button
                  onClick={() => handlePlaygroundOp('enqueue')}
                  className="px-3.5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-xs transition-all"
                >
                  ENQUEUE (Rear)
                </button>
                <button
                  onClick={() => handlePlaygroundOp('dequeue')}
                  className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition-all"
                >
                  DEQUEUE (Front)
                </button>
                <button
                  onClick={() => handlePlaygroundOp('peek')}
                  className="px-3.5 py-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] hover:bg-[var(--surface-secondary)] text-xs font-semibold transition-all"
                >
                  PEEK
                </button>
              </>
            )}

            {activeTab === 'list' && (
              <>
                <button
                  onClick={() => handlePlaygroundOp('insert_head')}
                  className="px-3 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all"
                >
                  Insert HEAD
                </button>
                <button
                  onClick={() => handlePlaygroundOp('insert_tail')}
                  className="px-3 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all"
                >
                  Insert TAIL
                </button>
                <button
                  onClick={() => handlePlaygroundOp('delete_head')}
                  className="px-3 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-all"
                >
                  Delete HEAD
                </button>
              </>
            )}
          </div>

          {/* Graphical Node Representation */}
          <div className="p-6 bg-[var(--surface-secondary)]/50 rounded-2xl border border-[var(--border)] min-h-[160px] flex items-center justify-center">
            {pgState.length === 0 ? (
              <span className="text-xs text-[var(--text-secondary)] italic">
                {activeTab} is currently empty.
              </span>
            ) : (
              <div className="flex flex-wrap items-center gap-3">
                {pgState.map((val, idx) => (
                  <React.Fragment key={idx}>
                    <div className="p-3.5 rounded-2xl bg-[var(--surface)] border border-blue-500/40 shadow-sm text-xs text-center min-w-[110px]">
                      <span className="text-[9px] font-mono text-[var(--text-secondary)] block uppercase">
                        {activeTab === 'stack' && idx === 0
                          ? 'TOP'
                          : activeTab === 'queue' && idx === 0
                          ? 'FRONT'
                          : activeTab === 'queue' && idx === pgState.length - 1
                          ? 'REAR'
                          : `Node ${idx + 1}`}
                      </span>
                      <span className="font-bold text-[var(--text-primary)]">{val}</span>
                    </div>
                    {idx < pgState.length - 1 && (
                      <span className="text-blue-500 font-mono text-sm font-bold">➔</span>
                    )}
                  </React.Fragment>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 6: Graph Summary */}
      {activeTab === 'graph' && (
        <div className="p-6 md:p-8 rounded-3xl bg-[var(--surface)] border border-[var(--border)] shadow-xs space-y-4">
          <h3 className="text-lg font-black text-[var(--text-primary)]">
            Adjacency-List Graph Recommendation Topology
          </h3>
          <p className="text-xs text-[var(--text-secondary)]">
            Vertices: {status?.graph.vertices || 58} | Edges: {status?.graph.edges || 120}.
          </p>
          <div className="p-4 bg-[var(--surface-secondary)] rounded-2xl border border-[var(--border)] text-xs text-[var(--text-secondary)]">
            To view individual graph traversals, hop distances, and BFS orders, explore the{' '}
            <a href="/recommendations" className="text-blue-500 font-bold hover:underline">
              Recommendations page
            </a>
            .
          </div>
        </div>
      )}
    </div>
  );
}
