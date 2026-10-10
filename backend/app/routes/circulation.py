from __future__ import annotations

from typing import Any, Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.models import WaitingListEntry
from app.models.schemas import (
    ActivityOut,
    IssueCreate,
    IssueOut,
    MemberCreate,
    MemberOut,
    MemberUpdate,
    Page,
    ReturnCreate,
    ReturnResponse,
    UndoPreview,
    UndoResponse,
    WaitingJoin,
    WaitingListOut,
    WaitingSummary,
)
from app.services import circulation_service as circ
from app.services import member_service as msvc
from app.services.engine import engine

router = APIRouter()


# ----------------------------------------------------------------- members
@router.get("/members", response_model=Page[MemberOut], tags=["members"])
def list_members(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    q: Optional[str] = Query(None, max_length=120),
    db: Session = Depends(get_db),
) -> Page[MemberOut]:
    return msvc.list_members(db, page, page_size, q)


@router.post("/members", response_model=MemberOut, status_code=201, tags=["members"])
def create_member(data: MemberCreate, db: Session = Depends(get_db)) -> MemberOut:
    return msvc.member_out(db, msvc.create_member(db, data))


@router.get("/members/{member_id}", tags=["members"])
def get_member(member_id: int, db: Session = Depends(get_db)) -> dict[str, Any]:
    m = circ.get_member(db, member_id)
    issues = circ.list_issues(db, None, member_id, None, 200)
    with engine.lock:
        waits = [
            (bid, q.position_of(lambda x: x.member_id == member_id) + 1, len(q))
            for bid, q in engine.waiting.items()
            if q.contains(lambda x: x.member_id == member_id)
        ]
    from app.models import Book

    titles = {b.id: b for b in db.execute(select(Book).where(Book.id.in_([w[0] for w in waits] or [-1]))).scalars()}
    joined = {
        e.book_id: e.created_at
        for e in db.execute(
            select(WaitingListEntry).where(WaitingListEntry.member_id == member_id, WaitingListEntry.status == "waiting")
        ).scalars()
    }
    return {
        "member": msvc.member_out(db, m).model_dump(mode="json"),
        "current": [i.model_dump(mode="json") for i in issues if i.status == "active"],
        "history": [i.model_dump(mode="json") for i in issues if i.status != "active"],
        "waiting": [
            {
                "book_id": bid,
                "title": titles[bid].title,
                "author": titles[bid].author,
                "position": pos,
                "queue_size": size,
                "joined_at": (joined[bid].isoformat() + "Z") if bid in joined else None,
            }
            for bid, pos, size in waits
            if bid in titles
        ],
    }


@router.put("/members/{member_id}", response_model=MemberOut, tags=["members"])
def update_member(member_id: int, data: MemberUpdate, db: Session = Depends(get_db)) -> MemberOut:
    return msvc.member_out(db, msvc.update_member(db, member_id, data))


@router.delete("/members/{member_id}", status_code=204, tags=["members"])
def delete_member(member_id: int, db: Session = Depends(get_db)):
    msvc.delete_member(db, member_id)
    return None


# ------------------------------------------------------------- circulation
@router.get("/issues", response_model=list[IssueOut], tags=["circulation"])
def list_issues(
    status: Optional[str] = Query(None, pattern="^(active|returned|overdue)$"),
    member_id: Optional[int] = None,
    book_id: Optional[int] = None,
    limit: int = Query(50, ge=1, le=500),
    db: Session = Depends(get_db),
) -> list[IssueOut]:
    return circ.list_issues(db, status, member_id, book_id, limit)


@router.post("/issues", response_model=IssueOut, status_code=201, tags=["circulation"])
def issue_book(data: IssueCreate, db: Session = Depends(get_db)) -> IssueOut:
    return circ.to_issue_out(circ.issue_book(db, data.book_id, data.member_id))


@router.get("/issues/undo", response_model=UndoPreview, tags=["circulation"])
def peek_undo(db: Session = Depends(get_db)) -> UndoPreview:
    return circ.peek_undo(db)


@router.post("/issues/undo", response_model=UndoResponse, tags=["circulation"])
def undo_issue(db: Session = Depends(get_db)) -> UndoResponse:
    return circ.undo_last_issue(db)


@router.post("/returns", response_model=ReturnResponse, tags=["circulation"])
def return_book(data: ReturnCreate, db: Session = Depends(get_db)) -> ReturnResponse:
    return circ.return_book(db, data.issue_id, data.book_id, data.member_id)


# ------------------------------------------------------------ waiting list
@router.get("/waiting-list", response_model=list[WaitingSummary], tags=["waiting-list"])
def waiting_summaries(db: Session = Depends(get_db)) -> list[WaitingSummary]:
    return circ.waiting_summaries(db)


@router.get("/waiting-list/{book_id}", response_model=WaitingListOut, tags=["waiting-list"])
def get_waiting(book_id: int, db: Session = Depends(get_db)) -> WaitingListOut:
    return circ.waiting_list(db, book_id)


@router.post("/waiting-list/{book_id}", response_model=WaitingListOut, status_code=201, tags=["waiting-list"])
def join_waiting(book_id: int, data: WaitingJoin, db: Session = Depends(get_db)) -> WaitingListOut:
    return circ.join_waiting_list(db, book_id, data.member_id)


@router.delete("/waiting-list/{book_id}", response_model=WaitingListOut, tags=["waiting-list"])
def leave_waiting(book_id: int, member_id: Optional[int] = None, db: Session = Depends(get_db)) -> WaitingListOut:
    return circ.leave_waiting_list(db, book_id, member_id)


# ----------------------------------------------------------------- activity
@router.get("/activity", response_model=list[ActivityOut], tags=["activity"])
def activity(limit: int = Query(15, ge=1, le=60)) -> list[ActivityOut]:
    with engine.lock:
        items = engine.activity.to_list()[:limit]
    return [ActivityOut(id=a.id, kind=a.kind, message=a.message, member=a.member, book=a.book, at=a.at) for a in items]
