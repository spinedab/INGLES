#!/usr/bin/env python3
"""Tutor IA conversacional de inglés.

Usa la API de Anthropic (Claude) aplicando los principios pedagógicos del tratado:
input comprensible (Krashen), output forzado (Swain), recasts (Long),
noticing (Schmidt), scaffolding en ZPD (Vygotsky/Lantolf).
"""

import argparse
import json
import os
import re
import sys
from datetime import datetime
from pathlib import Path

try:
    from anthropic import Anthropic
    from rich.console import Console
    from rich.markdown import Markdown
    from rich.panel import Panel
    from rich.prompt import Prompt
except ImportError as e:
    print(f"Falta dependencia: {e}. Ejecuta: pip install -r requirements.txt")
    sys.exit(1)

ROOT = Path(__file__).resolve().parent
SYSTEM_PROMPT_FILE = ROOT / "system_prompt.md"
SCENARIOS_FILE = ROOT / "escenarios.json"
SESSIONS_FILE = ROOT / "data" / "sesiones.jsonl"

DEFAULT_MODEL = "claude-opus-4-7"
SONNET_MODEL = "claude-sonnet-4-6"

console = Console()


def load_system_prompt(level: str, mode: str, extra: str = "") -> str:
    template = SYSTEM_PROMPT_FILE.read_text(encoding="utf-8")
    prompt = template.replace("{LEVEL}", level)
    mode_block = f"\n\n## Current mode: {mode}\n"
    if extra:
        mode_block += extra + "\n"
    return prompt + mode_block


def load_scenarios() -> dict:
    return json.loads(SCENARIOS_FILE.read_text(encoding="utf-8"))


def ensure_data_dir():
    SESSIONS_FILE.parent.mkdir(parents=True, exist_ok=True)


def save_session(mode: str, level: str, turns: int, items: list[str], rating: dict):
    ensure_data_dir()
    record = {
        "ts": datetime.now().isoformat(timespec="seconds"),
        "mode": mode,
        "level": level,
        "turns": turns,
        "items_to_notice": items,
        "self_rating": rating,
    }
    with SESSIONS_FILE.open("a", encoding="utf-8") as f:
        f.write(json.dumps(record, ensure_ascii=False) + "\n")
    return record


def load_recent_items(limit: int = 20) -> list[str]:
    if not SESSIONS_FILE.exists():
        return []
    items = []
    with SESSIONS_FILE.open("r", encoding="utf-8") as f:
        for line in f:
            try:
                rec = json.loads(line)
                items.extend(rec.get("items_to_notice", []))
            except json.JSONDecodeError:
                continue
    return items[-limit:]


NOTICING_RE = re.compile(r"───[^─]*───(.*?)───+", re.DOTALL)


def extract_noticing_items(text: str) -> list[str]:
    """Extrae los items del bloque 'Notice these' del último turno del tutor."""
    m = NOTICING_RE.search(text)
    if not m:
        return []
    body = m.group(1)
    items = []
    for line in body.splitlines():
        line = line.strip()
        if line.startswith("•") or line.startswith("*") or line.startswith("-"):
            items.append(line.lstrip("•*- ").strip())
    return items


