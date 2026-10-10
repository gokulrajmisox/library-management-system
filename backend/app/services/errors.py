from __future__ import annotations


class AppError(Exception):
    """A user-facing error. Never carries stack traces to the client."""

    def __init__(self, status_code: int, message: str, code: str = "error") -> None:
        super().__init__(message)
        self.status_code = status_code
        self.message = message
        self.code = code


def not_found(what: str = "Resource") -> AppError:
    return AppError(404, f"{what} not found.", "not_found")


def conflict(message: str, code: str = "conflict") -> AppError:
    return AppError(409, message, code)
