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
SCENARIOS_DIR = ROOT / "scenarios"      # scenarios/<lang>.json
CALIBRATION_DIR = ROOT / "calibration"  # calibration/<lang>.md

# Idiomas que el tutor sabe enseñar. El nombre en inglés se inyecta en el
# prompt, que está escrito en inglés para el modelo; el aprendiz siempre es
# hispanohablante.
LANGUAGES: dict[str, str] = {
    "en": "English",
    "pt": "Brazilian Portuguese",
    "fr": "French",
    "it": "Italian",
    "zh": "Mandarin Chinese",
}

# Cache estos archivos en memoria al boot — no cambian en runtime.
_system_prompt_template: str | None = None
_scenarios: dict[str, dict[str, Any]] = {}
_calibration: dict[str, str] = {}


def _load_template() -> str:
    global _system_prompt_template
    if _system_prompt_template is None:
        _system_prompt_template = SYSTEM_PROMPT_FILE.read_text(encoding="utf-8")
    return _system_prompt_template


def list_scenarios(lang: str = "en") -> dict[str, Any]:
    """Escenarios de roleplay del idioma. Si un idioma aún no tiene fichero
    propio, no se inventa nada: devuelve vacío y el cliente oculta el modo."""
    if lang not in _scenarios:
        path = SCENARIOS_DIR / f"{lang}.json"
        _scenarios[lang] = json.loads(path.read_text(encoding="utf-8")) if path.exists() else {}
    return _scenarios[lang]


def _calibration_for(lang: str) -> str:
    if lang not in _calibration:
        _calibration[lang] = (CALIBRATION_DIR / f"{lang}.md").read_text(encoding="utf-8").strip()
    return _calibration[lang]


VALID_LEVELS = {"a1", "a2", "b1", "b2", "c1"}
VALID_MODES = {"conversation", "roleplay", "grammar"}


def build_system_prompt(
    *,
    level: str,
    mode: str,
    scenario: str | None = None,
    learner_turns: int = 0,
    grammar_topic: str | None = None,
    lang: str = "en",
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
    if lang not in LANGUAGES:
        raise ValueError(f"lang inválido: {lang}. Use uno de {sorted(LANGUAGES)}")

    template = (
        _load_template()
        .replace("{LEVEL}", level.lower())
        .replace("{LANGUAGE}", LANGUAGES[lang])
        .replace("{CALIBRATION}", _calibration_for(lang))
    )

    mode_block_parts = [f"\n\n## Current mode: {mode}\n"]

    if mode == "roleplay":
        if not scenario:
            raise ValueError("scenario es requerido cuando mode=roleplay")
        scs = list_scenarios(lang)
        if scenario not in scs:
            raise ValueError(f"scenario inválido: {scenario}. Disponibles: {list(scs.keys())}")
        s = scs[scenario]
        # Formato canónico del scenarios.json (compartido con tutor-ia/escenarios.json):
        # title, min_level, setup (texto libre con el rol del tutor), objectives (lista).
        objectives = s.get("objectives", [])
        objectives_block = (
            "\nLearner objectives:\n" + "\n".join(f"- {o}" for o in objectives)
            if objectives
            else ""
        )
        mode_block_parts.append(
            f"Roleplay scenario: **{s.get('title', scenario)}** "
            f"(recommended level: {s.get('min_level', 'a1').upper()}+)\n\n"
            f"{s.get('setup', '')}\n"
            f"{objectives_block}\n\n"
            f"Stay in character. Follow the scene through to a natural conclusion. "
            f"Do not break the fourth wall unless the learner explicitly asks for help."
        )
    elif mode == "grammar":
        topic = grammar_topic or ("present-perfect-vs-past-simple" if lang == "en" else "a topic of the learner's choice")
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
