import logging
from typing import Any

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

logger = logging.getLogger("provnet")


class ProvNetError(Exception):
    def __init__(
        self,
        message: str,
        status: int = 400,
        code: str = "error",
        extra: dict[str, Any] | None = None,
    ):
        super().__init__(message)
        self.message = message
        self.status = status
        self.code = code
        self.extra = extra or {}


class InvalidImage(ProvNetError):
    def __init__(self, message: str = "Invalid image file.", extra: dict[str, Any] | None = None):
        super().__init__(message, status=400, code="invalid_image", extra=extra)


class NotFound(ProvNetError):
    def __init__(self, message: str = "Resource not found.", extra: dict[str, Any] | None = None):
        super().__init__(message, status=404, code="not_found", extra=extra)


class TooLarge(ProvNetError):
    def __init__(self, message: str = "Image file too large.", extra: dict[str, Any] | None = None):
        super().__init__(message, status=413, code="too_large", extra=extra)


class UnsupportedFormat(ProvNetError):
    def __init__(self, message: str = "Unsupported image format.", extra: dict[str, Any] | None = None):
        super().__init__(message, status=415, code="unsupported_format", extra=extra)


class Busy(ProvNetError):
    def __init__(self, message: str = "Server is busy. Try again later.", extra: dict[str, Any] | None = None):
        super().__init__(message, status=503, code="busy", extra=extra)


def register_error_handlers(app: FastAPI) -> None:
    @app.exception_handler(ProvNetError)
    async def provnet_error_handler(request: Request, exc: ProvNetError):
        body = {"error": exc.code, "message": exc.message}
        body.update(exc.extra)
        return JSONResponse(status_code=exc.status, content=body)

    @app.exception_handler(RequestValidationError)
    async def validation_error_handler(request: Request, exc: RequestValidationError):
        return JSONResponse(
            status_code=422,
            content={"error": "validation_error", "message": str(exc)},
        )

    @app.exception_handler(StarletteHTTPException)
    async def http_exception_handler(request: Request, exc: StarletteHTTPException):
        if exc.status_code == 404:
            return JSONResponse(
                status_code=404,
                content={"error": "not_found", "message": exc.detail or "Not found"},
            )
        return JSONResponse(
            status_code=exc.status_code,
            content={"error": "http_error", "message": exc.detail},
        )

    @app.exception_handler(Exception)
    async def unhandled_exception_handler(request: Request, exc: Exception):
        logger.exception("Unhandled server exception: %s", exc)
        return JSONResponse(
            status_code=500,
            content={"error": "internal_error", "message": "An unexpected error occurred."},
        )
