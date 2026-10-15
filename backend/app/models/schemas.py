from __future__ import annotations

import re
from datetime import datetime
from typing import Annotated, Any, Generic, Literal, Optional, TypeVar

from pydantic import BaseModel, ConfigDict, EmailStr, Field, PlainSerializer, field_validator

UTCDateTime = Annotated[datetime, PlainSerializer(lambda d: d.isoformat() + "Z", return_type=str)]
T = TypeVar("T")


def normalize_isbn(raw: str) -> str:
    return re.sub(r"[\s-]", "", raw or "").upper()


def validate_isbn(raw: str) -> str:
    isbn = normalize_isbn(raw)
    if re.fullmatch(r"\d{13}", isbn) or re.fullmatch(r"\d{9}[\dX]", isbn):
        return isbn
    raise ValueError("ISBN must contain 10 or 13 digits.")


# ---------------------------------------------------------------- categories
class CategoryOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    name: str
    slug: str


class CategoryWithCount(CategoryOut):
    book_count: int


# --------------------------------------------------------------------- books
class BookBase(BaseModel):
    isbn: str
    title: str = Field(min_length=1, max_length=255)
    author: str = Field(min_length=1, max_length=255)
    category_id: int
    publication_year: int = Field(ge=1450, le=2100)
    description: str = Field(default="", max_length=4000)
    total_copies: int = Field(ge=1, le=500)

    @field_validator("isbn")
    @classmethod
    def _isbn(cls, v: str) -> str:
        return validate_isbn(v)

    @field_validator("title", "author")
    @classmethod
    def _strip(cls, v: str) -> str:
        v = " ".join(v.split())
        if not v:
            raise ValueError("This field is required.")
        return v


class BookCreate(BookBase):
    pass


class BookUpdate(BookBase):
    pass


class BookOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    isbn: str
    title: str
    author: str
    category: CategoryOut
    publication_year: int
    description: str
    total_copies: int
    available_copies: int
    rating: float
    waiting_count: int = 0
    status: Literal["available", "limited", "unavailable"] = "available"
    created_at: UTCDateTime


class Page(BaseModel, Generic[T]):
    items: list[T]
    total: int
    page: int
    page_size: int
    pages: int


class SearchSuggestion(BaseModel):
    id: int
    title: str
    author: str
    isbn: str
    category: str
    available_copies: int
    match: Literal["title", "author", "isbn"]


class SearchResponse(BaseModel):
    query: str
    total: int
    method: str
    suggestions: list[SearchSuggestion]


class HashSearchResponse(BaseModel):
    isbn: str
    hash_value: int
    hash_function: str
    capacity: int
    bucket: int
    chain: list[dict[str, Any]]
    comparisons: int
    found: bool
    book: Optional[BookOut]
    complexity: str = "O(1) average, O(n) worst"


class BSTSearchResponse(BaseModel):
    query: str
    found: bool
    comparisons: int
    path: list[dict[str, Any]]
    tree_height: int
    node_count: int
    book: Optional[BookOut]
    complexity: str = "O(log n) average, O(n) worst"


class SortRequest(BaseModel):
    book_ids: list[int] = Field(min_length=1, max_length=200)
    key: Literal["title", "author", "year", "availability"] = "title"
    algorithm: Literal["insertion", "quick"] = "quick"
    order: Literal["asc", "desc"] = "asc"


class SortResponse(BaseModel):
    algorithm: dict[str, str]
    key: str
    order: str
    comparisons: int
    moves: int
    steps: list[list[int]]
    sorted_ids: list[int]
    elapsed_ms: float


# ------------------------------------------------------------------- members
class MemberBase(BaseModel):
    name: str = Field(min_length=2, max_length=120)
    email: EmailStr
    phone: str = Field(default="", max_length=20)

    @field_validator("name")
    @classmethod
    def _name(cls, v: str) -> str:
        v = " ".join(v.split())
        if len(v) < 2:
            raise ValueError("Name must be at least 2 characters.")
        return v

    @field_validator("phone")
    @classmethod
    def _phone(cls, v: str) -> str:
        v = v.strip()
        if v and not re.fullmatch(r"\+?[\d\s-]{7,20}", v):
            raise ValueError("Enter a valid phone number.")
        return v


class MemberCreate(MemberBase):
    pass


class MemberUpdate(MemberBase):
    active: bool = True


class MemberOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    member_code: str
    name: str
    email: str
    phone: str
    joined_at: UTCDateTime
    active: bool
    active_issues: int = 0
    total_borrowed: int = 0
    waiting_count: int = 0


class CsvImportResult(BaseModel):
    total_rows: int
    registered: int
    skipped: int
    errors: list[str]
    members: list[MemberOut]


class BookBorrower(BaseModel):
    member_id: int
    member_code: str
    name: str
    email: str
    phone: str
    issue_id: int
    issued_at: UTCDateTime
    due_at: UTCDateTime
    overdue: bool
    status: str


# -------------------------------------------------------------------- issues
class BookMini(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    title: str
    author: str
    isbn: str


class MemberMini(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    name: str
    member_code: str


class IssueOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    book: BookMini
    member: MemberMini
    issued_at: UTCDateTime
    due_at: UTCDateTime
    returned_at: Optional[UTCDateTime]
    status: str
    overdue: bool = False
    via_waitlist: bool = False


class IssueCreate(BaseModel):
    book_id: int
    member_id: int


class ReturnCreate(BaseModel):
    issue_id: Optional[int] = None
    book_id: Optional[int] = None
    member_id: Optional[int] = None


class ReturnResponse(BaseModel):
    issue: IssueOut
    next_in_queue: Optional[IssueOut] = None
    message: str


class UndoPreview(BaseModel):
    issue: IssueOut
    stack_size: int


class UndoResponse(BaseModel):
    undone: IssueOut
    stack_size: int
    message: str


# -------------------------------------------------------------- waiting list
class WaitingEntryOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    position: int
    member: MemberMini
    created_at: UTCDateTime


class WaitingListOut(BaseModel):
    book: BookMini
    available_copies: int
    total_copies: int
    queue: list[WaitingEntryOut]
    front: Optional[WaitingEntryOut]
    rear: Optional[WaitingEntryOut]


class WaitingJoin(BaseModel):
    member_id: int


class WaitingSummary(BaseModel):
    book: BookMini
    queue_size: int
    next_member: Optional[MemberMini]
    available_copies: int


# ------------------------------------------------------------------- recs
class RecommendationOut(BaseModel):
    book: BookOut
    score: float
    distance: int
    path: list[int]
    reason: str


class GraphNode(BaseModel):
    id: int
    title: str
    author: str
    category: str
    degree: int


class GraphEdge(BaseModel):
    source: int
    target: int
    weight: int
    reason: str


class GraphOut(BaseModel):
    nodes: list[GraphNode]
    edges: list[GraphEdge]


class RecommendationResponse(BaseModel):
    book: BookOut
    recommendations: list[RecommendationOut]
    neighbors: list[int]
    bfs_order: list[int]
    algorithm: str = "Breadth-First Search over adjacency list, depth ≤ 2"


# ---------------------------------------------------------------- activity
class ActivityOut(BaseModel):
    id: int
    kind: str
    message: str
    member: Optional[str] = None
    book: Optional[str] = None
    at: UTCDateTime
