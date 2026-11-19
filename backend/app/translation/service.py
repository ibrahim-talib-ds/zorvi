import asyncio
import hashlib
import logging
import os
import re

import httpx
from sqlalchemy import text

from app.core.database import AsyncSessionLocal

logger = logging.getLogger(__name__)

MYMEMORY_URL = "https://api.mymemory.translated.net/get"
MAX_CHUNK_CHARS = 200      # MyMemory rejects queries over 500 bytes
CONCURRENCY = 4            # Limit concurrent requests to free API
PROVIDER = "mymemory"
MYMEMORY_EMAIL = os.getenv("MYMEMORY_EMAIL")

# MyMemory needs region codes for some languages ("zh" alone is rejected)
MYMEMORY_LANG_MAP = {"zh": "zh-CN"}


def _hash(value: str) -> str:
    return hashlib.sha256(value.encode("utf-8")).hexdigest()


def _split(value: str) -> list[str]:
    if len(value) <= MAX_CHUNK_CHARS:
        return [value]

    pieces: list[str] = []
    for sentence in re.split(r"(?<=[.!?])\s+", value):
        while len(sentence) > MAX_CHUNK_CHARS:
            cut = sentence.rfind(" ", 0, MAX_CHUNK_CHARS)
            cut = cut if cut > 0 else MAX_CHUNK_CHARS
            pieces.append(sentence[:cut].strip())
            sentence = sentence[cut:].strip()
        if sentence:
            pieces.append(sentence)

    chunks: list[str] = []
    current = ""
    for piece in pieces:
        if current and len(current) + len(piece) + 1 > MAX_CHUNK_CHARS:
            chunks.append(current)
            current = piece
        else:
            current = f"{current} {piece}".strip()
    if current:
        chunks.append(current)
    return chunks


async def _translate_chunk(client: httpx.AsyncClient, chunk: str, source: str, target: str) -> str | None:
    source = MYMEMORY_LANG_MAP.get(source, source)
    target = MYMEMORY_LANG_MAP.get(target, target)
    params = {"q": chunk, "langpair": f"{source}|{target}"}
    if MYMEMORY_EMAIL:
        params["de"] = MYMEMORY_EMAIL

    try:
        resp = await client.get(MYMEMORY_URL, params=params)
    except httpx.HTTPError as exc:
        logger.error("MyMemory network error: %r", exc)
        return None

    if resp.status_code != 200:
        logger.error("MyMemory HTTP %s: %s", resp.status_code, resp.text[:200])
        return None

    data = resp.json()
    if str(data.get("responseStatus")) != "200":
        logger.error("MyMemory status %s: %s", data.get("responseStatus"), data.get("responseDetails"))
        return None

    translated = data.get("responseData", {}).get("translatedText", "").strip()
    return translated or None


async def _translate_full(client: httpx.AsyncClient, value: str, source: str, target: str) -> str | None:
    parts: list[str] = []
    for chunk in _split(value):
        out = await _translate_chunk(client, chunk, source, target)
        if out is None:
            return None
        parts.append(out)
    return " ".join(parts)


async def _translate_missing(items: list[str], source: str, target: str) -> dict[str, str]:
    semaphore = asyncio.Semaphore(CONCURRENCY)
    async with httpx.AsyncClient(timeout=15) as client:
        async def run(item: str) -> tuple[str, str | None]:
            async with semaphore:
                try:
                    return item, await _translate_full(client, item, source, target)
                except httpx.HTTPError as exc:
                    logger.warning("Translation request failed: %s", exc)
                    return item, None
        results = await asyncio.gather(*(run(i) for i in items))
    return {src: out for src, out in results if out}


async def translate_many(texts: list[str], target: str, source: str = "en") -> list[str]:
    if target == source:
        return list(texts)

    cleaned = {t: t.strip() for t in texts if t and t.strip()}
    unique = list(dict.fromkeys(cleaned.values()))
    if not unique:
        return list(texts)

    hashes = {value: _hash(value) for value in unique}

    async with AsyncSessionLocal() as db:
        rows = (
            await db.execute(
                text("""
                    SELECT source_hash, translated_text
                    FROM translation_cache
                    WHERE target_lang = :target AND source_hash = ANY(:hashes)
                """),
                {"target": target, "hashes": list(hashes.values())},
            )
        ).all()
        lookup = {row.source_hash: row.translated_text for row in rows}

        missing = [value for value in unique if hashes[value] not in lookup]
        if missing:
            fresh = await _translate_missing(missing, source, target)
            if fresh:
                await db.execute(
                    text("""
                        INSERT INTO translation_cache
                            (source_hash, source_lang, target_lang, source_text, translated_text, provider)
                        VALUES (:h, :sl, :tl, :src, :out, :provider)
                        ON CONFLICT (source_hash, target_lang) DO NOTHING
                    """),
                    [
                        {"h": hashes[src], "sl": source, "tl": target,
                         "src": src, "out": out, "provider": PROVIDER}
                        for src, out in fresh.items()
                    ],
                )
                await db.commit()
                lookup.update({hashes[src]: out for src, out in fresh.items()})

    return [
        lookup.get(hashes[cleaned[t]], t) if t in cleaned else t
        for t in texts
    ]
