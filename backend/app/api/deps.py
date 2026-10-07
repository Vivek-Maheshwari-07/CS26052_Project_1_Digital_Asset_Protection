from fastapi import Request

from app.errors import Busy


def get_embedder(request: Request):
    embedder = getattr(request.app.state, "embedder", None)
    if embedder is None:
        raise Busy("Models are not loaded.")
    return embedder


def get_optional_embedder(request: Request):
    """Embedder or None. For endpoints that only need models on some paths (the verify cascade),
    so a hash-decided query still succeeds while models are unavailable."""
    return getattr(request.app.state, "embedder", None)
