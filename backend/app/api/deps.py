from fastapi import Request

from app.errors import Busy


def get_embedder(request: Request):
    embedder = getattr(request.app.state, "embedder", None)
    if embedder is None:
        raise Busy("Models are not loaded.")
    return embedder
