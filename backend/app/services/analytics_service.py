from __future__ import annotations

import csv
import io
from datetime import datetime, timedelta
from typing import Any

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models import Book, Category, Issue, Member, utcnow
from app.services.engine import engine


def _month_key(d: datetime) -> str:
    return d.strftime("%Y-%m")


def _months_back(n: int) -> list[datetime]:
    now = utcnow().replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    out = []
    y, m = now.year, now.month
    for _ in range(n):
        out.append(datetime(y, m, 1))
        m -= 1
        if m == 0:
            m, y = 12, y - 1
    return list(reversed(out))


def analytics(db: Session) -> dict[str, Any]:
    now = utcnow()
    total_titles = db.execute(select(func.count(Book.id))).scalar_one()
    total_copies = db.execute(select(func.coalesce(func.sum(Book.total_copies), 0))).scalar_one()
    available = db.execute(select(func.coalesce(func.sum(Book.available_copies), 0))).scalar_one()
    issued = db.execute(select(func.count(Issue.id)).where(Issue.status == "active")).scalar_one()
    overdue = db.execute(
        select(func.count(Issue.id)).where(Issue.status == "active", Issue.due_at < now)
    ).scalar_one()
    members = db.execute(select(func.count(Member.id))).scalar_one()
    with engine.lock:
        waiting_total = sum(len(q) for q in engine.waiting.values())
        waiting_books = sum(1 for q in engine.waiting.values() if not q.is_empty())

    # categories
    cat_rows = db.execute(
        select(Category.name, Category.slug, func.count(Book.id), func.coalesce(func.sum(Book.total_copies), 0))
        .join(Book, Book.category_id == Category.id, isouter=True)
        .group_by(Category.id)
        .order_by(func.count(Book.id).desc())
    ).all()
    categories = [{"name": r[0], "slug": r[1], "books": r[2], "copies": int(r[3])} for r in cat_rows]

    # monthly issues & returns (12 months) — aggregated in Python for DB portability
    months = _months_back(12)
    since = months[0]
    issued_rows = db.execute(select(Issue.issued_at).where(Issue.issued_at >= since)).scalars().all()
    returned_rows = db.execute(
        select(Issue.returned_at).where(Issue.returned_at.is_not(None), Issue.returned_at >= since)
    ).scalars().all()
    by_issue: dict[str, int] = {}
    by_return: dict[str, int] = {}
    for d in issued_rows:
        by_issue[_month_key(d)] = by_issue.get(_month_key(d), 0) + 1
    for d in returned_rows:
        if d is not None:
            by_return[_month_key(d)] = by_return.get(_month_key(d), 0) + 1
    monthly = [
        {"month": m.strftime("%b"), "key": _month_key(m), "issues": by_issue.get(_month_key(m), 0), "returns": by_return.get(_month_key(m), 0)}
        for m in months
    ]

    # daily circulation, last 30 days
    start = (now - timedelta(days=29)).replace(hour=0, minute=0, second=0, microsecond=0)
    d_issue: dict[str, int] = {}
    d_return: dict[str, int] = {}
    for d in db.execute(select(Issue.issued_at).where(Issue.issued_at >= start)).scalars():
        k = d.strftime("%Y-%m-%d")
        d_issue[k] = d_issue.get(k, 0) + 1
    for d in db.execute(select(Issue.returned_at).where(Issue.returned_at >= start)).scalars():
        if d is not None:
            k = d.strftime("%Y-%m-%d")
            d_return[k] = d_return.get(k, 0) + 1
    daily = []
    for i in range(30):
        day = start + timedelta(days=i)
        k = day.strftime("%Y-%m-%d")
        daily.append({"date": k, "label": day.strftime("%d %b"), "issued": d_issue.get(k, 0), "returned": d_return.get(k, 0)})

    top_authors = [
        {"author": r[0], "issues": r[1]}
        for r in db.execute(
            select(Book.author, func.count(Issue.id))
            .join(Issue, Issue.book_id == Book.id)
            .group_by(Book.author)
            .order_by(func.count(Issue.id).desc(), Book.author)
            .limit(6)
        ).all()
    ]
    top_books = [
        {"id": r[0], "title": r[1], "author": r[2], "issues": r[3]}
        for r in db.execute(
            select(Book.id, Book.title, Book.author, func.count(Issue.id))
            .join(Issue, Issue.book_id == Book.id)
            .group_by(Book.id)
            .order_by(func.count(Issue.id).desc(), Book.title)
            .limit(5)
        ).all()
    ]
    top_members = [
        {"id": r[0], "name": r[1], "member_code": r[2], "issues": r[3]}
        for r in db.execute(
            select(Member.id, Member.name, Member.member_code, func.count(Issue.id))
            .join(Issue, Issue.member_id == Member.id)
            .group_by(Member.id)
            .order_by(func.count(Issue.id).desc(), Member.name)
            .limit(5)
        ).all()
    ]
    cat_popularity = [
        {"name": r[0], "issues": r[1]}
        for r in db.execute(
            select(Category.name, func.count(Issue.id))
            .join(Book, Book.category_id == Category.id)
            .join(Issue, Issue.book_id == Book.id)
            .group_by(Category.id)
            .order_by(func.count(Issue.id).desc())
        ).all()
    ]
    with engine.lock:
        longest = sorted(((bid, len(q)) for bid, q in engine.waiting.items() if len(q)), key=lambda t: -t[1])[:5]
    titles = {b.id: b.title for b in db.execute(select(Book).where(Book.id.in_([b for b, _ in longest] or [-1]))).scalars()}
    longest_waiting = [{"id": bid, "title": titles.get(bid, "?"), "queue": n} for bid, n in longest]

    return {
        "totals": {
            "titles": total_titles,
            "copies": int(total_copies),
            "available": int(available),
            "issued": issued,
            "overdue": overdue,
            "members": members,
            "waiting": waiting_total,
            "waiting_books": waiting_books,
        },
        "categories": categories,
        "monthly": monthly,
        "daily": daily,
        "top_authors": top_authors,
        "top_books": top_books,
        "top_members": top_members,
        "category_popularity": cat_popularity,
        "longest_waiting": longest_waiting,
        "highlights": {
            "most_issued_book": top_books[0] if top_books else None,
            "most_active_member": top_members[0] if top_members else None,
            "most_popular_category": cat_popularity[0] if cat_popularity else None,
            "longest_waiting_list": longest_waiting[0] if longest_waiting else None,
        },
        "generated_at": now.isoformat() + "Z",
    }


def export_csv(db: Session) -> str:
    data = analytics(db)
    buf = io.StringIO()
    w = csv.writer(buf)
    w.writerow(["Library Report", data["generated_at"]])
    w.writerow([])
    w.writerow(["Metric", "Value"])
    for k, v in data["totals"].items():
        w.writerow([k, v])
    w.writerow([])
    w.writerow(["Month", "Issues", "Returns"])
    for m in data["monthly"]:
        w.writerow([m["key"], m["issues"], m["returns"]])
    w.writerow([])
    w.writerow(["Most issued books", "Author", "Issues"])
    for b in data["top_books"]:
        w.writerow([b["title"], b["author"], b["issues"]])
    w.writerow([])
    w.writerow(["Most active members", "Member ID", "Issues"])
    for m in data["top_members"]:
        w.writerow([m["name"], m["member_code"], m["issues"]])
    w.writerow([])
    w.writerow(["Category", "Issues"])
    for c in data["category_popularity"]:
        w.writerow([c["name"], c["issues"]])
    w.writerow([])
    w.writerow(["Longest waiting lists", "Queue size"])
    for b in data["longest_waiting"]:
        w.writerow([b["title"], b["queue"]])
    return buf.getvalue()
