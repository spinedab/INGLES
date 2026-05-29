"""Tutor pedagógico — construye el prompt del sistema según level/mode/scenario.

Reusa la lógica del CLI original (system_prompt.md + escenarios.json) pero
expuesta como funciones que el endpoint HTTP puede usar.
"""
from __future__ import annotations

import json
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parent
SYSTEM_PROMPT_FILE = ROOT / "system_prompt.md"
SCENARIOS_FILE = ROOT / "scenarios.json"

# Cache estos archivos en memoria al boot — no cambian en runtime.
_system_prompt_template: str | None = None
_scenarios: dict[str, Any] | None = None


def _load_template() -> str:
    global _system_prompt_template
    if _system_prompt_template is None:
        _system_prompt_template = SYSTEM_PROMPT_FILE.read_text(encoding="utf-8")
    return _system_prompt_template


def list_scenarios() -> dict[str, Any]:
    global _scenarios
    if _scenarios is None:
        _scenarios = json.loads(SCENARIOS_FILE.read_text(encoding="utf-8"))
    return _scenarios


VALID_LEVELS = {"a1", "a2", "b1", "b2", "c1"}
VALID_MODES = {"conversation", "roleplay", "grammar"}


def build_system_prompt(
    *,
    level: str,
    mode: str,
    scenario: str | None = None,
    learner_turns: int = 0,
    grammar_topic: str | None = None,
) -> str:
    """Construye el system prompt completo para un turno.

    - level ∈ {a1, a2, b1, b2, c1}
    - mode ∈ {conversation, roleplay, grammar}
    - scenario: requerido si mode=roleplay; key del scenarios.json
    - learner_turns: cuántos turnos del aprendiz ya ocurrieron (para noticing block)
    - grammar_topic: tema gramatical si mode=grammar
    """
    if level.lower() not in VALID_LEVELS:
        raise ValueError(f"level inválido: {level}. Use uno de {VALID_LEVELS}")
    if mode not in VALID_MODES:
        raise ValueError(f"mode inválido: {mode}. Use uno de {VALID_MODES}")

    template = _load_template().replace("{LEVEL}", level.lower())

    mode_block_parts = [f"\n\n## Current mode: {mode}\n"]

    if mode == "roleplay":
        if not scenario:
            raise ValueError("scenario es requerido cuando mode=roleplay")
        scs = list_scenarios()
        if scenario not in scs:
            raise ValueError(f"scenario inválido: {scenario}. Disponibles: {list(scs.keys())}")
        s = scs[scenario]
        mode_block_parts.append(
            f"Roleplay scenario: **{s.get('title', scenario)}**\n"
            f"Setting: {s.get('setting', '')}\n"
            f"Your character: {s.get('your_character', '')}\n"
            f"Learner role: {s.get('learner_role', '')}\n"
            f"Goal of the scene: {s.get('goal', '')}\n\n"
            f"Stay in character. Follow the scene through to a natural conclusion. "
            f"Do not break the fourth wall unless the learner explicitly asks for help."
        )
    elif mode == "grammar":
        topic = grammar_topic or "present-perfect-vs-past-simple"
        mode_block_parts.append(
            f"Grammar focus topic: **{topic}**\n"
            "Present the rule in plain English (B1-equivalent metalanguage), "
            "give 3 examples, then practice 5 items with immediate feedback."
        )
    else:  # conversation
        mode_block_parts.append(
            "Free conversation. Pick a warm starting topic if the learner doesn't propose one."
        )

    # Noticing block reminder cuando el aprendiz va a llegar a múltiplo de 6.
    if learner_turns > 0 and (learner_turns + 1) % 6 == 0:
        mode_block_parts.append(
            "\n\n**IMPORTANT**: After your response, the learner will complete their "
            f"{learner_turns + 1}th turn. Your NEXT response must include a "
            "'Notice these 3 items' block before resuming conversation. Format exactly:\n"
            "```\n"
            "─── Notice these 3 items ───\n"
            "• [item 1]\n"
            "• [item 2]\n"
            "• [item 3]\n"
            "────────────────────────────\n"
            "```\n"
            "Items must be specific to THIS session (not generic), short, copy-pasteable."
        )
    elif learner_turns > 0 and learner_turns % 6 == 0:
        mode_block_parts.append(
            "\n\n**THIS TURN**: produce the 'Notice these 3 items' block at the START "
            "of your message, then continue normal conversation. Drawn from the last 6 "
            "learner turns; specific, actionable, copy-pasteable."
        )

    return template + "".join(mode_block_parts)
