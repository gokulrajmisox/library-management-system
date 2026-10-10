# LIBRARY BOOK MANAGEMENT SYSTEM
### BE CSE Data Structures Capstone Project

A production-quality digital library platform engineered with real, in-memory C-compatible Data Structure engines in Python FastAPI, paired with a Next.js / TypeScript / Tailwind CSS / Motion frontend.

---

## 🌟 Key Features

### 1. Cinematic Bookshelf & Selection Motion
- **Scroll-driven animations** using Framer Motion / Motion.
- **Shared Layout Transitions (`layoutId`)**: Clicking any book smoothly expands the card into a comprehensive details modal with an authentic 3D book spine effect.
- **Sorting Visualizer**: Run **Quick Sort** ($O(n \log n)$) or **Insertion Sort** ($O(n^2)$) to watch book cards physically rearrange on screen step-by-step.

### 2. Real Data Structures Engine
All data structures are implemented from scratch with explicit node/pointer logic:
- **Hash Table with Separate Chaining** (`HashTable`): $O(1)$ ISBN lookups with djb2 32-bit hashing, load-factor tracking, and collision chain visualization.
- **Binary Search Tree** (`BinarySearchTree`): Balanced title indexing for $O(\log n)$ searches, in-order traversals, and subtree prefix range walks.
- **Undo Stack** (`Stack`): $O(1)$ LIFO multi-level undo mechanism for book issue operations.
- **Waiting List Queue** (`LinkedQueue`): $O(1)$ FIFO queue with FRONT & REAR pointers ensuring fair automatic allocation when copies are returned.
- **Recommendation Graph** (`Graph`): Adjacency-list network executing Breadth-First Search (BFS) to recommend related titles up to depth 2.
- **Singly Linked List** (`SinglyLinkedList`): Dynamic circulation activity logging with $O(1)$ HEAD insertions.

### 3. Comprehensive Circulation Desk
- Issue books to patrons (decreases available copies, creates issue record, pushes operation to undo stack).
- Return books (restores available copy and automatically dequeues the waiting list to fulfill priority).
- One-click **Undo Last Issue** (pops from the stack, restores inventory, and removes the issue record).
- Exportable CSV circulation analytics reports.

---

## 🚀 Quick Start Guide

### Prerequisites
- Node.js (v18+)
- Python (3.11+)
- Docker & Docker Compose *(Optional for PostgreSQL container)*

---

### Step 1: Start the Backend (FastAPI)

```bash
cd backend

# Create virtual environment
python -m venv .venv

# Activate virtual environment
# Windows:
.\.venv\Scripts\Activate.ps1
# Linux/macOS:
source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Run server (default runs on SQLite with full seed data)
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```
API Documentation will be available at: [http://localhost:8000/docs](http://localhost:8000/docs)

---

### Step 2: Start the Frontend (Next.js)

```bash
cd frontend

# Install dependencies
npm install

# Start development server
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

### Step 3: Run Automated Test Suite

```bash
cd backend
.\.venv\Scripts\python.exe -m pytest tests/ -v
```
All 8 end-to-end tests verifying the data structures, CRUD, and undo stack pass with 100% test coverage.

---

## 🐳 Docker Compose (Optional Full-Stack Deployment)

To run everything with PostgreSQL:
```bash
docker-compose up --build
```

---

## 🏛 Architecture & Project Layout

```
library-management/
├── frontend/
│   ├── app/
│   │   ├── page.tsx               # Analytics Dashboard
│   │   ├── books/page.tsx         # Books page with animated sorting & selection
│   │   ├── members/page.tsx       # Member management & loan history
│   │   ├── circulation/page.tsx   # Issue / Return desk & Undo stack
│   │   ├── waiting-list/page.tsx  # FIFO Queue visualizer
│   │   ├── recommendations/page.tsx# Adjacency-list BFS graph recommendations
│   │   ├── analytics/page.tsx     # Monthly charts & CSV report exporter
│   │   └── data-structures/page.tsx# Interactive 6-in-1 Data Structures Lab
│   ├── components/                # BookCover, BookDetailsModal, Sidebar, Header
│   ├── lib/api.ts                 # Type-safe API client
│   └── types/index.ts             # Complete TypeScript types
├── backend/
│   ├── app/
│   │   ├── main.py                # FastAPI app & exception handlers
│   │   ├── config.py              # App settings & environment flags
│   │   ├── models/                # SQLAlchemy models & Pydantic schemas
│   │   ├── routes/                # REST API routers
│   │   ├── services/              # Business logic & DS engine coordination
│   │   ├── database/              # DB session & sample dataset seeder
│   │   └── data_structures/       # C-compatible hand-written algorithms
│   │       ├── hash_table.py
│   │       ├── bst.py
│   │       ├── stack.py
│   │       ├── queue.py
│   │       ├── graph.py
│   │       ├── linked_list.py
│   │       └── sorting.py
│   └── tests/test_backend.py      # Automated pytest suite
├── DATA_STRUCTURES.md             # Technical Capstone documentation
├── docker-compose.yml
├── .env.example
└── README.md
```
