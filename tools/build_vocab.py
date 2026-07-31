#!/usr/bin/env python3
"""Genera los decks de vocabulario de todos los consumidores a partir de la
fuente canónica `content/vocab/<nivel>.tsv`.

Antes había dos bancos que se editaban por separado y habían divergido (solo
82 palabras en común de 504). Ahora se edita un único TSV por nivel y este
script propaga:

  content/vocab/<nivel>.tsv          (fuente, editable a mano)
        │
        ├─→ webapp/content/vocab/<nivel>.json          (SPA vanilla)
        ├─→ mobile/assets/content/vocab/<nivel>.json   (Expo, va en el bundle)
        └─→ plan-personal/anki/vocab-<nivel>.tsv        (import de Anki, sin id)

Valida antes de escribir: ids únicos y con el prefijo del nivel, tag de nivel
presente, campos no vacíos y ninguna palabra repetida entre niveles. Un id
duplicado o reasignado corrompería el progreso SRS del aprendiz, que vive en
`localStorage['srs:<id>']`, así que es un error fatal y no un aviso.

Uso: python3 tools/build_vocab.py [--check]
     --check valida y compara sin escribir (para CI).
"""

import argparse
import csv
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
CANON = ROOT / "content" / "vocab"
LEVELS = ("a1", "a2", "b1", "b2")
FIELDS = ("id", "front", "definition", "example", "translation", "tags")

JSON_TARGETS = (
    ROOT / "webapp" / "content" / "vocab",
    ROOT / "mobile" / "assets" / "content" / "vocab",
)
ANKI_DIR = ROOT / "plan-personal" / "anki"


def headword(front: str) -> str:
    return re.sub(r"\s*\(.*?\)", "", front).strip().lower()


def load(level: str, errors: list[str]) -> list[dict]:
    path = CANON / f"{level}.tsv"
    if not path.exists():
        errors.append(f"falta la fuente canónica {path.relative_to(ROOT)}")
        return []

    with path.open(newline="") as fh:
        rows = list(csv.reader(fh, delimiter="\t"))

    if not rows or tuple(rows[0]) != FIELDS:
        errors.append(f"{path.name}: la primera línea debe ser la cabecera {list(FIELDS)}")
        return []

    cards: list[dict] = []
    for lineno, row in enumerate(rows[1:], start=2):
        if not any(cell.strip() for cell in row):
            continue  # línea en blanco: la toleramos como separador visual
        if len(row) != len(FIELDS):
            errors.append(f"{path.name}:{lineno}: {len(row)} campos, se esperaban {len(FIELDS)}")
            continue

        card = {field: cell.strip() for field, cell in zip(FIELDS, row)}
        where = f"{path.name}:{lineno} ({card['id'] or 'sin id'})"

        for field in FIELDS:
            if not card[field]:
                errors.append(f"{where}: campo '{field}' vacío")
        if not re.fullmatch(rf"{level}-\d{{3,}}", card["id"]):
            errors.append(f"{where}: el id debe tener la forma {level}-NNN")
        if level not in card["tags"].split():
            errors.append(f"{where}: falta el tag de nivel '{level}'")

        cards.append(card)

    return cards


def validate_global(decks: dict[str, list[dict]], errors: list[str], warnings: list[str]) -> None:
    """Unicidad en el conjunto de los cuatro decks.

    Un id duplicado es fatal: dos cards compartirían la misma entrada
    `localStorage['srs:<id>']` y el progreso de una sobreescribiría el de la
    otra. Una palabra repetida en dos niveles solo hace que el aprendiz la
    repase dos veces, así que es un aviso — y además ya existía en los decks
    originales ('discrepancy' en b1 y b2), que no podemos deduplicar sin
    retirar un id que quizá ya está en uso.
    """
    ids: dict[str, str] = {}
    words: dict[str, str] = {}
    for level, cards in decks.items():
        for card in cards:
            if card["id"] in ids:
                errors.append(f"id duplicado '{card['id']}': {ids[card['id']]} y {level}.tsv")
            ids[card["id"]] = f"{level}.tsv"

            key = headword(card["front"])
            if key in words:
                warnings.append(f"palabra repetida '{key}': {words[key]} y {level}.tsv ({card['id']})")
            words[key] = f"{level}.tsv"


def to_json(cards: list[dict]) -> str:
    deck = [
        {
            "id": c["id"],
            "front": c["front"],
            "definition": c["definition"],
            "example": c["example"],
            "translation": c["translation"],
            "tags": c["tags"].split(),
        }
        for c in cards
    ]
    return json.dumps(deck, indent=2, ensure_ascii=False) + "\n"


def to_anki_tsv(cards: list[dict]) -> str:
    """Formato de import de Anki: 5 columnas, sin cabecera y sin id (Anki no
    lo usa y una columna extra desplazaría los campos al importar)."""
    lines = [
        "\t".join([c["front"], c["definition"], c["example"], c["translation"], c["tags"]])
        for c in cards
    ]
    return "\n".join(lines) + "\n"


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--check", action="store_true", help="valida sin escribir")
    args = parser.parse_args()

    errors: list[str] = []
    warnings: list[str] = []
    decks = {level: load(level, errors) for level in LEVELS}
    validate_global(decks, errors, warnings)

    if errors:
        print(f"✗ {len(errors)} error(es) en la fuente canónica:", file=sys.stderr)
        for err in errors:
            print(f"  - {err}", file=sys.stderr)
        return 1

    for warn in warnings:
        print(f"⚠ {warn}", file=sys.stderr)

    outputs: dict[Path, str] = {}
    for level, cards in decks.items():
        for target in JSON_TARGETS:
            outputs[target / f"{level}.json"] = to_json(cards)
        outputs[ANKI_DIR / f"vocab-{level}.tsv"] = to_anki_tsv(cards)

    if args.check:
        stale = [p for p, body in outputs.items() if not p.exists() or p.read_text() != body]
        if stale:
            print("✗ generados desincronizados de la fuente; corre tools/build_vocab.py:", file=sys.stderr)
            for path in stale:
                print(f"  - {path.relative_to(ROOT)}", file=sys.stderr)
            return 1
        print(f"✓ {len(outputs)} ficheros generados están al día")
        return 0

    for path, body in outputs.items():
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(body)

    for level in LEVELS:
        print(f"{level}: {len(decks[level]):>4} cards")
    print(f"total: {sum(len(c) for c in decks.values())} cards → {len(outputs)} ficheros")
    return 0


if __name__ == "__main__":
    sys.exit(main())
