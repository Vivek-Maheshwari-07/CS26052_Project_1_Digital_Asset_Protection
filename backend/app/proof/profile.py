"""Verified creator profile: prove control of a public page (portfolio, website, Behance, GitHub...).

The creator adds a link and gets a code; they put the code anywhere on that page (bio, about text, a
post) and ask us to check. If the page contains the code, the link is verified and shown on the public
record of their works: "registered by an account that controls example.com/artist". It ties a
registration to an identity people already know, without collecting ID documents.

Fetching a user-supplied URL from the server is a classic way to reach internal services (SSRF), so
every hop is checked: http(s) only, public IP addresses only, a few redirects, a size and time limit.
Pages that only render with JavaScript or behind a login (Instagram, X) cannot be checked this way.
"""
import asyncio
import ipaddress
import secrets
import socket
from typing import Optional
from urllib.parse import urljoin, urlparse

import httpx

MAX_BYTES = 2_000_000
MAX_REDIRECTS = 3
TIMEOUT = 10.0
CODE_PREFIX = "provnet-verify-"


class ProfileCheckError(ValueError):
    pass


def new_code() -> str:
    return CODE_PREFIX + secrets.token_hex(5)


def normalize_url(url: str) -> str:
    url = (url or "").strip()
    parsed = urlparse(url)
    if parsed.scheme not in ("http", "https") or not parsed.hostname or len(url) > 500:
        raise ProfileCheckError("Enter the full link to your page, starting with https://")
    return url


async def _assert_public(host: str) -> None:
    try:
        infos = await asyncio.to_thread(socket.getaddrinfo, host, None)
    except socket.gaierror:
        raise ProfileCheckError("That site's address could not be found.")
    for info in infos:
        ip = ipaddress.ip_address(info[4][0].split("%")[0])
        if not ip.is_global or ip.is_multicast:
            raise ProfileCheckError("That address isn't a public website.")


async def fetch_page(url: str, client: Optional[httpx.AsyncClient] = None) -> str:
    """The page's text (first MAX_BYTES), following at most MAX_REDIRECTS redirects to public hosts."""
    owns_client = client is None
    client = client or httpx.AsyncClient(timeout=TIMEOUT, follow_redirects=False,
                                         headers={"User-Agent": "ProvNet profile check"})
    try:
        for _ in range(MAX_REDIRECTS + 1):
            normalize_url(url)
            await _assert_public(urlparse(url).hostname)
            async with client.stream("GET", url) as r:
                if r.is_redirect:
                    url = urljoin(url, r.headers.get("location", ""))
                    continue
                if r.status_code != 200:
                    raise ProfileCheckError(f"The page answered with status {r.status_code}.")
                body = b""
                async for chunk in r.aiter_bytes():
                    body += chunk
                    if len(body) >= MAX_BYTES:
                        break
                return body[:MAX_BYTES].decode(r.encoding or "utf-8", "replace")
        raise ProfileCheckError("The page redirected too many times.")
    except httpx.HTTPError as e:
        raise ProfileCheckError(f"The page could not be loaded ({type(e).__name__}).")
    finally:
        if owns_client:
            await client.aclose()


async def page_has_code(url: str, code: str, fetch=fetch_page) -> bool:
    return code in await fetch(url)
