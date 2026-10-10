"""Binary Search Tree keyed by book title.

C equivalent:

    typedef struct BSTNode {
        char key[256];      /* lowercase title */
        int  book_id;
        struct BSTNode *left, *right;
    } BSTNode;

Keys are (lowercase_title, book_id) tuples so that duplicate titles are allowed
while ordering stays total. The tree is built balanced on (re)load by inserting
medians first, then grows with ordinary BST insertion.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Optional

Key = tuple[str, int]


class BSTNode:
    __slots__ = ("key", "title", "left", "right")

    def __init__(self, key: Key, title: str) -> None:
        self.key = key
        self.title = title
        self.left: Optional[BSTNode] = None
        self.right: Optional[BSTNode] = None


@dataclass
class BSTSearchTrace:
    query: str
    path: list[dict[str, Any]] = field(default_factory=list)
    found: bool = False
    book_id: Optional[int] = None
    comparisons: int = 0


class BinarySearchTree:
    def __init__(self) -> None:
        self.root: Optional[BSTNode] = None
        self.size = 0

    @staticmethod
    def normalize(title: str) -> str:
        return " ".join(title.strip().lower().split())

    # ---- build -----------------------------------------------------------
    def build_balanced(self, items: list[tuple[str, int]]) -> None:
        """items: (title, book_id). Inserts medians first -> height ~ log2(n)."""
        self.root = None
        self.size = 0
        ordered = sorted(items, key=lambda t: (self.normalize(t[0]), t[1]))

        def insert_range(lo: int, hi: int) -> None:
            if lo > hi:
                return
            mid = (lo + hi) // 2
            self.insert(ordered[mid][0], ordered[mid][1])
            insert_range(lo, mid - 1)
            insert_range(mid + 1, hi)

        insert_range(0, len(ordered) - 1)

    # ---- operations ------------------------------------------------------
    def insert(self, title: str, book_id: int) -> None:
        key = (self.normalize(title), book_id)
        node = BSTNode(key, title)
        if self.root is None:
            self.root = node
            self.size += 1
            return
        cur = self.root
        while True:
            if key == cur.key:
                cur.title = title
                return
            if key < cur.key:
                if cur.left is None:
                    cur.left = node
                    break
                cur = cur.left
            else:
                if cur.right is None:
                    cur.right = node
                    break
                cur = cur.right
        self.size += 1

    def delete(self, title: str, book_id: int) -> bool:
        key = (self.normalize(title), book_id)
        removed = [False]

        def _delete(node: Optional[BSTNode], k: Key) -> Optional[BSTNode]:
            if node is None:
                return None
            if k < node.key:
                node.left = _delete(node.left, k)
            elif k > node.key:
                node.right = _delete(node.right, k)
            else:
                removed[0] = True
                if node.left is None:
                    return node.right
                if node.right is None:
                    return node.left
                # two children: replace with in-order successor
                succ = node.right
                while succ.left is not None:
                    succ = succ.left
                node.key, node.title = succ.key, succ.title
                node.right = _delete_exact(node.right, succ.key)
            return node

        def _delete_exact(node: Optional[BSTNode], k: Key) -> Optional[BSTNode]:
            if node is None:
                return None
            if k < node.key:
                node.left = _delete_exact(node.left, k)
                return node
            if k > node.key:
                node.right = _delete_exact(node.right, k)
                return node
            return node.right if node.left is None else node.left

        self.root = _delete(self.root, key)
        if removed[0]:
            self.size -= 1
        return removed[0]

    def search(self, title: str) -> BSTSearchTrace:
        """Exact (case-insensitive) title search, recording the visited path."""
        q = self.normalize(title)
        trace = BSTSearchTrace(query=title)
        cur = self.root
        while cur is not None:
            trace.comparisons += 1
            node_title = cur.key[0]
            if q == node_title:
                trace.path.append({"title": cur.title, "book_id": cur.key[1], "direction": "found"})
                trace.found = True
                trace.book_id = cur.key[1]
                return trace
            direction = "left" if q < node_title else "right"
            trace.path.append({"title": cur.title, "book_id": cur.key[1], "direction": direction})
            cur = cur.left if direction == "left" else cur.right
        return trace

    def prefix_search(self, prefix: str, limit: int = 10) -> list[int]:
        """In-order walk restricted to the subtree range that can match the prefix."""
        p = self.normalize(prefix)
        out: list[int] = []

        def walk(node: Optional[BSTNode]) -> None:
            if node is None or len(out) >= limit:
                return
            t = node.key[0]
            if t.startswith(p):
                # matches may exist on both sides
                walk(node.left)
                if len(out) < limit:
                    out.append(node.key[1])
                walk(node.right)
            elif t < p:
                walk(node.right)  # everything on the left is even smaller
            else:
                walk(node.left)  # everything on the right is even larger

        walk(self.root)
        return out

    def inorder(self) -> list[tuple[str, int]]:
        out: list[tuple[str, int]] = []
        stack: list[BSTNode] = []
        cur = self.root
        while stack or cur is not None:
            while cur is not None:
                stack.append(cur)
                cur = cur.left
            cur = stack.pop()
            out.append((cur.title, cur.key[1]))
            cur = cur.right
        return out

    def height(self) -> int:
        def h(node: Optional[BSTNode]) -> int:
            if node is None:
                return 0
            return 1 + max(h(node.left), h(node.right))

        return h(self.root)

    def to_dict(self) -> Optional[dict[str, Any]]:
        def conv(node: Optional[BSTNode]) -> Optional[dict[str, Any]]:
            if node is None:
                return None
            return {
                "title": node.title,
                "book_id": node.key[1],
                "left": conv(node.left),
                "right": conv(node.right),
            }

        return conv(self.root)

    def __len__(self) -> int:
        return self.size