def chat_loop(model: str, level: str, mode: str, mode_extra: str = "",
              opening_user_message: str | None = None) -> tuple[int, list[str]]:
    """Run the chat loop. Returns (turns, accumulated_noticing_items)."""
    client = Anthropic(api_key=os.environ.get("ANTHROPIC_API_KEY"))
    system = load_system_prompt(level, mode, mode_extra)
    messages: list[dict] = []
    items_total: list[str] = []
    turns = 0

    # Optional canned opening from the system (sets the scene).
    if opening_user_message is None:
        opening_user_message = (
            f"Hi! I'm here to practice my English. My level is {level.upper()}. "
            f"Please start the {mode}."
        )

    messages.append({"role": "user", "content": opening_user_message})

    while True:
        # Build the API call with prompt caching on the system block.
        try:
            response = client.messages.create(
                model=model,
                max_tokens=800,
                system=[{
                    "type": "text",
                    "text": system,
                    "cache_control": {"type": "ephemeral"},
                }],
                messages=messages,
            )
        except Exception as e:
            console.print(f"[red]API error: {e}[/red]")
            break

        tutor_text = "".join(b.text for b in response.content if hasattr(b, "text"))
        messages.append({"role": "assistant", "content": tutor_text})

        console.print()
        console.print(Panel(Markdown(tutor_text), title="Tutor", border_style="cyan"))

        new_items = extract_noticing_items(tutor_text)
        if new_items:
            items_total.extend(new_items)

        # Get learner input.
        try:
            user_input = Prompt.ask("\n[bold green]You[/bold green]")
        except (KeyboardInterrupt, EOFError):
            console.print("\n[dim]Saliendo…[/dim]")
            break

        if user_input.lower().strip() in {"quit", "exit", "bye", "salir"}:
            messages.append({"role": "user", "content": user_input})
            # One final assistant turn for closure / self-rating.
            try:
                response = client.messages.create(
                    model=model,
                    max_tokens=400,
                    system=[{"type": "text", "text": system, "cache_control": {"type": "ephemeral"}}],
                    messages=messages,
                )
                tutor_text = "".join(b.text for b in response.content if hasattr(b, "text"))
                console.print(Panel(Markdown(tutor_text), title="Tutor", border_style="cyan"))
            except Exception:
                pass
            break

        messages.append({"role": "user", "content": user_input})
        turns += 1

    return turns, items_total


def cmd_conversation(args):
    console.print(Panel.fit(
        f"[bold]Tutor IA — Conversación libre[/bold]\nNivel: {args.level.upper()} · Modelo: {args.model}\nEscribe [bold]quit[/bold] para salir.",
        border_style="cyan"
    ))
    turns, items = chat_loop(args.model, args.level, mode="conversation")
    end_session("conversation", args.level, turns, items)


def cmd_roleplay(args):
    scenarios = load_scenarios()
    if args.scenario not in scenarios:
        console.print(f"[red]Escenario '{args.scenario}' no existe.[/red]")
        console.print("Disponibles: " + ", ".join(scenarios.keys()))
        return
    sc = scenarios[args.scenario]
    if cefr_rank(args.level) < cefr_rank(sc["min_level"]):
        console.print(f"[yellow]Aviso: este escenario está pensado para {sc['min_level'].upper()}+ "
                      f"y tu nivel es {args.level.upper()}. Será desafiante.[/yellow]")
    console.print(Panel.fit(
        f"[bold]Role-play: {sc['title']}[/bold]\nNivel: {args.level.upper()}\n\n"
        f"Objetivos: {', '.join(sc['objectives'])}",
        border_style="magenta"
    ))
    extra = f"\n## Scenario\n{sc['setup']}\n\n## Objectives\n" + "\n".join(f"- {o}" for o in sc["objectives"])
    opening = (
        f"Hi tutor. I want to practice the '{sc['title']}' role-play at level {args.level.upper()}. "
        f"Please start in character right away."
    )
    turns, items = chat_loop(args.model, args.level, mode=f"roleplay:{args.scenario}",
                              mode_extra=extra, opening_user_message=opening)
    end_session(f"roleplay:{args.scenario}", args.level, turns, items)


def cmd_grammar(args):
    console.print(Panel.fit(
        f"[bold]Gramática focalizada[/bold]\nTema: {args.topic}\nNivel: {args.level.upper()}",
        border_style="yellow"
    ))
    extra = (
        f"\n## Topic: {args.topic}\n\n"
        "Explain the rule clearly, give 3 examples (one at the learner's exact level), "
        "then run 5 practice items with immediate corrective feedback. Stay focused on this topic."
    )
    opening = (
        f"Hi tutor. I want to study '{args.topic}' at level {args.level.upper()}. "
        f"Please explain briefly and then quiz me."
    )
    turns, items = chat_loop(args.model, args.level, mode=f"grammar:{args.topic}",
                              mode_extra=extra, opening_user_message=opening)
    end_session(f"grammar:{args.topic}", args.level, turns, items)


