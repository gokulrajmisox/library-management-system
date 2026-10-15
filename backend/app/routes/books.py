from __future__ import annotations

from typing import Literal, Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.models import Book, Category
from app.models.schemas import (
    BookBorrower,
    BookCreate,
    BookOut,
    BookUpdate,
    BSTSearchResponse,
    CategoryWithCount,
    HashSearchResponse,
    Page,
    SearchResponse,
    SortRequest,
    SortResponse,
)
from app.services import book_service as svc

router = APIRouter(tags=["books"])


@router.get("/categories", response_model=list[CategoryWithCount])
def categories(db: Session = Depends(get_db)) -> list[CategoryWithCount]:
    rows = db.execute(
        select(Category, func.count(Book.id))
        .join(Book, Book.category_id == Category.id, isouter=True)
        .group_by(Category.id)
        .order_by(Category.id)
    ).all()
    return [CategoryWithCount(id=c.id, name=c.name, slug=c.slug, book_count=n) for c, n in rows]


@router.get("/books", response_model=Page[BookOut])
def list_books(
    page: int = Query(1, ge=1),
    page_size: int = Query(24, ge=1, le=100),
    category: Optional[str] = None,
    q: Optional[str] = Query(None, max_length=120),
    sort: Literal["title", "author", "year", "availability", "newest"] = "title",
    order: Literal["asc", "desc"] = "asc",
    available_only: bool = False,
    db: Session = Depends(get_db),
) -> Page[BookOut]:
    return svc.list_books(db, page, page_size, category, q, sort, order, available_only)


@router.post("/books", response_model=BookOut, status_code=201)
def create_book(data: BookCreate, db: Session = Depends(get_db)) -> BookOut:
    return svc.to_book_out(svc.create_book(db, data))


@router.get("/books/search", response_model=SearchResponse)
def search_books(q: str = Query("", max_length=120), limit: int = Query(8, ge=1, le=20), db: Session = Depends(get_db)) -> SearchResponse:
    return svc.search(db, q, limit)


@router.post("/books/sort", response_model=SortResponse)
def sort_books(req: SortRequest, db: Session = Depends(get_db)) -> SortResponse:
    return svc.sort_books(db, req)


@router.get("/books/isbn/{isbn}", response_model=HashSearchResponse)
def by_isbn(isbn: str, db: Session = Depends(get_db)) -> HashSearchResponse:
    return svc.hash_search(db, isbn)


@router.get("/books/title/{title}", response_model=BSTSearchResponse)
def by_title(title: str, db: Session = Depends(get_db)) -> BSTSearchResponse:
    return svc.bst_search(db, title)


@router.get("/books/{book_id}", response_model=BookOut)
def get_book(book_id: int, db: Session = Depends(get_db)) -> BookOut:
    return svc.to_book_out(svc.get_book(db, book_id))


@router.get("/books/{book_id}/borrowers", response_model=list[BookBorrower])
def get_book_borrowers(book_id: int, db: Session = Depends(get_db)) -> list[BookBorrower]:
    return svc.get_book_borrowers(db, book_id)


@router.get("/books/{book_id}/related", response_model=list[BookOut])
def related(book_id: int, limit: int = Query(10, ge=1, le=20), db: Session = Depends(get_db)) -> list[BookOut]:
    return [svc.to_book_out(b) for b in svc.related_books(db, book_id, limit)]


@router.put("/books/{book_id}", response_model=BookOut)
def update_book(book_id: int, data: BookUpdate, db: Session = Depends(get_db)) -> BookOut:
    return svc.to_book_out(svc.update_book(db, book_id, data))


@router.delete("/books/{book_id}", status_code=204)
def delete_book(book_id: int, db: Session = Depends(get_db)):
    svc.delete_book(db, book_id)
    return None
