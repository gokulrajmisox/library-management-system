from __future__ import annotations

from typing import Any, Optional

from fastapi import APIRouter, Depends
from fastapi.responses import PlainTextResponse
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.models import Book, BookRelation
from app.models.schemas import GraphEdge, GraphNode, GraphOut, RecommendationOut, RecommendationResponse
from app.services import analytics_service, ds_service
from app.services.book_service import get_book, to_book_out
from app.services.engine import engine

router = APIRouter()


@router.get("/recommendations/graph", response_model=GraphOut, tags=["recommendations"])
def graph(db: Session = Depends(get_db)) -> GraphOut:
    books = db.execute(select(Book)).scalars().all()
    reasons = {(r.book_a_id, r.book_b_id): r.reason for r in db.execute(select(BookRelation)).scalars()}
    with engine.lock:
        edges = engine.graph.edges()
        degrees = {b.id: engine.graph.degree(b.id) for b in books}
    return GraphOut(
        nodes=[GraphNode(id=b.id, title=b.title, author=b.author, category=b.category.slug, degree=degrees.get(b.id, 0)) for b in books],
        edges=[GraphEdge(source=u, target=v, weight=w, reason=reasons.get((min(u, v), max(u, v)), "related")) for u, v, w in edges],
    )


@router.get("/recommendations/{book_id}", response_model=RecommendationResponse, tags=["recommendations"])
def recommendations(book_id: int, limit: int = 6, db: Session = Depends(get_db)) -> RecommendationResponse:
    book = get_book(db, book_id)
    with engine.lock:
        recs = engine.graph.recommend(book_id, max_depth=2, limit=limit)
        neighbors = list(engine.graph.neighbors(book_id))
        order = engine.graph.bfs_order(book_id)
    rows = {b.id: b for b in db.execute(select(Book).where(Book.id.in_([r.book_id for r in recs] or [-1]))).scalars()}
    out = [
        RecommendationOut(
            book=to_book_out(rows[r.book_id]),
            score=r.score,
            distance=r.distance,
            path=r.path,
            reason="Directly related" if r.distance == 1 else f"Via \u201c{rows[r.via].title if r.via in rows else 'a related book'}\u201d",
        )
        for r in recs
        if r.book_id in rows
    ]
    # resolve "via" titles that weren't part of the result set
    missing = {r.via for r in recs if r.via is not None and r.via not in rows and r.distance > 1}
    if missing:
        extra = {b.id: b.title for b in db.execute(select(Book).where(Book.id.in_(list(missing)))).scalars()}
        for o, r in zip(out, [r for r in recs if r.book_id in rows]):
            if r.distance > 1 and r.via in extra:
                o.reason = f"Via \u201c{extra[r.via]}\u201d"
    return RecommendationResponse(book=to_book_out(book), recommendations=out, neighbors=neighbors, bfs_order=order[:30])


@router.get("/analytics", tags=["analytics"])
def get_analytics(db: Session = Depends(get_db)) -> dict[str, Any]:
    return analytics_service.analytics(db)


@router.get("/reports/export", response_class=PlainTextResponse, tags=["analytics"])
def export_report(db: Session = Depends(get_db)) -> PlainTextResponse:
    return PlainTextResponse(
        analytics_service.export_csv(db),
        media_type="text/csv",
        headers={"Content-Disposition": 'attachment; filename="library-report.csv"'},
    )


@router.get("/data-structures/status", tags=["data-structures"])
def ds_status(db: Session = Depends(get_db)) -> dict[str, Any]:
    return ds_service.status(db)


@router.get("/data-structures/hash-table", tags=["data-structures"])
def ds_hash(db: Session = Depends(get_db)) -> dict[str, Any]:
    return ds_service.hash_table_view(db)


@router.get("/data-structures/bst", tags=["data-structures"])
def ds_bst() -> dict[str, Any]:
    return ds_service.bst_view()


class PlaygroundOp(BaseModel):
    op: str = Field(max_length=20)
    value: Optional[str] = Field(default=None, max_length=60)
    index: Optional[int] = Field(default=None, ge=0, le=50)


@router.get("/data-structures/playground/{structure}", tags=["data-structures"])
def playground_state(structure: str, db: Session = Depends(get_db)) -> dict[str, Any]:
    ds_service.playground.ensure(db)
    if structure not in ds_service.COMPLEXITY:
        from app.services.errors import AppError

        raise AppError(404, "Unknown data structure.", "unknown_structure")
    return {"structure": structure, "state": ds_service.playground.state(structure), "complexity": ds_service.COMPLEXITY[structure]}


@router.post("/data-structures/playground/{structure}", tags=["data-structures"])
def playground_op(structure: str, body: PlaygroundOp, db: Session = Depends(get_db)) -> dict[str, Any]:
    return ds_service.playground.apply(db, structure, body.op, body.value, body.index)
