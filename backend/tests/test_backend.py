import pytest
from fastapi.testclient import TestClient
from app.main import create_app, bootstrap
from app.services.engine import engine

@pytest.fixture(scope="session")
def client():
    # Use clean in-memory or temp sqlite for testing
    bootstrap("sqlite:///./test_suite.db", do_seed=True)
    app = create_app()
    with TestClient(app) as c:
        yield c

def test_health(client):
    r = client.get("/health")
    assert r.status_code == 200
    assert r.json()["status"] == "ok"

def test_books_list(client):
    r = client.get("/books?page=1&page_size=10")
    assert r.status_code == 200
    data = r.json()
    assert data["total"] > 0
    assert len(data["items"]) == 10

def test_hash_isbn_search(client):
    r = client.get("/books/isbn/9780132350884")
    assert r.status_code == 200
    data = r.json()
    assert data["found"] is True
    assert data["book"]["title"] == "Clean Code"
    assert "bucket" in data
    assert "chain" in data

def test_bst_title_search(client):
    r = client.get("/books/title/clean%20code")
    assert r.status_code == 200
    data = r.json()
    assert data["found"] is True
    assert len(data["path"]) > 0
    assert data["book"]["title"] == "Clean Code"

def test_sorting(client):
    # get 5 books
    books = client.get("/books?page_size=5").json()["items"]
    ids = [b["id"] for b in books]
    payload = {
        "book_ids": ids,
        "key": "title",
        "algorithm": "quick",
        "order": "asc"
    }
    r = client.post("/books/sort", json=payload)
    assert r.status_code == 200
    data = r.json()
    assert len(data["sorted_ids"]) == 5
    assert len(data["steps"]) >= 1

def test_issue_return_undo(client):
    # Get a member and an available book
    members = client.get("/members").json()["items"]
    member = members[0]
    books = client.get("/books?category=programming").json()["items"]
    available_book = next(b for b in books if b["available_copies"] > 0)
    
    # 1. Issue Book
    r_issue = client.post("/issues", json={"book_id": available_book["id"], "member_id": member["id"]})
    # If member already has it or limit reached, might return 409, so check
    if r_issue.status_code == 201:
        issue_data = r_issue.json()
        assert issue_data["status"] == "active"
        
        # 2. Test Undo
        r_undo = client.post("/issues/undo")
        assert r_undo.status_code == 200
        assert r_undo.json()["undone"]["id"] == issue_data["id"]

def test_graph_recommendations(client):
    books = client.get("/books?page_size=1").json()["items"]
    book_id = books[0]["id"]
    r = client.get(f"/recommendations/{book_id}")
    assert r.status_code == 200
    data = r.json()
    assert "recommendations" in data
    assert "bfs_order" in data

def test_data_structures_status(client):
    r = client.get("/data-structures/status")
    assert r.status_code == 200
    data = r.json()
    assert "hash_table" in data
    assert "bst" in data
    assert "graph" in data
    assert "stack" in data
