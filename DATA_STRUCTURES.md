# DATA STRUCTURES ARCHITECTURAL MANIFESTO
## BE CSE Capstone Project: Library Book Management System

This document outlines the real, C-compatible, in-memory data structures implemented and integrated into the Library Book Management System backend.

---

### 1. Hash Table with Separate Chaining (`app/data_structures/hash_table.py`)
- **Real-World Purpose**: Instant O(1) ISBN lookups, duplicate detection, and collision handling.
- **C Equivalent**:
  ```c
  typedef struct Entry {
      char isbn[14];
      int book_id;
      struct Entry *next;
  } Entry;

  typedef struct {
      Entry **buckets;
      int capacity;
      int size;
  } HashTable;
  ```
- **Hash Function**: 32-bit `djb2` (`h = ((h << 5) + h) + c`).
- **Collision Resolution**: Linked separate chaining.
- **Time Complexity**:
  - Average Lookup: $O(1)$
  - Worst Case: $O(n)$

---

### 2. Binary Search Tree (`app/data_structures/bst.py`)
- **Real-World Purpose**: Search books by title, alphabetical ordering, and prefix range queries.
- **C Equivalent**:
  ```c
  typedef struct BSTNode {
      char title[256];
      int book_id;
      struct BSTNode *left;
      struct BSTNode *right;
  } BSTNode;
  ```
- **Operations**:
  - `insert(title, book_id)`
  - `search(title)` -> Returns visited step path for visualizer
  - `prefix_search(prefix)` -> Subtree pruned range walk
- **Time Complexity**:
  - Average Search: $O(\log n)$
  - Worst Case: $O(n)$

---

### 3. Stack (`app/data_structures/stack.py`)
- **Real-World Purpose**: Multi-level Undo Stack for book issue operations (LIFO).
- **C Equivalent**:
  ```c
  typedef struct StackNode {
      IssueOp op;
      struct StackNode *next;
  } StackNode;

  typedef struct {
      StackNode *top;
      int size;
  } Stack;
  ```
- **Operations**:
  - `push(op)`: $O(1)$
  - `pop()`: $O(1)$
  - `peek()`: $O(1)$

---

### 4. Queue with Front & Rear Pointers (`app/data_structures/queue.py`)
- **Real-World Purpose**: FIFO Waiting Lists for unavailable book titles.
- **C Equivalent**:
  ```c
  typedef struct QNode {
      int member_id;
      struct QNode *next;
  } QNode;

  typedef struct {
      QNode *front;
      QNode *rear;
      int size;
  } Queue;
  ```
- **Operations**:
  - `enqueue(member)`: $O(1)$ at REAR
  - `dequeue()`: $O(1)$ from FRONT

---

### 5. Graph (`app/data_structures/graph.py`)
- **Real-World Purpose**: Book recommendation network with relationship weights.
- **Representation**: Adjacency lists (`dict[int, dict[int, int]]`).
- **Algorithm**: Breadth-First Search (BFS) bounded by depth $\le 2$ with scoring heuristic $\sum \frac{\text{weight}}{\text{distance}}$.
- **Time Complexity**: $O(V + E)$

---

### 6. Singly Linked List (`app/data_structures/linked_list.py`)
- **Real-World Purpose**: Dynamic circulation event and activity feed with newest events inserted at HEAD in $O(1)$ time.

---

### 7. Sorting Algorithms (`app/data_structures/sorting.py`)
- **Insertion Sort**: Stable, $O(n^2)$ worst case, $O(n)$ best case.
- **Quick Sort**: Divide-and-conquer with Lomuto partition, $O(n \log n)$ average time complexity.
- **Visual Snapshotting**: Captures array state after each element movement so Framer Motion / Motion can animate cards dynamically.
