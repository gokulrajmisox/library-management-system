from __future__ import annotations

from datetime import timedelta
from typing import Optional

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.config import get_settings
from app.data_structures import StackUnderflowError
from app.models import Book, Issue, Member, WaitingListEntry, utcnow
from app.models.schemas import (
    BookMini,
    IssueOut,
    MemberMini,
    ReturnResponse,
    UndoPreview,
    UndoResponse,
    WaitingEntryOut,
    WaitingListOut,
    WaitingSummary,
)
from app.services.book_service import get_book
from app.services.engine import QueueItem, UndoOp, engine
from app.services.errors import AppError, conflict, not_found


def to_issue_out(i: Issue) -> IssueOut:
    return IssueOut(
        id=i.id,
        book=BookMini.model_validate(i.book),
        member=MemberMini.model_validate(i.member),
        issued_at=i.issued_at,
        due_at=i.due_at,
        returned_at=i.returned_at,
        status=i.status,
        overdue=i.status == "active" and i.due_at < utcnow(),
        via_waitlist=i.via_waitlist,
    )


def get_member(db: Session, member_id: int) -> Member:
    m = db.get(Member, member_id)
    if m is None:
        raise not_found("Member")
    return m


def _active_issue(db: Session, book_id: int, member_id: int) -> Optional[Issue]:
    return db.execute(
        select(Issue).where(Issue.book_id == book_id, Issue.member_id == member_id, Issue.status == "active")
    ).scalar_one_or_none()


def _create_issue(db: Session, book: Book, member: Member, via_waitlist: bool) -> Issue:
    now = utcnow()
    issue = Issue(
        book_id=book.id,
        member_id=member.id,
        issued_at=now,
        due_at=now + timedelta(days=get_settings().loan_days),
        status="active",
        via_waitlist=via_waitlist,
    )
    book.available_copies -= 1
    db.add(issue)
    return issue


def issue_book(db: Session, book_id: int, member_id: int) -> Issue:
    with engine.lock:
        book = get_book(db, book_id)
        member = get_member(db, member_id)
        if not member.active:
            raise AppError(422, "This member account is inactive.", "member_inactive")
        if _active_issue(db, book_id, member_id):
            raise conflict("This member already has this book.", "already_issued")
        active_count = db.execute(
            select(func.count(Issue.id)).where(Issue.member_id == member_id, Issue.status == "active")
        ).scalar_one()
        limit = get_settings().max_active_loans
        if active_count >= limit:
            raise conflict(f"This member has reached the limit of {limit} borrowed books.", "loan_limit")
        if book.available_copies <= 0:
            raise conflict("No copies are currently available.", "no_copies")
        queue = engine.waiting.get(book_id)
        if queue is not None and not queue.is_empty() and queue.peek().member_id != member_id:
            # copies exist but members are queued -> FIFO priority applies
            if book.available_copies <= len(queue):
                raise conflict("Members are waiting for this book. The first member in the queue has priority.", "queue_priority")
        issue = _create_issue(db, book, member, via_waitlist=False)
        db.commit()
        db.refresh(issue)
        # if the member was waiting for it, remove them from the queue
        if queue is not None:
            item = queue.remove_where(lambda x: x.member_id == member_id)
            if item is not None:
                entry = db.get(WaitingListEntry, item.entry_id)
                if entry is not None:
                    entry.status = "fulfilled"
                    entry.resolved_at = utcnow()
                    db.commit()
        # PUSH the operation onto the undo stack
        engine.undo_stack.push(UndoOp(issue.id, book.id, member.id, issue.issued_at))
        engine.log("issue", f"Issued \u201c{book.title}\u201d", member.name, book.title)
        return issue


