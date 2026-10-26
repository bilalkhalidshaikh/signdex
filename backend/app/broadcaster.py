"""In-process fan-out of signal events to connected dashboard clients (Server-Sent Events)."""
import asyncio
import json
import logging
from typing import Any

logger = logging.getLogger("radar.broadcast")


def format_sse(event: str, data: dict[str, Any]) -> str:
    return f"event: {event}\ndata: {json.dumps(data, separators=(',', ':'))}\n\n"


class Broadcaster:
    def __init__(self) -> None:
        self._subscribers: set[asyncio.Queue[str]] = set()

    @property
    def client_count(self) -> int:
        return len(self._subscribers)

    def subscribe(self) -> asyncio.Queue[str]:
        queue: asyncio.Queue[str] = asyncio.Queue(maxsize=100)
        self._subscribers.add(queue)
        logger.info("stream client connected (%d active)", len(self._subscribers))
        return queue

    def unsubscribe(self, queue: asyncio.Queue[str]) -> None:
        self._subscribers.discard(queue)
        logger.info("stream client disconnected (%d active)", len(self._subscribers))

    async def publish(self, event: str, data: dict[str, Any]) -> None:
        message = format_sse(event, data)
        for queue in list(self._subscribers):
            try:
                queue.put_nowait(message)
            except asyncio.QueueFull:
                # A stalled client must never block ingestion; drop it and let EventSource reconnect.
                self._subscribers.discard(queue)
                logger.warning("dropped slow stream client")


broadcaster = Broadcaster()
