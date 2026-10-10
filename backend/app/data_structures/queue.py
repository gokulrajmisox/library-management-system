"""Queue (FIFO) using a linked list with FRONT and REAR pointers.

C equivalent:

    typedef struct QNode { int member_id; struct QNode *next; } QNode;
    typedef struct { QNode *front; QNode *rear; int size; } Queue;

    void enqueue(Queue *q, int member_id);  // O(1) - insert at rear
    int  dequeue(Queue *q);                 // O(1) - remove from front

Used by the library for per-book waiting lists.
"""

from __future__ import annotations

from typing import Callable, Generic, Iterator, Optional, TypeVar

T = TypeVar("T")


class QueueUnderflowError(Exception):
    pass


class _QNode(Generic[T]):
    __slots__ = ("data", "next")

    def __init__(self, data: T) -> None:
        self.data = data
        self.next: Optional["_QNode[T]"] = None


class LinkedQueue(Generic[T]):
    def __init__(self) -> None:
        self.front: Optional[_QNode[T]] = None
        self.rear: Optional[_QNode[T]] = None
        self.size = 0

    def enqueue(self, item: T) -> None:
        node = _QNode(item)
        if self.rear is None:
            self.front = self.rear = node
        else:
            self.rear.next = node
            self.rear = node
        self.size += 1

    def dequeue(self) -> T:
        if self.front is None:
            raise QueueUnderflowError("dequeue from empty queue")
        node = self.front
        self.front = node.next
        if self.front is None:
            self.rear = None
        self.size -= 1
        return node.data

    def peek(self) -> T:
        if self.front is None:
            raise QueueUnderflowError("peek on empty queue")
        return self.front.data

    def remove_where(self, predicate: Callable[[T], bool]) -> Optional[T]:
        """Cancel a reservation in the middle of the queue. O(n)."""
        prev: Optional[_QNode[T]] = None
        cur = self.front
        while cur is not None:
            if predicate(cur.data):
                if prev is None:
                    self.front = cur.next
                else:
                    prev.next = cur.next
                if cur is self.rear:
                    self.rear = prev
                self.size -= 1
                return cur.data
            prev, cur = cur, cur.next
        return None

    def contains(self, predicate: Callable[[T], bool]) -> bool:
        return any(predicate(x) for x in self)

    def position_of(self, predicate: Callable[[T], bool]) -> int:
        for i, x in enumerate(self):
            if predicate(x):
                return i
        return -1

    def is_empty(self) -> bool:
        return self.front is None

    def to_list(self) -> list[T]:
        """Front first."""
        return list(iter(self))

    def __iter__(self) -> Iterator[T]:
        cur = self.front
        while cur is not None:
            yield cur.data
            cur = cur.next

    def __len__(self) -> int:
        return self.size
