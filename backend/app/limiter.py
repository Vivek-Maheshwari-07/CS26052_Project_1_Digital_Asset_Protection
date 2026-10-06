from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from slowapi import Limiter
from slowapi.errors import RateLimitExceeded
from slowapi.util import get_remote_address

limiter = Limiter(key_func=get_remote_address)


def install_limiter(app: FastAPI) -> None:
    app.state.limiter = limiter

    @app.exception_handler(RateLimitExceeded)
    async def rate_limit_handler(request: Request, exc: RateLimitExceeded):
        retry_after = getattr(exc, "retry_after", 60)
        return JSONResponse(
            status_code=429,
            content={"error": "rate_limited", "message": "Rate limit exceeded."},
            headers={"Retry-After": str(retry_after)},
        )
