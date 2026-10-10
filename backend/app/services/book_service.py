from __future__ import annotations

import math
import time
from typing import Any, Callable, Optional

from sqlalchemy import func, or_, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.data_structures import ALGORITHM_INFO, insertion_sort, quick_sort
from app.models import Book, BookRelation, Category, Issue
from app.models.schemas import (
    BookCreate,
    BookOut,
    BookUpdate,
    BSTSearchResponse,
    CategoryOut,
    HashSearchResponse,
    Page,
    SearchResponse,
    SearchSuggestion,
    SortRequest,
    SortResponse,
    normalize_isbn,
)
from app.services.engine import engine
from app.services.errors import AppError, conflict, not_found

SORT_COLUMNS: dict[str, Any] = {
    "title": func.lower(Book.title),
    "author": func.lower(Book.author),
    "year": Book.publication_year,
    "availability": Book.available_copies,
    "newest": Book.created_at,
}


def book_status(available: int, total: int) -> str:
    if available <= 0:
        return "unavailable"
    if available <= max(1, total // 4):
        return "limited"
    return "available"


def to_book_out(b: Book) -> BookOut:
    return BookOut(
        id=b.id,
        isbn=b.isbn,
        title=b.title,
        author=b.author,
        category=CategoryOut.model_validate(b.category),
        publication_year=b.publication_year,
        description=b.description,
        total_copies=b.total_copies,
        available_copies=b.available_copies,
        rating=b.rating / 10,
        waiting_count=len(engine.waiting.get(b.id, ())),
        status=book_status(b.available_copies, b.total_copies),  # type: ignore[arg-type]
        created_at=b.created_at,
    )


def get_book(db: Session, book_id: int) -> Book:
    book = db.get(Book, book_id)
    if book is None:
        raise not_found("Book")
    return book


def list_books(
    db: Session,
    page: int,
    page_size: int,
    category: Optional[str],
    q: Optional[str],
    sort: str,
    order: str,
    available_only: bool = False,
) -> Page[BookOut]:
    stmt = select(Book).join(Category)
    count_stmt = select(func.count(Book.id)).join(Category)
    filters = []
    if category and category != "all":
        filters.append(Category.slug == category)
    if q:
        like = f"%{q.strip().lower()}%"
        digits = normalize_isbn(q)
        conds = [func.lower(Book.title).like(like), func.lower(Book.author).like(like)]
        if digits:
            conds.append(Book.isbn.like(f"%{digits}%"))
        filters.append(or_(*conds))
    if available_only:
        filters.append(Book.available_copies > 0)
    for f in filters:
        stmt = stmt.where(f)
        count_stmt = count_stmt.where(f)
    col = SORT_COLUMNS.get(sort, SORT_COLUMNS["title"])
    stmt = stmt.order_by(col.desc() if order == "desc" else col.asc(), Book.id)
    total = db.execute(count_stmt).scalar_one()
    rows = db.execute(stmt.offset((page - 1) * page_size).limit(page_size)).scalars().all()
    return Page[BookOut](
        items=[to_book_out(b) for b in rows],
        total=total,
        page=page,
        page_size=page_size,
        pages=max(1, math.ceil(total / page_size)),
    )


def _ensure_category(db: Session, category_id: int) -> None:
    if db.get(Category, category_id) is None:
        raise AppError(422, "Please choose a valid category.", "invalid_category")


def create_book(db: Session, data: BookCreate) -> Book:
    _ensure_category(db, data.category_id)
    # O(1) duplicate check through the hash table before touching the DB
    if engine.isbn_index.contains(data.isbn):
        raise conflict("ISBN already exists.", "duplicate_isbn")
    book = Book(
        isbn=data.isbn,
        title=data.title,
        author=data.author,
        category_id=data.category_id,
        publication_year=data.publication_year,
        description=data.description,
        total_copies=data.total_copies,
        available_copies=data.total_copies,
        rating=40,
    )
    db.add(book)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise conflict("ISBN already exists.", "duplicate_isbn")
    db.refresh(book)
    engine.index_book(book.id, book.isbn, book.title)
    engine.log("book", f"Added \u201c{book.title}\u201d to the collection", None, book.title)
    return book


def update_book(db: Session, book_id: int, data: BookUpdate) -> Book:
    book = get_book(db, book_id)
    _ensure_category(db, data.category_id)
    existing = engine.isbn_index.get(data.isbn)
    if existing is not None and existing != book_id:
        raise conflict("ISBN already exists.", "duplicate_isbn")
    issued = book.total_copies - book.available_copies
    if data.total_copies < issued:
        raise AppError(422, f"Total copies cannot be less than the {issued} copies currently issued.", "copies_too_low")
    old_isbn, old_title = book.isbn, book.title
    book.isbn = data.isbn
    book.title = data.title
    book.author = data.author
    book.category_id = data.category_id
    book.publication_year = data.publication_year
    book.description = data.description
    book.available_copies = data.total_copies - issued
    book.total_copies = data.total_copies
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise conflict("ISBN already exists.", "duplicate_isbn")
    db.refresh(book)
    with engine.lock:
        engine.isbn_index.remove(old_isbn)
        engine.isbn_index.put(book.isbn, book.id)
        engine.title_index.delete(old_title, book.id)
        engine.title_index.insert(book.title, book.id)
    return book


def delete_book(db: Session, book_id: int) -> None:
    book = get_book(db, book_id)
    active = db.execute(
        select(func.count(Issue.id)).where(Issue.book_id == book_id, Issue.status == "active")
    ).scalar_one()
    if active:
        raise conflict("This book has copies on loan and cannot be deleted until they are returned.", "book_on_loan")
    isbn, title = book.isbn, book.title
    db.delete(book)
    db.commit()
    engine.unindex_book(book_id, isbn, title)
    engine.log("book", f"Removed \u201c{title}\u201d from the collection", None, title)


# ------------------------------------------------------------------ search
def search(db: Session, q: str, limit: int = 8) -> SearchResponse:
    q = q.strip()
    if not q:
        return SearchResponse(query=q, total=0, method="none", suggestions=[])
    digits = normalize_isbn(q)
    # exact ISBN -> hash table lookup, O(1)
    if digits.isdigit() and len(digits) in (10, 13):
        book_id = engine.isbn_index.get(digits)
        if book_id is not None:
            b = get_book(db, book_id)
            return SearchResponse(
                query=q,
                total=1,
                method="hash_table",
                suggestions=[_suggestion(b, "isbn")],
            )
    like = f"%{q.lower()}%"
    conds = [func.lower(Book.title).like(like), func.lower(Book.author).like(like)]
    if digits.isdigit():
        conds.append(Book.isbn.like(f"%{digits}%"))
    where = or_(*conds)
    total = db.execute(select(func.count(Book.id)).where(where)).scalar_one()
    # titles that start with the query come first (BST prefix walk), then others
    prefix_ids = engine.title_index.prefix_search(q, limit)
    rows = db.execute(select(Book).where(where).order_by(func.lower(Book.title)).limit(limit * 3)).scalars().all()
    by_id = {b.id: b for b in rows}
    ordered: list[Book] = [by_id[i] for i in prefix_ids if i in by_id]
    ordered += [b for b in rows if b.id not in set(prefix_ids)]
    out: list[SearchSuggestion] = []
    ql = q.lower()
    for b in ordered[:limit]:
        match = "title" if ql in b.title.lower() else "author" if ql in b.author.lower() else "isbn"
        out.append(_suggestion(b, match))
    return SearchResponse(query=q, total=total, method="bst_prefix+index", suggestions=out)


def _suggestion(b: Book, match: str) -> SearchSuggestion:
    return SearchSuggestion(
        id=b.id,
        title=b.title,
        author=b.author,
        isbn=b.isbn,
        category=b.category.name,
        available_copies=b.available_copies,
        match=match,  # type: ignore[arg-type]
    )


def hash_search(db: Session, isbn: str) -> HashSearchResponse:
    key = normalize_isbn(isbn)
    with engine.lock:
        trace = engine.isbn_index.search_trace(key)
    chain_ids = [engine.isbn_index.get(k) for k in trace.chain]
    titles = {
        b.id: b.title
        for b in db.execute(select(Book).where(Book.id.in_([i for i in chain_ids if i is not None]))).scalars()
    }
    chain = [
        {"isbn": k, "book_id": bid, "title": titles.get(bid or -1, "?"), "visited": idx < trace.comparisons}
        for idx, (k, bid) in enumerate(zip(trace.chain, chain_ids))
    ]
    book = to_book_out(get_book(db, int(trace.value))) if trace.found and trace.value is not None else None
    return HashSearchResponse(
        isbn=key,
        hash_value=trace.hash_value,
        hash_function="djb2: h = h * 33 + c (32-bit)",
        capacity=trace.capacity,
        bucket=trace.bucket,
        chain=chain,
        comparisons=trace.comparisons,
        found=trace.found,
        book=book,
    )


def bst_search(db: Session, title: str) -> BSTSearchResponse:
    with engine.lock:
        trace = engine.title_index.search(title)
        height = engine.title_index.height()
        count = len(engine.title_index)
    book = to_book_out(get_book(db, trace.book_id)) if trace.found and trace.book_id is not None else None
    return BSTSearchResponse(
        query=title,
        found=trace.found,
        comparisons=trace.comparisons,
        path=trace.path,
        tree_height=height,
        node_count=count,
        book=book,
    )


# ------------------------------------------------------------------- sort
def sort_books(db: Session, req: SortRequest) -> SortResponse:
    books = db.execute(select(Book).where(Book.id.in_(req.book_ids))).scalars().all()
    if not books:
        raise not_found("Books")
    position = {bid: i for i, bid in enumerate(req.book_ids)}
    books = sorted(books, key=lambda b: position.get(b.id, 0))  # preserve current on-screen order
    keyfn: Callable[[Book], Any] = {
        "title": lambda b: b.title.lower(),
        "author": lambda b: b.author.lower(),
        "year": lambda b: b.publication_year,
        "availability": lambda b: b.available_copies,
    }[req.key]
    algo = insertion_sort if req.algorithm == "insertion" else quick_sort
    t0 = time.perf_counter()
    res = algo(books, keyfn, lambda b: b.id, reverse=req.order == "desc")
    elapsed = (time.perf_counter() - t0) * 1000
    return SortResponse(
        algorithm=ALGORITHM_INFO[req.algorithm],
        key=req.key,
        order=req.order,
        comparisons=res.comparisons,
        moves=res.moves,
        steps=res.steps,
        sorted_ids=[b.id for b in res.items],
        elapsed_ms=round(elapsed, 3),
    )


def related_books(db: Session, book_id: int, limit: int = 10) -> list[Book]:
    get_book(db, book_id)
    recs = engine.graph.recommend(book_id, max_depth=2, limit=limit)
    ids = [r.book_id for r in recs]
    if len(ids) < limit:
        book = db.get(Book, book_id)
        assert book is not None
        extra = db.execute(
            select(Book.id)
            .where(Book.category_id == book.category_id, Book.id != book_id, Book.id.notin_(ids or [-1]))
            .limit(limit - len(ids))
        ).scalars().all()
        ids += list(extra)
    rows = {b.id: b for b in db.execute(select(Book).where(Book.id.in_(ids or [-1]))).scalars()}
    return [rows[i] for i in ids if i in rows]


def add_relation(db: Session, a: int, b: int, weight: int = 1, reason: str = "related") -> None:
    lo, hi = min(a, b), max(a, b)
    if lo == hi:
        return
    exists = db.execute(
        select(BookRelation).where(BookRelation.book_a_id == lo, BookRelation.book_b_id == hi)
    ).scalar_one_or_none()
    if exists is None:
        db.add(BookRelation(book_a_id=lo, book_b_id=hi, weight=weight, reason=reason))
    else:
        exists.weight = max(exists.weight, weight)
