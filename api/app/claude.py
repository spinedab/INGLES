"""Multi-provider LLM client. Mismo patrón que Confessio: OpenClaw (Claude via OAuth)
como primary, Anthropic / Gemma como fallbacks opcionales."""
from __future__ import annotations

import json
from dataclasses import dataclass
from typing import Any

import httpx

from .config import settings


@dataclass
class GeneratedReply:
    content: str
    usage: dict[str, Any]
    provider: str = ""
    model: str = ""


# ───── HTTP client (reused) ─────
_http_client: httpx.Client | None = None


def _get_http_client() -> httpx.Client:
    global _http_client
    if _http_client is None:
        _http_client = httpx.Client(
            timeout=httpx.Timeout(connect=10.0, read=180.0, write=10.0, pool=10.0),
            limits=httpx.Limits(max_connections=20, max_keepalive_connections=10),
        )
    return _http_client


# ───── OpenAI-compat (OpenClaw / Gemma) ─────


def _call_openai_compat(
    *,
    base_url: str,
    token: str,
    model: str,
    system_prompt: str,
    history: list[dict[str, str]],
    user_text: str,
    max_tokens: int = 1200,
    provider_label: str = "",
) -> GeneratedReply:
    messages: list[dict[str, str]] = [{"role": "system", "content": system_prompt}]
    for turn in history or []:
        messages.append({"role": turn["role"], "content": turn["content"]})
    messages.append({"role": "user", "content": user_text})

    url = base_url.rstrip("/") + "/v1/chat/completions"
    body = {
        "model": model,
        "max_tokens": max_tokens,
        "stream": False,
        "messages": messages,
    }
    headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}

    client = _get_http_client()
    r = client.post(url, json=body, headers=headers)
    if r.status_code >= 400:
        raise RuntimeError(f"{provider_label} request failed ({r.status_code}): {r.text[:240]}")
    p = r.json()
    choices = p.get("choices") or []
    if not choices:
        raise RuntimeError(f"{provider_label} returned no choices")
    text = (choices[0].get("message") or {}).get("content", "").strip()
    if not text:
        raise RuntimeError(f"{provider_label} returned empty content")
    u = p.get("usage") or {}
    return GeneratedReply(
        content=text,
        usage={
            "input_tokens": int(u.get("prompt_tokens") or 0),
            "output_tokens": int(u.get("completion_tokens") or 0),
        },
        provider=provider_label,
        model=p.get("model") or model,
    )


def _stream_openai_compat(
    *,
    base_url: str,
    token: str,
    model: str,
    system_prompt: str,
    history: list[dict[str, str]],
    user_text: str,
    max_tokens: int = 1200,
):
    messages: list[dict[str, str]] = [{"role": "system", "content": system_prompt}]
    for turn in history or []:
        messages.append({"role": turn["role"], "content": turn["content"]})
    messages.append({"role": "user", "content": user_text})

    url = base_url.rstrip("/") + "/v1/chat/completions"
    body = {
        "model": model,
        "max_tokens": max_tokens,
        "stream": True,
        "messages": messages,
    }
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json",
        "Accept": "text/event-stream",
    }

    client = _get_http_client()
    try:
        with client.stream("POST", url, json=body, headers=headers) as response:
            if response.status_code >= 400:
                txt = response.read().decode("utf-8", errors="replace")[:240]
                yield ("error", {"message": f"upstream {response.status_code}: {txt}"})
                return

            accumulated = ""
            for line in response.iter_lines():
                if not line or not line.startswith("data:"):
                    continue
                data_part = line[5:].strip()
                if data_part == "[DONE]":
                    break
                try:
                    chunk = json.loads(data_part)
                except json.JSONDecodeError:
                    continue
                delta = (chunk.get("choices") or [{}])[0].get("delta", {}).get("content")
                if delta:
                    accumulated += delta
                    yield ("delta", delta)
            yield ("done", {"content_full": accumulated, "model": model})
    except Exception as exc:  # noqa: BLE001
        yield ("error", {"message": str(exc)})


# ───── Anthropic SDK (opcional) ─────

_anthropic_client = None


def _get_anthropic():
    global _anthropic_client
    if _anthropic_client is None:
        try:
            from anthropic import Anthropic
        except ImportError as exc:
            raise RuntimeError("anthropic SDK no instalado. `pip install anthropic`.") from exc
        if not settings.anthropic_api_key:
            raise RuntimeError("ANTHROPIC_API_KEY no configurado.")
        _anthropic_client = Anthropic(api_key=settings.anthropic_api_key)
    return _anthropic_client


def _call_anthropic(
    *,
    system_prompt: str,
    history: list[dict[str, str]],
    user_text: str,
    max_tokens: int = 1200,
) -> GeneratedReply:
    client = _get_anthropic()
    messages = list(history or []) + [{"role": "user", "content": user_text}]
    r = client.messages.create(
        model=settings.ingles_model,
        max_tokens=max_tokens,
        system=system_prompt,
        messages=messages,
    )
    text = "\n\n".join(b.text.strip() for b in r.content if b.type == "text" and b.text.strip())
    return GeneratedReply(
        content=text,
        usage={
            "input_tokens": getattr(r.usage, "input_tokens", 0),
            "output_tokens": getattr(r.usage, "output_tokens", 0),
        },
        provider="anthropic",
        model=settings.ingles_model,
    )


# ───── Public entry ─────


def generate_reply(
    *, system_prompt: str, history: list[dict[str, str]], user_text: str, max_tokens: int = 1200
) -> GeneratedReply:
    p = settings.active_provider
    if p == "openclaw":
        return _call_openai_compat(
            base_url=settings.openclaw_api_url,
            token=settings.openclaw_api_token,
            model=settings.openclaw_model,
            system_prompt=system_prompt,
            history=history,
            user_text=user_text,
            max_tokens=max_tokens,
            provider_label="openclaw",
        )
    if p == "anthropic":
        return _call_anthropic(
            system_prompt=system_prompt, history=history, user_text=user_text, max_tokens=max_tokens
        )
    if p == "gemma":
        return _call_openai_compat(
            base_url=settings.gemma_api_url,
            token=settings.gemma_api_token,
            model=settings.gemma_model,
            system_prompt=system_prompt,
            history=history,
            user_text=user_text,
            max_tokens=max_tokens,
            provider_label="gemma",
        )
    raise RuntimeError("No AI provider configured (openclaw, anthropic o gemma).")


def stream_reply(
    *, system_prompt: str, history: list[dict[str, str]], user_text: str, max_tokens: int = 1200
):
    p = settings.active_provider
    if p == "openclaw":
        yield from _stream_openai_compat(
            base_url=settings.openclaw_api_url,
            token=settings.openclaw_api_token,
            model=settings.openclaw_model,
            system_prompt=system_prompt,
            history=history,
            user_text=user_text,
            max_tokens=max_tokens,
        )
    elif p == "gemma":
        yield from _stream_openai_compat(
            base_url=settings.gemma_api_url,
            token=settings.gemma_api_token,
            model=settings.gemma_model,
            system_prompt=system_prompt,
            history=history,
            user_text=user_text,
            max_tokens=max_tokens,
        )
    elif p == "anthropic":
        # Anthropic streaming requiere SDK con messages.stream; por simplicidad
        # caemos a no-stream y emitimos delta+done de una vez.
        full = _call_anthropic(
            system_prompt=system_prompt, history=history, user_text=user_text, max_tokens=max_tokens
        )
        yield ("delta", full.content)
        yield ("done", {"content_full": full.content, "model": full.model})
    else:
        yield ("error", {"message": "No AI provider configured"})
