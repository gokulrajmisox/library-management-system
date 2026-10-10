"""Stack (LIFO) built on linked nodes.

C equivalent:

    typedef struct StackNode { IssueOp data; struct StackNode *next; } StackNode;
    typedef struct { StackNode *top; int size; } Stack;

    void push(Stack *s, IssueOp op);   // O(1)
    IssueOp pop(Stack *s);             // O(1)
    IssueOp peek(Stack *s);            // O(1)

Used by the library as the *undo stack* for book-issue operations.
"""

from __future__ import annotations

from typing import Generic, Iterator, Optional, TypeVar

T = TypeVar("T")


class StackUnderflowError(Exception):
    pass


class _StackNode(Generic[T]):
    __slots__ = ("data", "next")

    def __init__(self, data: T, next_node: Optional["_StackNode[T]"]) -> None:
        self.data = data
        self.next = next_node


class Stack(Generic[T]):
    def __init__(self, capacity: Optional[int] = None) -> None:
        self.top: Optional[_StackNode[T]] = None
        self.size = 0
        self.capacity = capacity

    def push(self, item: T) -> None:
        self.top = _StackNode(item, self.top)
        self.size += 1
        if self.capacity is not None and self.size > self.capacity:
            self._drop_bottom()

    def pop(self) -> T:
        if self.top is None:
            raise StackUnderflowError("pop from empty stack")
        node = self.top
        self.top = node.next
        self.size -= 1
        return node.data

    def peek(self) -> T:
        if self.top is None:
            raise StackUnderflowError("peek on empty stack")
        return self.top.data

    def is_empty(self) -> bool:
        return self.top is None

    def clear(self) -> None:
        self.top = None
        self.size = 0

    def _drop_bottom(self) -> None:
        # Bounded history: discard the oldest entry (bottom of the stack).
        if self.top is None or self.top.next is None:
            return
        cur = self.top
        while cur.next is not None and cur.next.next is not None:
            cur = cur.next
        cur.next = None
        self.size -= 1

    def to_list(self) -> list[T]:
        """Top first."""
        return list(iter(self))

    def __iter__(self) -> Iterator[T]:
        cur = self.top
        while cur is not None:
            yield cur.data
            cur = cur.next

    def __len__(self) -> int:
        return self.size
