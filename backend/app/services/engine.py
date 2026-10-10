"""The in-memory Data Structure Engine.

The database is the source of truth; the engine mirrors it into the classic
structures so that look-ups and visualizations run through real DS code:

* HashTable      ISBN  -> book_id                 (O(1) average lookup)
* BinarySearchTree title -> book_id               (O(log n) average search)
* Graph          book_id adjacency list            (BFS recommendations)
* Stack          undo history of issue operations  (LIFO)
* LinkedQueue    one waiting-list queue per book   (FIFO)
* SinglyLinkedList activity log, newest first
"""

from __future__ import annotations

import threading
from dataclasses import dataclass
from datetime import datetime
from typing import Optional

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.data_structures import BinarySearchTree, Graph, HashTable, LinkedQueue, SinglyLinkedList, Stack
from app.models import Book, BookRelation, Issue, WaitingListEntry, utcnow


@dataclass
class UndoOp:
    issue_id: int
    book_id: int
    member_id: int
    at: datetime


@dataclass
class QueueItem:
    entry_id: int
    member_id: int


@dataclass
class Activity:
    id: int
    kind: str
    message: str
    member: Optional[str]
    book: Optional[str]
    at: datetime


class LibraryEngine:
    ACTIVITY_LIMIT = 60
    UNDO_LIMIT = 100

    def __init__(self) -> None:
        self.lock = threading.RLock()
        self.isbn_index: HashTable[int] = HashTable(capacity=31)
        self.title_index = BinarySearchTree()
        self.graph = Graph()
        self.undo_stack: Stack[UndoOp] = Stack(capacity=self.UNDO_LIMIT)
        self.waiting: dict[int, LinkedQueue[QueueItem]] = {}
        self.activity: SinglyLinkedList[Activity] = SinglyLinkedList()
        self._activity_seq = 0
        self.loaded = False

    # ---------------------------------------------------------------- load
    def rebuild(self, db: Session) -> None:
        with self.lock:
            books = db.execute(select(Book.id, Book.isbn, Book.title)).all()
            self.isbn_index = HashTable(capacity=31)
            for b in books:
                self.isbn_index.put(b.isbn, b.id)
            self.title_index = BinarySearchTree()
            self.title_index.build_balanced([(b.title, b.id) for b in books])

            self.graph = Graph()
            for b in books:
                self.graph.add_vertex(b.id)
            for r in db.execute(select(BookRelation)).scalars():
                self.graph.add_edge(r.book_a_id, r.book_b_id, r.weight)

            self.undo_stack = Stack(capacity=self.UNDO_LIMIT)
            recent = db.execute(
                select(Issue)
                .where(Issue.status == "active", Issue.via_waitlist.is_(False))
                .order_by(Issue.issued_at.desc(), Issue.id.desc())
                .limit(self.UNDO_LIMIT)
            ).scalars().all()
            for i in reversed(recent):  # oldest pushed first -> newest on top
                self.undo_stack.push(UndoOp(i.id, i.book_id, i.member_id, i.issued_at))

            self.waiting = {}
            entries = db.execute(
                select(WaitingListEntry)
                .where(WaitingListEntry.status == "waiting")
                .order_by(WaitingListEntry.created_at, WaitingListEntry.id)
            ).scalars()
            for e in entries:
                self.queue_for(e.book_id).enqueue(QueueItem(e.id, e.member_id))

            self.activity = SinglyLinkedList()
            events = db.execute(select(Issue).order_by(Issue.issued_at.desc()).limit(30)).scalars().all()
            log: list[Activity] = []
            for i in events:
                log.append(self._make_activity("issue", f"Issued \u201c{i.book.title}\u201d", i.member.name, i.book.title, i.issued_at))
                if i.returned_at:
                    log.append(self._make_activity("return", f"Returned \u201c{i.book.title}\u201d", i.member.name, i.book.title, i.returned_at))
            for a in sorted(log, key=lambda a: a.at, reverse=True)[: self.ACTIVITY_LIMIT]:
                self.activity.insert_tail(a)
            self.loaded = True

    # ------------------------------------------------------------- helpers
    def queue_for(self, book_id: int) -> LinkedQueue[QueueItem]:
        q = self.waiting.get(book_id)
        if q is None:
            q = LinkedQueue()
            self.waiting[book_id] = q
        return q

    def _make_activity(self, kind: str, message: str, member: Optional[str], book: Optional[str], at: Optional[datetime] = None) -> Activity:
        self._activity_seq += 1
        return Activity(self._activity_seq, kind, message, member, book, at or utcnow())

    def log(self, kind: str, message: str, member: Optional[str] = None, book: Optional[str] = None) -> None:
        with self.lock:
            self.activity.insert_head(self._make_activity(kind, message, member, book))
            self.activity.truncate(self.ACTIVITY_LIMIT)

    # --------------------------------------------------------- book index
    def index_book(self, book_id: int, isbn: str, title: str) -> None:
        with self.lock:
            self.isbn_index.put(isbn, book_id)
            self.title_index.insert(title, book_id)
            self.graph.add_vertex(book_id)

    def unindex_book(self, book_id: int, isbn: str, title: str) -> None:
        with self.lock:
            self.isbn_index.remove(isbn)
            self.title_index.delete(title, book_id)
            self.graph.remove_vertex(book_id)
            self.waiting.pop(book_id, None)


engine = LibraryEngine()
