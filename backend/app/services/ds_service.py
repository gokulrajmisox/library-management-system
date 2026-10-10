from __future__ import annotations

import threading
from typing import Any, Optional

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.data_structures import LinkedQueue, QueueUnderflowError, SinglyLinkedList, Stack, StackUnderflowError
from app.models import Book, Issue
from app.services.engine import engine
from app.services.errors import AppError

COMPLEXITY = {
    "list": {
        "insert_head": "O(1)",
        "insert_tail": "O(1)",
        "insert_at": "O(n)",
        "delete_head": "O(1)",
        "delete_at": "O(n)",
        "search": "O(n)",
    },
    "stack": {"push": "O(1)", "pop": "O(1)", "peek": "O(1)"},
    "queue": {"enqueue": "O(1)", "dequeue": "O(1)", "peek": "O(1)"},
}


class Playground:
    """Sandbox instances of the real DS classes for the interactive lab."""

    def __init__(self) -> None:
        self.lock = threading.Lock()
        self.list: SinglyLinkedList[str] = SinglyLinkedList()
        self.stack: Stack[str] = Stack()
        self.queue: LinkedQueue[str] = LinkedQueue()
        self._seeded = False

    def seed(self, db: Session) -> None:
        with self.lock:
            self.list = SinglyLinkedList()
            for t in db.execute(select(Book.title).order_by(Book.id).limit(3)).scalars():
                self.list.insert_tail(t)
            self.stack = Stack()
            ids = db.execute(select(Issue.id).order_by(Issue.id.desc()).limit(3)).scalars().all()
            for i in reversed(ids):
                self.stack.push(f"Issue #{i}")
            self.queue = LinkedQueue()
            for n in ("Member 01", "Member 02", "Member 03"):
                self.queue.enqueue(n)
            self._seeded = True

    def ensure(self, db: Session) -> None:
        if not self._seeded:
            self.seed(db)

    def state(self, structure: str) -> list[str]:
        if structure == "list":
            return self.list.to_list()
        if structure == "stack":
            return self.stack.to_list()
        return self.queue.to_list()

    def apply(self, db: Session, structure: str, op: str, value: Optional[str], index: Optional[int]) -> dict[str, Any]:
        self.ensure(db)
        if structure not in COMPLEXITY:
            raise AppError(404, "Unknown data structure.", "unknown_structure")
        if op == "reset":
            self.seed(db)
            return {"structure": structure, "op": op, "result": None, "state": self.state(structure), "message": "Reset to sample data.", "complexity": "O(n)"}
        if op not in COMPLEXITY[structure]:
            raise AppError(422, f"Operation '{op}' is not supported on {structure}.", "unknown_op")
        val = (value or "").strip()[:40]
        needs_value = op in ("insert_head", "insert_tail", "insert_at", "push", "enqueue", "search")
        if needs_value and not val:
            raise AppError(422, "Please enter a value.", "value_required")
        result: Optional[str] = None
        with self.lock:
            try:
                if structure == "list":
                    if len(self.list) >= 12 and op.startswith("insert"):
                        raise AppError(422, "The sandbox list is limited to 12 nodes.", "too_many")
                    if op == "insert_head":
                        self.list.insert_head(val)
                    elif op == "insert_tail":
                        self.list.insert_tail(val)
                    elif op == "insert_at":
                        self.list.insert_at(index if index is not None else 0, val)
                    elif op == "delete_head":
                        result = self.list.delete_head()
                    elif op == "delete_at":
                        result = self.list.delete_at(index if index is not None else 0)
                    elif op == "search":
                        found = self.list.find(lambda x: x.lower() == val.lower())
                        result = found
                elif structure == "stack":
                    if op == "push":
                        if len(self.stack) >= 10:
                            raise AppError(422, "Stack overflow: the sandbox stack holds 10 items.", "overflow")
                        self.stack.push(val)
                    elif op == "pop":
                        result = self.stack.pop()
                    else:
                        result = self.stack.peek()
                else:
                    if op == "enqueue":
                        if len(self.queue) >= 10:
                            raise AppError(422, "Queue is full: the sandbox queue holds 10 items.", "overflow")
                        self.queue.enqueue(val)
                    elif op == "dequeue":
                        result = self.queue.dequeue()
                    else:
                        result = self.queue.peek()
            except (StackUnderflowError, QueueUnderflowError):
                raise AppError(422, f"Underflow: the {structure} is empty.", "underflow")
            except IndexError:
                raise AppError(422, "Index out of range.", "index_error")
        messages = {
            "insert_head": f"Inserted “{val}” at HEAD",
            "insert_tail": f"Inserted “{val}” at TAIL",
            "insert_at": f"Inserted “{val}” at index {index}",
            "delete_head": f"Deleted “{result}” from HEAD",
            "delete_at": f"Deleted “{result}” at index {index}",
            "search": f"Found “{result}”" if result else f"“{val}” not found",
            "push": f"Pushed “{val}”",
            "pop": f"Popped “{result}”",
            "peek": f"Top/front is “{result}”",
            "enqueue": f"Enqueued “{val}” at REAR",
            "dequeue": f"Dequeued “{result}” from FRONT",
        }
        return {
            "structure": structure,
            "op": op,
            "result": result,
            "state": self.state(structure),
            "message": messages.get(op, "Done"),
            "complexity": COMPLEXITY[structure][op],
        }


