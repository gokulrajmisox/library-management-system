"""Idempotent database seeding with realistic, deterministic sample data."""

from __future__ import annotations

import random
from datetime import timedelta

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.database.sample_data import BOOKS, CATEGORIES, MEMBERS, RELATIONS
from app.models import Book, BookRelation, Category, Issue, Member, WaitingListEntry, utcnow

FULLY_BOOKED = [
    "Project Hail Mary",
    "The Linux Programming Interface",
    "The Art of Computer Programming, Vol. 1",
    "Designing Data-Intensive Applications",
    "Working Effectively with Legacy Code",
]


def seed(db: Session) -> bool:
    """Returns True if data was inserted."""
    if db.execute(select(func.count(Book.id))).scalar_one() > 0:
        return False
    rng = random.Random(42)
    now = utcnow()

    cats = {}
    for name, slug in CATEGORIES:
        c = Category(name=name, slug=slug)
        db.add(c)
        cats[slug] = c
    db.flush()

    books: list[Book] = []
    for i, (isbn, title, author, slug, year, copies, rating, desc) in enumerate(BOOKS):
        b = Book(
            isbn=isbn,
            title=title,
            author=author,
            category_id=cats[slug].id,
            publication_year=year,
            description=desc,
            total_copies=copies,
            available_copies=copies,
            rating=rating,
            created_at=now - timedelta(days=400 - i * 3),
        )
        db.add(b)
        books.append(b)
    db.flush()
    by_title = {b.title: b for b in books}

    members: list[Member] = []
    for i, (name, email, phone) in enumerate(MEMBERS):
        m = Member(
            member_code=f"M{i + 1:04d}",
            name=name,
            email=email,
            phone=phone,
            joined_at=now - timedelta(days=rng.randint(30, 420)),
        )
        db.add(m)
        members.append(m)
    db.flush()

    # relations: curated + "same category" ring
    pairs: dict[tuple[int, int], tuple[int, str]] = {}
    for a, b, w, reason in RELATIONS:
        x, y = by_title[a].id, by_title[b].id
        pairs[(min(x, y), max(x, y))] = (w, reason)
    by_cat: dict[int, list[Book]] = {}
    for b in books:
        by_cat.setdefault(b.category_id, []).append(b)
    for group in by_cat.values():
        for i in range(len(group)):
            x, y = group[i].id, group[(i + 1) % len(group)].id
            key = (min(x, y), max(x, y))
            if key not in pairs and x != y:
                pairs[key] = (1, "same category")
    for (x, y), (w, reason) in pairs.items():
        db.add(BookRelation(book_a_id=x, book_b_id=y, weight=w, reason=reason))

    # historical (returned) issues over the last 11 months
    popular = [by_title[t] for t in ("Clean Code", "Introduction to Algorithms", "The C Programming Language", "Operating System Concepts", "Database System Concepts", "Hands-On Machine Learning")]
    for _ in range(520):
        book = rng.choice(popular) if rng.random() < 0.3 else rng.choice(books)
        member = rng.choice(members)
        issued = now - timedelta(days=rng.randint(20, 330), hours=rng.randint(0, 23), minutes=rng.randint(0, 59))
        returned = issued + timedelta(days=rng.randint(2, 20), hours=rng.randint(0, 12))
        db.add(Issue(book_id=book.id, member_id=member.id, issued_at=issued, due_at=issued + timedelta(days=14), returned_at=returned, status="returned"))
    # returns/issues in the last 20 days for a lively 30-day chart
    for _ in range(70):
        book = rng.choice(books)
        member = rng.choice(members)
        issued = now - timedelta(days=rng.randint(6, 28), hours=rng.randint(0, 23))
        returned = min(now - timedelta(hours=1), issued + timedelta(days=rng.randint(1, 6)))
        db.add(Issue(book_id=book.id, member_id=member.id, issued_at=issued, due_at=issued + timedelta(days=14), returned_at=returned, status="returned"))

    # active issues
    active_count = {m.id: 0 for m in members}
    holding: set[tuple[int, int]] = set()

    def give(book: Book, member: Member, days_ago: float) -> bool:
        if book.available_copies <= 0 or active_count[member.id] >= 4 or (book.id, member.id) in holding:
            return False
        issued = now - timedelta(days=days_ago)
        db.add(Issue(book_id=book.id, member_id=member.id, issued_at=issued, due_at=issued + timedelta(days=14), status="active"))
        book.available_copies -= 1
        active_count[member.id] += 1
        holding.add((book.id, member.id))
        return True

    for title in FULLY_BOOKED:
        book = by_title[title]
        while book.available_copies > 0:
            give(book, rng.choice(members), rng.uniform(1, 20))
    for _ in range(60):
        give(rng.choice(books), rng.choice(members), rng.uniform(0.05, 24))

    # waiting lists (FIFO) for the fully-booked titles
    for title in FULLY_BOOKED:
        book = by_title[title]
        candidates = [m for m in members if (book.id, m.id) not in holding]
        rng.shuffle(candidates)
        for k, m in enumerate(candidates[: rng.randint(2, 5)]):
            db.add(WaitingListEntry(book_id=book.id, member_id=m.id, created_at=now - timedelta(days=5 - k * 0.7, hours=rng.randint(0, 5)), status="waiting"))

    db.commit()
    return True
