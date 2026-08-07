#!/usr/bin/env python3
"""Valida `content/grammar.json` y lo propaga a las dos apps.

Antes los temas de gramática estaban escritos **dos veces**, literalmente, en
`webapp/js/grammar.js` y en `mobile/lib/content.ts`. Igual que pasó con el
vocabulario, eso solo puede divergir. Ahora hay una fuente y dos consumidores
generados:

    content/grammar.json
          ├─→ webapp/content/grammar.json          (la SPA lo hace fetch)
          └─→ mobile/assets/content/grammar.json   (Expo lo importa al bundle)

Uso: python3 tools/build_grammar.py [--check]
     --check valida y comprueba sincronía sin escribir (para CI).
"""

import argparse
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
CANON = ROOT / "content" / "grammar.json"
TARGETS = (
    ROOT / "webapp" / "content" / "grammar.json",
    ROOT / "mobile" / "assets" / "content" / "grammar.json",
)
LEVELS = ("a1", "a2", "b1", "b2")
REQUIRED = ("id", "title", "level", "why", "rule", "examples", "exercises")


def validate(topics: list) -> list[str]:
    errors: list[str] = []
    seen_ids: set[str] = set()

    for i, t in enumerate(topics):
        where = f"tema[{i}] {t.get('id', '(sin id)')}"

        for field in REQUIRED:
            if not t.get(field):
                errors.append(f"{where}: falta '{field}'")
        if errors and not t.get("id"):
            continue

        if t["id"] in seen_ids:
            errors.append(f"{where}: id duplicado")
        seen_ids.add(t["id"])

        if t.get("level") not in LEVELS:
            errors.append(f"{where}: nivel '{t.get('level')}' no es uno de {LEVELS}")

        for j, ex in enumerate(t.get("examples") or []):
            if not (isinstance(ex, list) and len(ex) == 2 and all(ex)):
                errors.append(f"{where}: examples[{j}] debe ser [frase, explicación]")

        for j, q in enumerate(t.get("exercises") or []):
            qw = f"{where}: exercises[{j}]"
            if not q.get("q"):
                errors.append(f"{qw}: falta 'q'")
            opts = q.get("options")
            if not (isinstance(opts, list) and len(opts) >= 2):
                errors.append(f"{qw}: necesita al menos 2 opciones")
                continue
            if any(not str(o).strip() for o in opts):
                errors.append(f"{qw}: alguna opción está vacía")
            if len(set(map(str, opts))) != len(opts):
                errors.append(f"{qw}: opciones repetidas")
            ans = q.get("answer")
            # Un 'answer' fuera de rango deja el ejercicio sin respuesta correcta
            # posible: el aprendiz no puede acertar nunca. Es fatal.
            if not isinstance(ans, int) or not (0 <= ans < len(opts)):
                errors.append(f"{qw}: 'answer' = {ans!r} fuera de rango (0..{len(opts) - 1})")

    return errors


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--check", action="store_true")
    args = parser.parse_args()

    if not CANON.exists():
        print(f"✗ falta {CANON.relative_to(ROOT)}", file=sys.stderr)
        return 1

    topics = json.loads(CANON.read_text())
    errors = validate(topics)
    if errors:
        print(f"✗ {len(errors)} error(es) en content/grammar.json:", file=sys.stderr)
        for e in errors:
            print(f"  - {e}", file=sys.stderr)
        return 1

    body = json.dumps(topics, indent=2, ensure_ascii=False) + "\n"

    if args.check:
        stale = [p for p in TARGETS if not p.exists() or p.read_text() != body]
        if stale:
            print("✗ generados desincronizados; corre tools/build_grammar.py:", file=sys.stderr)
            for p in stale:
                print(f"  - {p.relative_to(ROOT)}", file=sys.stderr)
            return 1
        print(f"✓ {len(topics)} temas válidos y los {len(TARGETS)} generados están al día")
        return 0

    for p in TARGETS:
        p.parent.mkdir(parents=True, exist_ok=True)
        p.write_text(body)

    per = {}
    for t in topics:
        per[t["level"]] = per.get(t["level"], 0) + 1
    total_ex = sum(len(t["exercises"]) for t in topics)
    print(f"{len(topics)} temas, {total_ex} ejercicios → {len(TARGETS)} ficheros")
    print("  " + " · ".join(f"{lvl}: {per.get(lvl, 0)}" for lvl in LEVELS))
    return 0


if __name__ == "__main__":
    sys.exit(main())