def cmd_review(args):
    items = load_recent_items(limit=30)
    if not items:
        console.print("[yellow]No hay items previos. Haz primero una conversación o un role-play.[/yellow]")
        return
    console.print(Panel.fit(
        f"[bold]Repaso de noticing[/bold]\n{len(items)} items recientes recuperados de sesiones previas.\nNivel: {args.level.upper()}",
        border_style="green"
    ))
    extra = (
        "\n## Review mode\n"
        "The following are items the learner has been asked to notice in previous sessions. "
        "Build a short interactive review: for each item, create a quick prompt that makes them use it. "
        "Focus on production, not theory. Cover 5-8 items per session.\n\n"
        "Items:\n" + "\n".join(f"- {it}" for it in items)
    )
    opening = (
        f"Hi tutor. Please review with me the noticing items from previous sessions, "
        f"using interactive prompts at level {args.level.upper()}."
    )
    turns, new_items = chat_loop(args.model, args.level, mode="review",
                                  mode_extra=extra, opening_user_message=opening)
    end_session("review", args.level, turns, new_items)


def cmd_list_scenarios(args):
    scenarios = load_scenarios()
    console.print("[bold]Escenarios disponibles:[/bold]\n")
    for key, sc in scenarios.items():
        console.print(f"  [cyan]{key}[/cyan] · {sc['title']} (min {sc['min_level'].upper()})")


def end_session(mode: str, level: str, turns: int, items: list[str]):
    if turns == 0:
        return
    console.print("\n[dim]Cerrando sesión y guardando…[/dim]")
    try:
        effort = int(Prompt.ask("Esfuerzo hoy (1-5)", default="3", show_default=True))
        confidence = int(Prompt.ask("Confianza con los temas (1-5)", default="3", show_default=True))
    except (ValueError, KeyboardInterrupt):
        effort, confidence = 3, 3
    rec = save_session(mode, level, turns, items, {"effort": effort, "confidence": confidence})
    console.print(f"[green]✓ Sesión guardada en {SESSIONS_FILE.relative_to(ROOT.parent)}[/green]")
    if items:
        console.print(f"[dim]Items para notar capturados: {len(items)}[/dim]")


def cefr_rank(level: str) -> int:
    order = {"a1": 1, "a2": 2, "b1": 3, "b2": 4, "c1": 5, "c2": 6}
    return order.get(level.lower(), 0)


def main():
    parser = argparse.ArgumentParser(description="Tutor IA conversacional de inglés.")
    parser.add_argument("--model", default=DEFAULT_MODEL,
                        help=f"Modelo Claude (default {DEFAULT_MODEL}; alternativa más barata: {SONNET_MODEL})")
    parser.add_argument("--level", default="a2", choices=["a1", "a2", "b1", "b2", "c1"],
                        help="Nivel CEFR objetivo (default a2)")
    sub = parser.add_subparsers(dest="cmd", required=True)

    sub.add_parser("conversation", help="Conversación libre adaptada al nivel").set_defaults(func=cmd_conversation)

    rp = sub.add_parser("roleplay", help="Role-play en un escenario predefinido")
    rp.add_argument("scenario", help="Nombre del escenario (ver 'list')")
    rp.set_defaults(func=cmd_roleplay)

    gr = sub.add_parser("grammar", help="Explicación y práctica de un punto gramatical")
    gr.add_argument("topic", help="Tópico, e.g. 'present-perfect', 'conditionals', 'phrasal-verbs'")
    gr.set_defaults(func=cmd_grammar)

    sub.add_parser("review", help="Repasar items notados en sesiones previas").set_defaults(func=cmd_review)
    sub.add_parser("list", help="Listar escenarios de role-play").set_defaults(func=cmd_list_scenarios)

    args = parser.parse_args()

    if not os.environ.get("ANTHROPIC_API_KEY") and args.cmd != "list":
        console.print("[red]Falta ANTHROPIC_API_KEY. Configúrala con: export ANTHROPIC_API_KEY=sk-ant-...[/red]")
        sys.exit(1)

    args.func(args)


if __name__ == "__main__":
    main()
