"""Singly Linked List.

C equivalent:

    typedef struct Node {
        void *data;
        struct Node *next;
    } Node;

    typedef struct {
        Node *head;
        Node *tail;
        int size;
    } LinkedList;

Used by the library for the circulation activity log (newest first) and as the
storage backbone for Stack and Queue.
"""

from __future__ import annotations

from typing import Callable, Generic, Iterator, Optional, TypeVar

T = TypeVar("T")


class Node(Generic[T]):
    __slots__ = ("data", "next")

    def __init__(self, data: T, next_node: Optional["Node[T]"] = None) -> None:
        self.data = data
        self.next = next_node


class SinglyLinkedList(Generic[T]):
    def __init__(self) -> None:
        self.head: Optional[Node[T]] = None
        self.tail: Optional[Node[T]] = None
        self.size = 0

    # ---- insertion -------------------------------------------------------
    def insert_head(self, data: T) -> None:
        """O(1)"""
        node = Node(data, self.head)
        self.head = node
        if self.tail is None:
            self.tail = node
        self.size += 1

    def insert_tail(self, data: T) -> None:
        """O(1) thanks to the tail pointer."""
        node = Node(data)
        if self.tail is None:
            self.head = self.tail = node
        else:
            self.tail.next = node
            self.tail = node
        self.size += 1

    def insert_at(self, index: int, data: T) -> None:
        """O(n). Inserts so that the new node ends up at position ``index``."""
        if index < 0 or index > self.size:
            raise IndexError("index out of range")
        if index == 0:
            self.insert_head(data)
            return
        if index == self.size:
            self.insert_tail(data)
            return
        prev = self.head
        for _ in range(index - 1):
            assert prev is not None
            prev = prev.next
        assert prev is not None
        prev.next = Node(data, prev.next)
        self.size += 1

    # ---- deletion --------------------------------------------------------
    def delete_head(self) -> T:
        if self.head is None:
            raise IndexError("delete from empty list")
        node = self.head
        self.head = node.next
        if self.head is None:
            self.tail = None
        self.size -= 1
        return node.data

    def delete_at(self, index: int) -> T:
        """O(n)"""
        if index < 0 or index >= self.size:
            raise IndexError("index out of range")
        if index == 0:
            return self.delete_head()
        prev = self.head
        for _ in range(index - 1):
            assert prev is not None
            prev = prev.next
        assert prev is not None and prev.next is not None
        target = prev.next
        prev.next = target.next
        if target is self.tail:
            self.tail = prev
        self.size -= 1
        return target.data

    def delete_where(self, predicate: Callable[[T], bool]) -> Optional[T]:
        """Remove the first node whose data satisfies ``predicate``. O(n)."""
        prev: Optional[Node[T]] = None
        cur = self.head
        while cur is not None:
            if predicate(cur.data):
                if prev is None:
                    self.head = cur.next
                else:
                    prev.next = cur.next
                if cur is self.tail:
                    self.tail = prev
                self.size -= 1
                return cur.data
            prev, cur = cur, cur.next
        return None

    def truncate(self, max_size: int) -> None:
        """Keep only the first ``max_size`` nodes (used to bound the activity log)."""
        if max_size <= 0:
            self.head = self.tail = None
            self.size = 0
            return
        if self.size <= max_size:
            return
        cur = self.head
        for _ in range(max_size - 1):
            assert cur is not None
            cur = cur.next
        assert cur is not None
        cur.next = None
        self.tail = cur
        self.size = max_size

    # ---- queries ---------------------------------------------------------
    def find(self, predicate: Callable[[T], bool]) -> Optional[T]:
        cur = self.head
        while cur is not None:
            if predicate(cur.data):
                return cur.data
            cur = cur.next
        return None

    def get(self, index: int) -> T:
        if index < 0 or index >= self.size:
            raise IndexError("index out of range")
        cur = self.head
        for _ in range(index):
            assert cur is not None
            cur = cur.next
        assert cur is not None
        return cur.data

    def to_list(self) -> list[T]:
        return list(iter(self))

    def __iter__(self) -> Iterator[T]:
        cur = self.head
        while cur is not None:
            yield cur.data
            cur = cur.next

    def __len__(self) -> int:
        return self.size

    def is_empty(self) -> bool:
        return self.size == 0