def return_book(db: Session, issue_id: Optional[int], book_id: Optional[int], member_id: Optional[int]) -> ReturnResponse:
    with engine.lock:
        issue: Optional[Issue]
        if issue_id is not None:
            issue = db.get(Issue, issue_id)
        elif book_id is not None and member_id is not None:
            issue = _active_issue(db, book_id, member_id)
        else:
            raise AppError(422, "Provide an issue id, or both a book and a member.", "invalid_return")
        if issue is None:
            raise not_found("Active issue")
        if issue.status != "active":
            raise conflict("This book has already been returned.", "already_returned")
        issue.status = "returned"
        issue.returned_at = utcnow()
        book = issue.book
        book.available_copies += 1
        db.commit()
        engine.log("return", f"Returned \u201c{book.title}\u201d", issue.member.name, book.title)

        # DEQUEUE: the first member waiting gets the copy automatically
        next_issue: Optional[Issue] = None
        queue = engine.waiting.get(book.id)
        while queue is not None and not queue.is_empty() and book.available_copies > 0:
            item = queue.dequeue()
            entry = db.get(WaitingListEntry, item.entry_id)
            member = db.get(Member, item.member_id)
            if entry is None or member is None:
                continue
            entry.status = "fulfilled"
            entry.resolved_at = utcnow()
            if _active_issue(db, book.id, member.id) is not None:
                db.commit()
                continue
            next_issue = _create_issue(db, book, member, via_waitlist=True)
            db.commit()
            db.refresh(next_issue)
            engine.log("waitlist", f"\u201c{book.title}\u201d issued from the waiting list", member.name, book.title)
            break
        db.refresh(issue)
        msg = "Book returned successfully."
        if next_issue is not None:
            msg += f" Issued to {next_issue.member.name}, first in the waiting list."
        return ReturnResponse(
            issue=to_issue_out(issue),
            next_in_queue=to_issue_out(next_issue) if next_issue else None,
            message=msg,
        )


def _discard_stale(db: Session) -> None:
    """Pop entries whose issue was already returned/removed (they can't be undone)."""
    while not engine.undo_stack.is_empty():
        top = engine.undo_stack.peek()
        issue = db.get(Issue, top.issue_id)
        if issue is not None and issue.status == "active":
            return
        engine.undo_stack.pop()


def peek_undo(db: Session) -> UndoPreview:
    with engine.lock:
        _discard_stale(db)
        try:
            top = engine.undo_stack.peek()
        except StackUnderflowError:
            raise AppError(404, "There is nothing to undo.", "stack_empty")
        issue = db.get(Issue, top.issue_id)
        assert issue is not None
        return UndoPreview(issue=to_issue_out(issue), stack_size=len(engine.undo_stack))


def undo_last_issue(db: Session) -> UndoResponse:
    with engine.lock:
        _discard_stale(db)
        try:
            op = engine.undo_stack.pop()  # POP from Stack
        except StackUnderflowError:
            raise AppError(404, "There is nothing to undo.", "stack_empty")
        issue = db.get(Issue, op.issue_id)
        assert issue is not None
        out = to_issue_out(issue)
        book = issue.book
        book.available_copies += 1  # restore the copy
        title, name = book.title, issue.member.name
        db.delete(issue)  # remove the issue record
        db.commit()
        engine.log("undo", f"Undid issue of \u201c{title}\u201d", name, title)
        return UndoResponse(undone=out, stack_size=len(engine.undo_stack), message="Issue undone successfully.")


def list_issues(db: Session, status: Optional[str], member_id: Optional[int], book_id: Optional[int], limit: int) -> list[IssueOut]:
    stmt = select(Issue).order_by(Issue.issued_at.desc(), Issue.id.desc())
    if status == "overdue":
        stmt = stmt.where(Issue.status == "active", Issue.due_at < utcnow())
    elif status:
        stmt = stmt.where(Issue.status == status)
    if member_id:
        stmt = stmt.where(Issue.member_id == member_id)
    if book_id:
        stmt = stmt.where(Issue.book_id == book_id)
    return [to_issue_out(i) for i in db.execute(stmt.limit(limit)).scalars()]


