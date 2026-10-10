"""Hash Table with separate chaining.

Keys are ISBN strings (digits only); values are book ids.

Hash function (djb2, 32-bit, C-compatible):

    unsigned long hash(const char *str) {
        unsigned long h = 5381;
        int c;
        while ((c = *str++))
            h = ((h << 5) + h) + c;   /* h * 33 + c */
        return h & 0xFFFFFFFF;
    }

    bucket = hash(isbn) % capacity;

Each bucket holds a singly linked chain of (key, value) entries, so collisions
are visible and resolved by walking the chain.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Generic, Iterator, Optional, TypeVar

V = TypeVar("V")


def djb2(key: str) -> int:
    h = 5381
    for ch in key:
        h = ((h << 5) + h + ord(ch)) & 0xFFFFFFFF
    return h


def _is_prime(n: int) -> bool:
    if n < 2:
        return False
    i = 2
    while i * i <= n:
        if n % i == 0:
            return False
        i += 1
    return True


def _next_prime(n: int) -> int:
    while not _is_prime(n):
        n += 1
    return n


class _Entry(Generic[V]):
    __slots__ = ("key", "value", "next")

    def __init__(self, key: str, value: V, next_entry: Optional["_Entry[V]"]) -> None:
        self.key = key
        self.value = value
        self.next = next_entry


@dataclass
class HashTrace:
    key: str
    hash_value: int
    capacity: int
    bucket: int
    chain: list[str]
    comparisons: int
    found: bool
    value: Optional[object]


class HashTable(Generic[V]):
    def __init__(self, capacity: int = 31, max_load_factor: float = 2.5) -> None:
        self.capacity = _next_prime(capacity)
        self.max_load_factor = max_load_factor
        self.buckets: list[Optional[_Entry[V]]] = [None] * self.capacity
        self.size = 0

    def hash(self, key: str) -> int:
        return djb2(key)

    def bucket_index(self, key: str) -> int:
        return self.hash(key) % self.capacity

    def put(self, key: str, value: V) -> None:
        idx = self.bucket_index(key)
        cur = self.buckets[idx]
        while cur is not None:
            if cur.key == key:
                cur.value = value
                return
            cur = cur.next
        # insert at head of the chain: O(1)
        self.buckets[idx] = _Entry(key, value, self.buckets[idx])
        self.size += 1
        if self.load_factor > self.max_load_factor:
            self._resize(_next_prime(self.capacity * 2))

    def get(self, key: str) -> Optional[V]:
        cur = self.buckets[self.bucket_index(key)]
        while cur is not None:
            if cur.key == key:
                return cur.value
            cur = cur.next
        return None

    def contains(self, key: str) -> bool:
        return self.get(key) is not None

    def remove(self, key: str) -> bool:
        idx = self.bucket_index(key)
        prev: Optional[_Entry[V]] = None
        cur = self.buckets[idx]
        while cur is not None:
            if cur.key == key:
                if prev is None:
                    self.buckets[idx] = cur.next
                else:
                    prev.next = cur.next
                self.size -= 1
                return True
            prev, cur = cur, cur.next
        return False

    def search_trace(self, key: str) -> HashTrace:
        """Lookup that records every step for the visualizer."""
        h = self.hash(key)
        idx = h % self.capacity
        chain: list[str] = []
        comparisons = 0
        found_value: Optional[V] = None
        found = False
        cur = self.buckets[idx]
        while cur is not None:
            chain.append(cur.key)
            comparisons += 1
            if cur.key == key:
                found = True
                found_value = cur.value
                break
            cur = cur.next
        # include the rest of the chain so the UI can draw it fully
        full_chain = [e.key for e in self._iter_chain(idx)]
        return HashTrace(key, h, self.capacity, idx, full_chain, comparisons, found, found_value)

    def _iter_chain(self, idx: int) -> Iterator[_Entry[V]]:
        cur = self.buckets[idx]
        while cur is not None:
            yield cur
            cur = cur.next

    def _resize(self, new_capacity: int) -> None:
        old = self.buckets
        self.capacity = new_capacity
        self.buckets = [None] * new_capacity
        self.size = 0
        for head in old:
            cur = head
            while cur is not None:
                self.put(cur.key, cur.value)
                cur = cur.next

    @property
    def load_factor(self) -> float:
        return self.size / self.capacity

    def snapshot(self) -> list[list[tuple[str, V]]]:
        return [[(e.key, e.value) for e in self._iter_chain(i)] for i in range(self.capacity)]

    def collision_count(self) -> int:
        return sum(max(0, len(chain) - 1) for chain in self.snapshot())

    def clear(self) -> None:
        self.buckets = [None] * self.capacity
        self.size = 0

    def __len__(self) -> int:
        return self.size
