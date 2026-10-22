"""Tests for Mark ALM Copilot API."""
import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app
from app.api.mark import MarkChatResponse
from unittest.mock import patch, AsyncMock


@pytest.mark.asyncio
async def test_mark_chat_fallback_intents():
    # Force query_ollama to return None to test the fallback intent engine
    with patch("app.api.mark.query_ollama", new_callable=AsyncMock, return_value=None):
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            # Explode pixels intent
            res = await client.post("/api/mark/chat", json={"message": "Please explode pixels in 3D"})
            assert res.status_code == 200
            data = res.json()
            assert data["action"] == "EXPLODE_PIXELS"
            assert data["target"] == "/how-it-works"

            # Phash tech explanation
            res = await client.post("/api/mark/chat", json={"message": "How does phash work?"})
            assert res.status_code == 200
            data = res.json()
            assert data["action"] == "EXPLAIN_TECH"
            assert data["tech"] == "phash"

            # Register work intent
            res = await client.post("/api/mark/chat", json={"message": "I want to register my new painting"})
            assert res.status_code == 200
            data = res.json()
            assert data["action"] == "FOCUS_REGISTER"
            assert data["target"] == "/works/new"

            # Check infringement intent
            res = await client.post("/api/mark/chat", json={"message": "Help me scan an image to see if it was stolen"})
            assert res.status_code == 200
            data = res.json()
            assert data["action"] == "NAVIGATE"
            assert data["target"] == "/check"


@pytest.mark.asyncio
async def test_mark_chat_ollama_mock():
    mock_llm_res = MarkChatResponse(
        reply="Navigating you to our 3D twin now!",
        action="OPEN_SIMULATOR",
        target="/how-it-works",
        tech=None,
    )

    with patch("app.api.mark.query_ollama", new_callable=AsyncMock, return_value=mock_llm_res):
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            res = await client.post("/api/mark/chat", json={"message": "surprise me with something cool"})
            assert res.status_code == 200
            data = res.json()
            assert data["action"] == "OPEN_SIMULATOR"
            assert data["target"] == "/how-it-works"
            assert "3D twin" in data["reply"]


@pytest.mark.asyncio
async def test_mark_clear_commands_skip_the_model():
    """Clear commands are answered by rules, so the local model is never called (the main latency saving)."""
    from app.api import mark
    mark._cache.clear()
    with patch("app.api.mark.query_ollama", new_callable=AsyncMock) as llm:
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            res = await client.post("/api/mark/chat", json={"message": "explode pixels"})
            assert res.json()["action"] == "EXPLODE_PIXELS"
        llm.assert_not_called()


@pytest.mark.asyncio
async def test_mark_open_question_uses_model_and_is_cached():
    from app.api import mark
    mark._cache.clear()
    answer = MarkChatResponse(reply="Because hashes are tiny.", action="NONE")
    with patch("app.api.mark.query_ollama", new_callable=AsyncMock, return_value=answer) as llm:
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            for _ in range(2):
                res = await client.post("/api/mark/chat", json={"message": "Why is this fast?"})
                assert res.json()["reply"] == "Because hashes are tiny."
        assert llm.await_count == 1