# --------------------------------------------------------- waiting lists
def waiting_list(db: Session, book_id: int) -> WaitingListOut:
    book = get_book(db, book_id)
    with engine.lock:
        items = engine.waiting.get(book_id)
        snapshot = items.to_list() if items else []
    members = {m.id: m for m in db.execute(select(Member).where(Member.id.in_([x.member_id for x in snapshot] or [-1]))).scalars()}
    entries = {e.id: e for e in db.execute(select(WaitingListEntry).where(WaitingListEntry.id.in_([x.entry_id for x in snapshot] or [-1]))).scalars()}
    queue = [
        WaitingEntryOut(
            id=x.entry_id,
            position=i + 1,
            member=MemberMini.model_validate(members[x.member_id]),
            created_at=entries[x.entry_id].created_at,
        )
        for i, x in enumerate(snapshot)
        if x.member_id in members and x.entry_id in entries
    ]
    return WaitingListOut(
        book=BookMini.model_validate(book),
        available_copies=book.available_copies,
        total_copies=book.total_copies,
        queue=queue,
        front=queue[0] if queue else None,
        rear=queue[-1] if queue else None,
    )


def join_waiting_list(db: Session, book_id: int, member_id: int) -> WaitingListOut:
    with engine.lock:
        book = get_book(db, book_id)
        member = get_member(db, member_id)
        q = engine.queue_for(book_id)
        if q.contains(lambda x: x.member_id == member_id):
            raise conflict(f"{member.name} is already in the waiting list for this book.", "already_waiting")
        if _active_issue(db, book_id, member_id):
            raise conflict("This member already has this book.", "already_issued")
        if book.available_copies > len(q):
            raise conflict("Copies are available right now \u2014 issue the book directly.", "copies_available")
        entry = WaitingListEntry(book_id=book_id, member_id=member_id, status="waiting")
        db.add(entry)
        db.commit()
        db.refresh(entry)
        q.enqueue(QueueItem(entry.id, member_id))  # ENQUEUE at REAR
        engine.log("waitlist", f"Joined the waiting list for \u201c{book.title}\u201d", member.name, book.title)
    return waiting_list(db, book_id)


def leave_waiting_list(db: Session, book_id: int, member_id: Optional[int]) -> WaitingListOut:
    """DELETE without member_id dequeues the FRONT; with member_id cancels that reservation."""
    with engine.lock:
        book = get_book(db, book_id)
        q = engine.waiting.get(book_id)
        if q is None or q.is_empty():
            raise AppError(404, "The waiting list is empty.", "queue_empty")
        if member_id is None:
            item = q.dequeue()
            status = "fulfilled"
        else:
            removed = q.remove_where(lambda x: x.member_id == member_id)
            if removed is None:
                raise not_found("Waiting list entry")
            item = removed
            status = "cancelled"
        entry = db.get(WaitingListEntry, item.entry_id)
        if entry is not None:
            entry.status = status
            entry.resolved_at = utcnow()
            db.commit()
        m = db.get(Member, item.member_id)
        engine.log("waitlist", f"Left the waiting list for \u201c{book.title}\u201d", m.name if m else None, book.title)
    return waiting_list(db, book_id)


def waiting_summaries(db: Session) -> list[WaitingSummary]:
    with engine.lock:
        active = {bid: q.to_list() for bid, q in engine.waiting.items() if not q.is_empty()}
    if not active:
        return []
    books = {b.id: b for b in db.execute(select(Book).where(Book.id.in_(list(active)))).scalars()}
    member_ids = [items[0].member_id for items in active.values()]
    members = {m.id: m for m in db.execute(select(Member).where(Member.id.in_(member_ids))).scalars()}
    out = [
        WaitingSummary(
            book=BookMini.model_validate(books[bid]),
            queue_size=len(items),
            next_member=MemberMini.model_validate(members[items[0].member_id]) if items[0].member_id in members else None,
            available_copies=books[bid].available_copies,
        )
        for bid, items in active.items()
        if bid in books
    ]
    out.sort(key=lambda s: (-s.queue_size, s.book.title))
    return out
