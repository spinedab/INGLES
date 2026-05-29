"""Session storage para conversaciones del tutor IA (Redis-backed)."""
from __future__ import annotations

import hashlib
import json
import secrets
import time
from dataclasses import dataclass, field
from typing import Any

import redis

from .config import settings


SESSION_KEY_PREFIX = "ingles:sess:"
SESSION_TTL_SECONDS = 30 * 24 * 3600  # 30 días para learning (más que Confessio)
MAX_TURNS_PER_SESSION = 200            # learning permite sesiones más largas
HISTORY_TURNS_TO_LLM = 20              # 10 user + 10 assistant


@dataclass
class Turn:
    role: str
    content: str
    ts: float

    def to_dict(self) -> dict[str, Any]:
        return {"role": self.role, "content": self.content, "ts": self.ts}

    @classmethod
    def from_dict(cls, d: dict[str, Any]) -> "Turn":
        return cls(
            role=str(d.get("role", "user")),
            content=str(d.get("content", "")),
            ts=float(d.get("ts") or time.time()),
        )


@dataclass
class Session:
    id: str
    owner_hash: str
    created_at: float
    last_active: float
    level: str = "b1"
    mode: str = "conversation"     # conversation | roleplay | grammar
    scenario: str | None = None    # solo para mode=roleplay
    learner_turns: int = 0          # cuenta para el noticing block cada 6
    turns: list[Turn] = field(default_factory=list)

    def to_dict(self) -> dict[str, Any]:
        return {
            "id": self.id,
            "owner_hash": self.owner_hash,
            "created_at": self.created_at,
            "last_active": self.last_active,
            "level": self.level,
            "mode": self.mode,
            "scenario": self.scenario,
            "learner_turns": self.learner_turns,
            "turns": [t.to_dict() for t in self.turns],
        }

    @classmethod
    def from_dict(cls, d: dict[str, Any]) -> "Session":
        return cls(
            id=str(d["id"]),
            owner_hash=str(d.get("owner_hash", "")),
            created_at=float(d.get("created_at") or time.time()),
            last_active=float(d.get("last_active") or time.time()),
            level=str(d.get("level", "b1")),
            mode=str(d.get("mode", "conversation")),
            scenario=d.get("scenario"),
            learner_turns=int(d.get("learner_turns", 0)),
            turns=[Turn.from_dict(t) for t in d.get("turns", [])],
        )


# ────────────────────────────────────────────────────────────────────────


_redis: redis.Redis | None = None


def _get_redis() -> redis.Redis:
    global _redis
    if _redis is None:
        url = settings.ingles_redis_url or "redis://127.0.0.1:6379/5"
        _redis = redis.Redis.from_url(
            url,
            decode_responses=True,
            socket_timeout=5,
            socket_connect_timeout=5,
        )
    return _redis


def _key(session_id: str) -> str:
    return SESSION_KEY_PREFIX + session_id


def _hash_ip(ip: str) -> str:
    return hashlib.sha256(("ingles-owner-v1::" + ip).encode("utf-8")).hexdigest()[:32]


def _timing_safe_eq(a: str, b: str) -> bool:
    if len(a) != len(b):
        return False
    r = 0
    for x, y in zip(a, b):
        r |= ord(x) ^ ord(y)
    return r == 0


# ────────────────────────────────────────────────────────────────────────


def create_session(
    *,
    ip: str,
    level: str = "b1",
    mode: str = "conversation",
    scenario: str | None = None,
) -> Session:
    session_id = secrets.token_urlsafe(16)
    now = time.time()
    s = Session(
        id=session_id,
        owner_hash=_hash_ip(ip),
        created_at=now,
        last_active=now,
        level=level,
        mode=mode,
        scenario=scenario,
    )
    _save(s)
    return s


def load_session(session_id: str, *, ip: str) -> Session | None:
    raw = _get_redis().get(_key(session_id))
    if not raw:
        return None
    try:
        s = Session.from_dict(json.loads(raw))
    except (ValueError, KeyError):
        return None
    if not _timing_safe_eq(s.owner_hash, _hash_ip(ip)):
        return None
    return s


def append_turn(session: Session, *, role: str, content: str) -> None:
    if role not in ("user", "assistant"):
        raise ValueError(f"role inválido: {role}")
    session.turns.append(Turn(role=role, content=content, ts=time.time()))
    if role == "user":
        session.learner_turns += 1
    if len(session.turns) > MAX_TURNS_PER_SESSION:
        session.turns = session.turns[-MAX_TURNS_PER_SESSION:]
    session.last_active = time.time()
    _save(session)


def history_for_llm(session: Session) -> list[dict[str, str]]:
    return [
        {"role": t.role, "content": t.content}
        for t in session.turns[-(HISTORY_TURNS_TO_LLM * 2):]
    ]


def delete_session(session_id: str, *, ip: str) -> bool:
    existing = load_session(session_id, ip=ip)
    if existing is None:
        return False
    _get_redis().delete(_key(session_id))
    return True


def _save(session: Session) -> None:
    payload = json.dumps(session.to_dict(), ensure_ascii=False)
    _get_redis().setex(_key(session.id), SESSION_TTL_SECONDS, payload)
