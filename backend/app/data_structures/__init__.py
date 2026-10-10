"""Data Structure Engine.

Each module in this package is a hand-written, C-compatible implementation of a
classic data structure (explicit nodes + pointers, no reliance on Python's
built-in list/dict for the core logic where the structure defines the storage).
"""

from .linked_list import SinglyLinkedList
from .stack import Stack, StackUnderflowError
from .queue import LinkedQueue, QueueUnderflowError
from .hash_table import HashTable
from .bst import BinarySearchTree
from .graph import Graph
from .sorting import insertion_sort, quick_sort, SortResult, ALGORITHM_INFO

__all__ = [
    "SinglyLinkedList",
    "Stack",
    "StackUnderflowError",
    "LinkedQueue",
    "QueueUnderflowError",
    "HashTable",
    "BinarySearchTree",
    "Graph",
    "insertion_sort",
    "quick_sort",
    "SortResult",
    "ALGORITHM_INFO",
]
