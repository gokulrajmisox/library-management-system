from __future__ import annotations

from datetime import datetime, timezone

from sqlalchemy import (
    Boolean,
    CheckConstraint,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.session import Base


def utcnow() -> datetime:
    return datetime.now(timezone.utc).replace(tzinfo=None)


class Category(Base):
    __tablename__ = "categories"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(80), unique=True, nullable=False)
    slug: Mapped[str] = mapped_column(String(80), unique=True, nullable=False)

    books: Mapped[list["Book"]] = relationship(back_populates="category")


class Book(Base):
    __tablename__ = "books"
    __table_args__ = (
        CheckConstraint("total_copies >= 0", name="ck_books_total_nonneg"),
        CheckConstraint("available_copies >= 0", name="ck_books_avail_nonneg"),
        CheckConstraint("available_copies <= total_copies", name="ck_books_avail_le_total"),
        Index("ix_books_title", "title"),
        Index("ix_books_author", "author"),
        Index("ix_books_category_id", "category_id"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    isbn: Mapped[str] = mapped_column(String(13), unique=True, nullable=False)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    author: Mapped[str] = mapped_column(String(255), nullable=False)
    category_id: Mapped[int] = mapped_column(ForeignKey("categories.id", ondelete="RESTRICT"), nullable=False)
    publication_year: Mapped[int] = mapped_column(Integer, nullable=False)
    description: Mapped[str] = mapped_column(Text, default="", nullable=False)
    total_copies: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    available_copies: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    rating: Mapped[int] = mapped_column(Integer, nullable=False, default=40)  # 0..50 => 0.0..5.0
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow, nullable=False)

    category: Mapped[Category] = relationship(back_populates="books", lazy="joined")


class Member(Base):
    __tablename__ = "members"
    __table_args__ = (Index("ix_members_name", "name"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    member_code: Mapped[str] = mapped_column(String(12), unique=True, nullable=False)
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    phone: Mapped[str] = mapped_column(String(20), nullable=False, default="")
    joined_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow, nullable=False)
    active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)


class Issue(Base):
    __tablename__ = "issues"
    __table_args__ = (
        Index("ix_issues_book_id", "book_id"),
        Index("ix_issues_member_id", "member_id"),
        Index("ix_issues_status", "status"),
        Index("ix_issues_issued_at", "issued_at"),
        CheckConstraint("status IN ('active','returned')", name="ck_issues_status"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    book_id: Mapped[int] = mapped_column(ForeignKey("books.id", ondelete="CASCADE"), nullable=False)
    member_id: Mapped[int] = mapped_column(ForeignKey("members.id", ondelete="CASCADE"), nullable=False)
    issued_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow, nullable=False)
    due_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    returned_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    status: Mapped[str] = mapped_column(String(10), default="active", nullable=False)
    via_waitlist: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    book: Mapped[Book] = relationship(lazy="joined")
    member: Mapped[Member] = relationship(lazy="joined")


class WaitingListEntry(Base):
    __tablename__ = "waiting_list"
    __table_args__ = (
        Index("ix_waiting_book_status", "book_id", "status"),
        Index("ix_waiting_member", "member_id"),
        CheckConstraint("status IN ('waiting','fulfilled','cancelled')", name="ck_waiting_status"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    book_id: Mapped[int] = mapped_column(ForeignKey("books.id", ondelete="CASCADE"), nullable=False)
    member_id: Mapped[int] = mapped_column(ForeignKey("members.id", ondelete="CASCADE"), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow, nullable=False)
    status: Mapped[str] = mapped_column(String(10), default="waiting", nullable=False)
    resolved_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)

    book: Mapped[Book] = relationship(lazy="joined")
    member: Mapped[Member] = relationship(lazy="joined")


class BookRelation(Base):
    __tablename__ = "book_relations"
    __table_args__ = (
        UniqueConstraint("book_a_id", "book_b_id", name="uq_book_relation"),
        CheckConstraint("book_a_id < book_b_id", name="ck_relation_order"),
        Index("ix_relation_a", "book_a_id"),
        Index("ix_relation_b", "book_b_id"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    book_a_id: Mapped[int] = mapped_column(ForeignKey("books.id", ondelete="CASCADE"), nullable=False)
    book_b_id: Mapped[int] = mapped_column(ForeignKey("books.id", ondelete="CASCADE"), nullable=False)
    weight: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    reason: Mapped[str] = mapped_column(String(60), default="related", nullable=False)
