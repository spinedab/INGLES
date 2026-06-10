"""FastAPI entry — Ingles Tutor API.

Endpoints:
- GET    /health
- GET    /v1/scenarios
- POST   /v1/sessions/start
- POST   /v1/sessions/{id}/respond
- POST   /v1/sessions/{id}/stream      (SSE)
- GET    /v1/sessions/{id}
- DELETE /v1/sessions/{id}
"""
from __future__ import annotations

import json
import logging
import time
from typing import Annotated, Any

from fastapi import Depends, FastAPI, Header, HTTPException, Path, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field

from . import sessions as sess
from . import tutor
from .claude import generate_reply, stream_reply
from .config import settings

logging.basicConfig(
    level=getattr(logging, settings.ingles_log_level.upper(), logging.INFO),
    format="%(asctime)s %(levelname)s %(name)s %(message)s",
)
log = logging.getLogger("ingles.api")


app = FastAPI(
    title="Ingles Tutor API",
    version="1.0.0",
    description=(
        "Tutor IA conversacional de inglés. Aplica principios SLA (Krashen, Swain, "
        "Long, Schmidt, Vygotsky/Lantolf) sobre conversación libre, roleplay y gramática."
    ),
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=False,
    allow_methods=["GET", "POST", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)


# ───── Auth (Bearer opcional) ─────

def require_token(authorization: Annotated[str | None, Header()] = None) -> None:
    if not settings.ingles_api_token:
        return  # auth desactivada
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(status_code=401, detail="missing token")
    token = authorization.split(" ", 1)[1].strip()
    if token != settings.ingles_api_token:
        raise HTTPException(status_code=401, detail="invalid token")


def _client_ip(request: Request) -> str:
    # X-Forwarded-For solo es confiable detrás de un reverse proxy que lo
    # sobreescriba; expuesto directo a internet, el cliente puede falsearlo
    # (rompería rate-limit y el binding IP de sesiones). Controlado por
    # INGLES_TRUST_PROXY (ver config.py).
    if settings.ingles_trust_proxy:
        fwd = request.headers.get("x-forwarded-for")
        if fwd:
            return fwd.split(",")[0].strip()
    if request.client:
        return request.client.host
    return "unknown"


# ───── Rate limit muy simple por IP (in-memory) ─────

_RATE: dict[str, tuple[float, int]] = {}


def _rate_ok(ip: str) -> bool:
    max_per_min = settings.ingles_rate_limit_per_min
    if max_per_min <= 0:
        return True
    now = time.time()
    window_start, count = _RATE.get(ip, (now, 0))
    if now - window_start > 60.0:
        window_start, count = now, 0
    count += 1
    _RATE[ip] = (window_start, count)
    return count <= max_per_min


# ───── Schemas ─────


class SessionStartRequest(BaseModel):
    level: str = Field(default="b1", min_length=2, max_length=2)
    mode: str = Field(default="conversation")
    scenario: str | None = Field(default=None)


class SessionStartResponse(BaseModel):
    session_id: str = Field(alias="sessionId")
    level: str
    mode: str
    scenario: str | None
    created_at: float = Field(alias="createdAt")

    model_config = {"populate_by_name": True}


class SessionTurnRequest(BaseModel):
    text: str = Field(min_length=1, max_length=4000)
    grammar_topic: str | None = Field(default=None, alias="grammarTopic")

    model_config = {"populate_by_name": True}


class SessionTurnResponse(BaseModel):
    session_id: str = Field(alias="sessionId")
    reply: str
    model: str
    provider: str
    turn_index: int = Field(alias="turnIndex")
    learner_turns: int = Field(alias="learnerTurns")

    model_config = {"populate_by_name": True}


class SessionView(BaseModel):
    session_id: str = Field(alias="sessionId")
    level: str
    mode: str
    scenario: str | None
    created_at: float = Field(alias="createdAt")
    last_active: float = Field(alias="lastActive")
    learner_turns: int = Field(alias="learnerTurns")
    turns: list[dict]

    model_config = {"populate_by_name": True}


# ───── Endpoints ─────


@app.get("/health")
def health() -> dict[str, Any]:
    return {
        "status": "ok",
        "provider": settings.active_provider,
        "model": (
            settings.openclaw_model if settings.active_provider == "openclaw"
            else settings.gemma_model if settings.active_provider == "gemma"
            else settings.ingles_model if settings.active_provider == "anthropic"
            else "none"
        ),
        "scenarios_loaded": len(tutor.list_scenarios()),
    }


@app.get("/v1/scenarios")
def get_scenarios() -> dict[str, Any]:
    return tutor.list_scenarios()


@app.post("/v1/sessions/start", response_model=SessionStartResponse)
def start_session(
    payload: SessionStartRequest, request: Request, _: None = Depends(require_token)
) -> SessionStartResponse:
    ip = _client_ip(request)
    if not _rate_ok(ip):
        raise HTTPException(status_code=429, detail="rate limit exceeded")

    if payload.mode not in tutor.VALID_MODES:
        raise HTTPException(status_code=400, detail=f"mode debe ser uno de {tutor.VALID_MODES}")
    if payload.level.lower() not in tutor.VALID_LEVELS:
        raise HTTPException(status_code=400, detail=f"level debe ser uno de {tutor.VALID_LEVELS}")
    if payload.mode == "roleplay" and not payload.scenario:
        raise HTTPException(status_code=400, detail="scenario es requerido cuando mode=roleplay")
    if payload.mode == "roleplay" and payload.scenario not in tutor.list_scenarios():
        raise HTTPException(
            status_code=400,
            detail=f"scenario inválido. Disponibles: {list(tutor.list_scenarios().keys())}",
        )

    session = sess.create_session(
        ip=ip, level=payload.level.lower(), mode=payload.mode, scenario=payload.scenario
    )
    log.info("session_create ip=%s id=%s level=%s mode=%s", ip, session.id, session.level, session.mode)
    return SessionStartResponse(
        session_id=session.id,
        level=session.level,
        mode=session.mode,
        scenario=session.scenario,
        created_at=session.created_at,
    )


def _prepare_turn(session_id: str, payload: SessionTurnRequest, ip: str) -> tuple[sess.Session, str, list[dict[str, str]]]:
    """Helper común entre /respond y /stream."""
    if not _rate_ok(ip):
        raise HTTPException(status_code=429, detail="rate limit exceeded")
    session = sess.load_session(session_id, ip=ip)
    if session is None:
        raise HTTPException(status_code=404, detail="session not found")

    # Registrar user turn ANTES de llamar al LLM, para que learner_turns avance.
    sess.append_turn(session, role="user", content=payload.text)

    system_prompt = tutor.build_system_prompt(
        level=session.level,
        mode=session.mode,
        scenario=session.scenario,
        learner_turns=session.learner_turns,
        grammar_topic=payload.grammar_topic,
    )
    # historia previa al user_text recién agregado (lo excluimos para no duplicarlo).
    history = sess.history_for_llm(session)
    if history and history[-1].get("role") == "user":
        history = history[:-1]

    return session, system_prompt, history


@app.post("/v1/sessions/{session_id}/respond", response_model=SessionTurnResponse)
def session_respond(
    session_id: Annotated[str, Path()],
    payload: SessionTurnRequest,
    request: Request,
    _: None = Depends(require_token),
) -> SessionTurnResponse:
    ip = _client_ip(request)
    session, system_prompt, history = _prepare_turn(session_id, payload, ip)

    try:
        generated = generate_reply(
            system_prompt=system_prompt,
            history=history,
            user_text=payload.text,
            max_tokens=1200,
        )
    except Exception as exc:
        log.exception("respond_failed session=%s err=%s", session_id, exc)
        raise HTTPException(status_code=502, detail=f"upstream model error: {exc}") from exc

    sess.append_turn(session, role="assistant", content=generated.content)
    return SessionTurnResponse(
        session_id=session.id,
        reply=generated.content,
        model=generated.model or "",
        provider=generated.provider or settings.active_provider,
        turn_index=len(session.turns),
        learner_turns=session.learner_turns,
    )


@app.post("/v1/sessions/{session_id}/stream")
def session_stream(
    session_id: Annotated[str, Path()],
    payload: SessionTurnRequest,
    request: Request,
    _: None = Depends(require_token),
) -> StreamingResponse:
    """SSE streaming. Events: 'delta' (chunks), 'done' (al final con metadata)."""
    ip = _client_ip(request)
    session, system_prompt, history = _prepare_turn(session_id, payload, ip)

    def event_stream():
        accumulated = ""
        used_model = ""
        try:
            for event_type, payload_chunk in stream_reply(
                system_prompt=system_prompt,
                history=history,
                user_text=payload.text,
                max_tokens=1200,
            ):
                if event_type == "delta":
                    accumulated += payload_chunk
                    yield "data: " + json.dumps(
                        {"event": "delta", "text": payload_chunk}, ensure_ascii=False
                    ) + "\n\n"
                elif event_type == "done":
                    used_model = payload_chunk.get("model", "")
                elif event_type == "error":
                    yield "data: " + json.dumps(
                        {"event": "error", "message": payload_chunk.get("message", "")},
                        ensure_ascii=False,
                    ) + "\n\n"
                    yield "data: [DONE]\n\n"
                    return
        except Exception as exc:  # noqa: BLE001
            log.exception("stream_failed session=%s err=%s", session_id, exc)
            yield "data: " + json.dumps(
                {"event": "error", "message": str(exc)}, ensure_ascii=False
            ) + "\n\n"
            yield "data: [DONE]\n\n"
            return

        sess.append_turn(session, role="assistant", content=accumulated)
        yield "data: " + json.dumps(
            {
                "event": "done",
                "model": used_model,
                "provider": settings.active_provider,
                "turnIndex": len(session.turns),
                "learnerTurns": session.learner_turns,
            },
            ensure_ascii=False,
        ) + "\n\n"
        yield "data: [DONE]\n\n"

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
            "Connection": "keep-alive",
        },
    )


@app.get("/v1/sessions/{session_id}", response_model=SessionView)
def get_session(
    session_id: Annotated[str, Path()], request: Request, _: None = Depends(require_token)
) -> SessionView:
    ip = _client_ip(request)
    session = sess.load_session(session_id, ip=ip)
    if session is None:
        raise HTTPException(status_code=404, detail="session not found")
    return SessionView(
        session_id=session.id,
        level=session.level,
        mode=session.mode,
        scenario=session.scenario,
        created_at=session.created_at,
        last_active=session.last_active,
        learner_turns=session.learner_turns,
        turns=[t.to_dict() for t in session.turns],
    )


@app.delete("/v1/sessions/{session_id}")
def delete_session_endpoint(
    session_id: Annotated[str, Path()], request: Request, _: None = Depends(require_token)
) -> dict[str, str]:
    ip = _client_ip(request)
    ok = sess.delete_session(session_id, ip=ip)
    if not ok:
        raise HTTPException(status_code=404, detail="session not found")
    return {"deleted": session_id}
