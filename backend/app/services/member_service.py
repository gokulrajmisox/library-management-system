from __future__ import annotations

import math
from typing import Optional

from sqlalchemy import case, func, or_, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.models import Issue, Member
from app.models.schemas import MemberCreate, MemberOut, MemberUpdate, Page
from app.services.circulation_service import get_member
from app.services.engine import engine
from app.services.errors import conflict


def _stats(db: Session, ids: list[int]) -> dict[int, tuple[int, int]]:
    if not ids:
        return {}
    rows = db.execute(
        select(
            Issue.member_id,
            func.sum(case((Issue.status == "active", 1), else_=0)),
            func.count(Issue.id),
        )
        .where(Issue.member_id.in_(ids))
        .group_by(Issue.member_id)
    ).all()
    return {r[0]: (int(r[1] or 0), int(r[2] or 0)) for r in rows}


def _waiting_counts() -> dict[int, int]:
    counts: dict[int, int] = {}
    with engine.lock:
        for q in engine.waiting.values():
            for item in q:
                counts[item.member_id] = counts.get(item.member_id, 0) + 1
    return counts


def to_member_out(m: Member, stats: dict[int, tuple[int, int]], waits: dict[int, int]) -> MemberOut:
    active, total = stats.get(m.id, (0, 0))
    out = MemberOut.model_validate(m)
    out.active_issues = active
    out.total_borrowed = total
    out.waiting_count = waits.get(m.id, 0)
    return out


def member_out(db: Session, m: Member) -> MemberOut:
    return to_member_out(m, _stats(db, [m.id]), _waiting_counts())


def list_members(db: Session, page: int, page_size: int, q: Optional[str]) -> Page[MemberOut]:
    stmt = select(Member)
    count = select(func.count(Member.id))
    if q:
        like = f"%{q.strip().lower()}%"
        cond = or_(
            func.lower(Member.name).like(like),
            func.lower(Member.email).like(like),
            func.lower(Member.member_code).like(like),
            Member.phone.like(like),
        )
        stmt = stmt.where(cond)
        count = count.where(cond)
    total = db.execute(count).scalar_one()
    rows = db.execute(stmt.order_by(Member.member_code).offset((page - 1) * page_size).limit(page_size)).scalars().all()
    stats = _stats(db, [m.id for m in rows])
    waits = _waiting_counts()
    return Page[MemberOut](
        items=[to_member_out(m, stats, waits) for m in rows],
        total=total,
        page=page,
        page_size=page_size,
        pages=max(1, math.ceil(total / page_size)),
    )


def _next_code(db: Session) -> str:
    last = db.execute(select(func.max(Member.id))).scalar_one() or 0
    code = f"M{last + 1:04d}"
    while db.execute(select(Member.id).where(Member.member_code == code)).first():
        last += 1
        code = f"M{last + 1:04d}"
    return code


def create_member(db: Session, data: MemberCreate) -> Member:
    if db.execute(select(Member.id).where(func.lower(Member.email) == data.email.lower())).first():
        raise conflict("A member with this email already exists.", "duplicate_email")
    m = Member(member_code=_next_code(db), name=data.name, email=data.email.lower(), phone=data.phone)
    db.add(m)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise conflict("A member with this email already exists.", "duplicate_email")
    db.refresh(m)
    engine.log("member", "Registered as a new member", m.name)
    return m


def update_member(db: Session, member_id: int, data: MemberUpdate) -> Member:
    m = get_member(db, member_id)
    dup = db.execute(
        select(Member.id).where(func.lower(Member.email) == data.email.lower(), Member.id != member_id)
    ).first()
    if dup:
        raise conflict("A member with this email already exists.", "duplicate_email")
    m.name, m.email, m.phone, m.active = data.name, data.email.lower(), data.phone, data.active
    db.commit()
    db.refresh(m)
    return m


def delete_member(db: Session, member_id: int) -> None:
    m = get_member(db, member_id)
    active = db.execute(
        select(func.count(Issue.id)).where(Issue.member_id == member_id, Issue.status == "active")
    ).scalar_one()
    if active:
        raise conflict("This member still has borrowed books. Return them before deleting the member.", "member_has_loans")
    with engine.lock:
        for q in engine.waiting.values():
            while q.remove_where(lambda x: x.member_id == member_id) is not None:
                pass
    name = m.name
    db.delete(m)
    db.commit()
    engine.log("member", "Member account removed", name)
