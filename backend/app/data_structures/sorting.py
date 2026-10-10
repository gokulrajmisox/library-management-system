"""Sorting algorithms with step recording for the visualizer.

Both algorithms operate in place on an array of records and record a snapshot
of the order (list of ids) after every element movement so the frontend can
animate cards moving between positions.

C equivalents:

    void insertion_sort(Book a[], int n);                 /* O(n^2), stable  */
    void quick_sort(Book a[], int lo, int hi);            /* O(n log n) avg  */
    int  partition(Book a[], int lo, int hi);             /* Lomuto scheme   */
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Callable, Sequence, TypeVar

T = TypeVar("T")

ALGORITHM_INFO: dict[str, dict[str, str]] = {
    "insertion": {
        "name": "Insertion Sort",
        "best": "O(n)",
        "average": "O(n²)",
        "worst": "O(n²)",
        "space": "O(1)",
        "stable": "Yes",
        "description": "Builds the sorted array one element at a time by shifting larger elements right.",
    },
    "quick": {
        "name": "Quick Sort",
        "best": "O(n log n)",
        "average": "O(n log n)",
        "worst": "O(n²)",
        "space": "O(log n)",
        "stable": "No",
        "description": "Divide and conquer: partitions around a pivot (Lomuto), then recursively sorts both halves.",
    },
}


@dataclass
class SortResult:
    items: list[Any]
    comparisons: int = 0
    moves: int = 0
    steps: list[list[int]] = field(default_factory=list)


def _snapshot(arr: Sequence[Any], id_of: Callable[[Any], int]) -> list[int]:
    return [id_of(x) for x in arr]


def insertion_sort(
    items: Sequence[T],
    key: Callable[[T], Any],
    id_of: Callable[[T], int],
    reverse: bool = False,
    max_steps: int = 400,
) -> SortResult:
    a = list(items)
    res = SortResult(items=a)
    res.steps.append(_snapshot(a, id_of))

    def before(x: T, y: T) -> bool:
        # True if x must come strictly before y
        res.comparisons += 1
        return key(x) > key(y) if reverse else key(x) < key(y)

    for i in range(1, len(a)):
        cur = a[i]
        j = i - 1
        while j >= 0 and before(cur, a[j]):
            a[j + 1] = a[j]
            j -= 1
            res.moves += 1
        a[j + 1] = cur
        if j + 1 != i and len(res.steps) < max_steps:
            res.steps.append(_snapshot(a, id_of))
    return res


def quick_sort(
    items: Sequence[T],
    key: Callable[[T], Any],
    id_of: Callable[[T], int],
    reverse: bool = False,
    max_steps: int = 400,
) -> SortResult:
    a = list(items)
    res = SortResult(items=a)
    res.steps.append(_snapshot(a, id_of))

    def le(x: T, y: T) -> bool:
        res.comparisons += 1
        return key(x) >= key(y) if reverse else key(x) <= key(y)

    def swap(i: int, j: int) -> None:
        if i == j:
            return
        a[i], a[j] = a[j], a[i]
        res.moves += 1
        if len(res.steps) < max_steps:
            res.steps.append(_snapshot(a, id_of))

    def partition(lo: int, hi: int) -> int:
        # middle element as pivot avoids the O(n²) case on already-sorted input
        swap((lo + hi) // 2, hi)
        pivot = a[hi]
        i = lo - 1
        for j in range(lo, hi):
            if le(a[j], pivot):
                i += 1
                swap(i, j)
        swap(i + 1, hi)
        return i + 1

    # iterative with an explicit stack (C-style, avoids recursion limits)
    stack: list[tuple[int, int]] = [(0, len(a) - 1)]
    while stack:
        lo, hi = stack.pop()
        if lo < hi:
            p = partition(lo, hi)
            stack.append((lo, p - 1))
            stack.append((p + 1, hi))
    return res
