"""In-memory sliding-window rate limiter per client IP."""

from __future__ import annotations

import collections
import threading
import time

from fastapi import HTTPException

from .config import RATE_LIMIT_PER_MINUTE

rate_limit_lock = threading.Lock()
request_timestamps: dict[str, collections.deque[float]] = collections.defaultdict(collections.deque)


def check_rate_limit(client_ip: str) -> None:
    if RATE_LIMIT_PER_MINUTE <= 0:
        return
    now = time.monotonic()
    window_start = now - 60.0
    with rate_limit_lock:
        bucket = request_timestamps[client_ip]
        while bucket and bucket[0] < window_start:
            bucket.popleft()
        if len(bucket) >= RATE_LIMIT_PER_MINUTE:
            raise HTTPException(
                status_code=429,
                detail="Terlalu banyak permintaan analisis. Silakan tunggu beberapa detik dan coba lagi.",
            )
        bucket.append(now)