playground = Playground()


def status(db: Session) -> dict[str, Any]:
    with engine.lock:
        ht = engine.isbn_index
        chains = [len(c) for c in ht.snapshot()]
        stack_top = engine.undo_stack.to_list()[:10]
        issue_ids = [op.issue_id for op in stack_top]
        queues = {bid: len(q) for bid, q in engine.waiting.items() if len(q)}
        activity = engine.activity.to_list()[:8]
        bst = engine.title_index
        g = engine.graph
        status_out = {
            "hash_table": {
                "size": len(ht),
                "capacity": ht.capacity,
                "load_factor": round(ht.load_factor, 3),
                "collisions": ht.collision_count(),
                "longest_chain": max(chains) if chains else 0,
                "empty_buckets": sum(1 for c in chains if c == 0),
                "hash_function": "djb2 (h * 33 + c) mod capacity",
            },
            "bst": {"nodes": len(bst), "height": bst.height(), "root": bst.root.title if bst.root else None},
            "graph": {"vertices": g.vertex_count(), "edges": g.edge_count()},
            "stack": {"size": len(engine.undo_stack), "capacity": engine.undo_stack.capacity, "top_issue_ids": issue_ids},
            "queues": {"books_with_queue": len(queues), "total_waiting": sum(queues.values())},
            "linked_list": {
                "size": len(engine.activity),
                "head": [{"kind": a.kind, "message": a.message, "member": a.member} for a in activity],
            },
        }
    issues = {i.id: i for i in db.execute(select(Issue).where(Issue.id.in_(issue_ids or [-1]))).scalars()}
    status_out["stack"]["top"] = [
        {"issue_id": iid, "member": issues[iid].member.name, "book": issues[iid].book.title}
        for iid in issue_ids
        if iid in issues
    ]
    return status_out


def hash_table_view(db: Session) -> dict[str, Any]:
    with engine.lock:
        snap = engine.isbn_index.snapshot()
        capacity = engine.isbn_index.capacity
        size = len(engine.isbn_index)
    titles = {b.id: b.title for b in db.execute(select(Book.id, Book.title)).all()}
    return {
        "capacity": capacity,
        "size": size,
        "load_factor": round(size / capacity, 3),
        "buckets": [
            {"index": i, "entries": [{"isbn": k, "book_id": v, "title": titles.get(v, "?")} for k, v in chain]}
            for i, chain in enumerate(snap)
        ],
    }


def bst_view() -> dict[str, Any]:
    with engine.lock:
        return {
            "root": engine.title_index.to_dict(),
            "height": engine.title_index.height(),
            "nodes": len(engine.title_index),
        }
