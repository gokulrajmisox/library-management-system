"""Undirected weighted Graph using an adjacency list.

C equivalent:

    typedef struct AdjNode { int vertex; int weight; struct AdjNode *next; } AdjNode;
    typedef struct { int n; AdjNode **adj; } Graph;   /* adj[v] -> linked list */

Vertices are book ids; an edge means "related books" (same topic, prerequisite,
frequently borrowed together). Recommendations are produced by a bounded
Breadth-First Search that scores each reachable book by edge weight / distance.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Optional

from .queue import LinkedQueue


@dataclass
class Recommendation:
    book_id: int
    score: float
    distance: int
    via: Optional[int]  # predecessor on the BFS path
    path: list[int] = field(default_factory=list)


class Graph:
    def __init__(self) -> None:
        # adjacency list: vertex -> {neighbor: weight}
        self.adj: dict[int, dict[int, int]] = {}

    def add_vertex(self, v: int) -> None:
        if v not in self.adj:
            self.adj[v] = {}

    def remove_vertex(self, v: int) -> None:
        for n in list(self.adj.get(v, {})):
            self.adj[n].pop(v, None)
        self.adj.pop(v, None)

    def add_edge(self, u: int, v: int, weight: int = 1) -> None:
        if u == v:
            return
        self.add_vertex(u)
        self.add_vertex(v)
        w = max(weight, self.adj[u].get(v, 0))
        self.adj[u][v] = w
        self.adj[v][u] = w

    def remove_edge(self, u: int, v: int) -> None:
        self.adj.get(u, {}).pop(v, None)
        self.adj.get(v, {}).pop(u, None)

    def neighbors(self, v: int) -> dict[int, int]:
        return dict(self.adj.get(v, {}))

    def degree(self, v: int) -> int:
        return len(self.adj.get(v, {}))

    def bfs_order(self, start: int) -> list[int]:
        if start not in self.adj:
            return []
        seen = {start}
        order: list[int] = []
        q: LinkedQueue[int] = LinkedQueue()
        q.enqueue(start)
        while not q.is_empty():
            v = q.dequeue()
            order.append(v)
            for n in sorted(self.adj[v]):
                if n not in seen:
                    seen.add(n)
                    q.enqueue(n)
        return order

    def recommend(self, start: int, max_depth: int = 2, limit: int = 8) -> list[Recommendation]:
        """BFS up to ``max_depth`` hops. score = sum(weight / distance) over discovering edges."""
        if start not in self.adj:
            return []
        dist: dict[int, int] = {start: 0}
        parent: dict[int, Optional[int]] = {start: None}
        score: dict[int, float] = {}
        q: LinkedQueue[int] = LinkedQueue()
        q.enqueue(start)
        while not q.is_empty():
            v = q.dequeue()
            if dist[v] >= max_depth:
                continue
            for n, w in self.adj[v].items():
                if n == start:
                    continue
                d = dist[v] + 1
                if n not in dist:
                    dist[n] = d
                    parent[n] = v
                    q.enqueue(n)
                if dist[n] == d:
                    score[n] = score.get(n, 0.0) + w / d

        def path_to(n: int) -> list[int]:
            p: list[int] = []
            cur: Optional[int] = n
            while cur is not None:
                p.append(cur)
                cur = parent[cur]
            return list(reversed(p))

        recs = [Recommendation(n, round(s, 3), dist[n], parent[n], path_to(n)) for n, s in score.items()]
        recs.sort(key=lambda r: (r.distance, -r.score, r.book_id))
        return recs[:limit]

    def edges(self) -> list[tuple[int, int, int]]:
        out: list[tuple[int, int, int]] = []
        for u, nbrs in self.adj.items():
            for v, w in nbrs.items():
                if u < v:
                    out.append((u, v, w))
        return out

    def vertex_count(self) -> int:
        return len(self.adj)

    def edge_count(self) -> int:
        return sum(len(n) for n in self.adj.values()) // 2
