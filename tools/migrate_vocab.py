#!/usr/bin/env python3
"""Migración de un solo uso: funde los dos bancos de vocabulario divergentes
(los decks JSON de las apps y los TSV de Anki) en la fuente canónica
`content/vocab/<nivel>.tsv`.

Antes de esta migración había dos bancos sin relación:
  - `webapp/content/vocab/*.json` + `mobile/assets/content/vocab/*.json`
    (153 palabras únicas, con `id` estable que el SRS usa como clave)
  - `plan-personal/anki/*.tsv` (433 palabras únicas, sin ids)
con solo 82 palabras en común.

La fusión conserva los `id` ya emitidos: reordenar o ampliar el TSV canónico
nunca debe reasignar un id, porque el progreso SRS vive en
`localStorage['srs:<id>']` y cambiarlos borraría el historial del aprendiz.

Se ejecuta una vez; a partir de ahí la fuente canónica se edita a mano y
`tools/build_vocab.py` regenera los consumidores.
"""

import csv
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
CANON = ROOT / "content" / "vocab"
LEVELS = ("a1", "a2", "b1", "b2")
HEADER = ["id", "front", "definition", "example", "translation", "tags"]


def headword(front: str) -> str:
    """Clave de deduplicación: 'take (v)' y 'take' son la misma palabra."""
    return re.sub(r"\s*\(.*?\)", "", front).strip().lower()


def level_of(tags: list[str]) -> str:
    """Nivel declarado en los tags. C1 cae en el deck b2, que es el más alto
    que existe; el tag c1 se conserva para poder filtrarlo más adelante."""
    for tag in tags:
        if tag in LEVELS:
            return tag
    return "b2" if "c1" in tags else "a1"


def main() -> None:
    # Guardarraíl: este script lee los mismos JSON que `build_vocab.py`
    # escribe, así que ejecutarlo después de un build leería su propia salida
    # y consolidaría cualquier pérdida como si fuera el estado original.
    if CANON.exists() and any(CANON.glob("*.tsv")):
        raise SystemExit(
            f"{CANON.relative_to(ROOT)} ya existe: la migración ya se hizo.\n"
            "Es de un solo uso. Edita la fuente canónica y corre tools/build_vocab.py.\n"
            "Para rehacerla de verdad: borra content/vocab/ y restaura los decks\n"
            "originales con `git checkout <commit> -- webapp/content/vocab`."
        )

    # ── 1. Decks JSON: son los que traen ids que hay que respetar ──────────
    by_level: dict[str, list[dict]] = {lvl: [] for lvl in LEVELS}
    seen: dict[str, str] = {}  # headword → nivel donde ya quedó colocada

    for lvl in LEVELS:
        deck = json.loads((ROOT / "webapp" / "content" / "vocab" / f"{lvl}.json").read_text())
        for card in deck:
            key = headword(card["front"])
            # A diferencia de las palabras nuevas del TSV, una card que ya
            # tiene id emitido NO se descarta aunque esté repetida en otro
            # nivel: su id puede estar ya en el localStorage de alguien.
            # (Los decks originales traían 'discrepancy' en b1 y b2.)
            seen.setdefault(key, lvl)
            by_level[lvl].append(
                {
                    "id": card["id"],
                    "front": card["front"],
                    "definition": card["definition"],
                    "example": card["example"],
                    "translation": card["translation"],
                    "tags": " ".join(card["tags"]),
                }
            )

    # ── 2. TSV de Anki: aportan las 351 palabras que faltaban ─────────────
    next_num = {lvl: max((int(c["id"].split("-")[1]) for c in by_level[lvl]), default=0) for lvl in LEVELS}

    for name in ("top2000-a1a2.tsv", "awl-b1b2.tsv"):
        for row in csv.reader((ROOT / "plan-personal" / "anki" / name).open(), delimiter="\t"):
            if len(row) < 5:
                continue
            front, definition, example, translation, tags = (c.strip() for c in row[:5])
            key = headword(front)
            if key in seen:
                continue  # ya venía del deck JSON, que manda por tener id
            tag_list = tags.split()
            lvl = level_of(tag_list)
            # Las palabras C1 caen en el deck b2 y necesitan también su tag,
            # porque el deck se filtra por nivel además de por id.
            if lvl not in tag_list:
                tag_list.insert(0, lvl)
                tags = " ".join(tag_list)
            seen[key] = lvl
            next_num[lvl] += 1
            by_level[lvl].append(
                {
                    "id": f"{lvl}-{next_num[lvl]:03d}",
                    "front": front,
                    "definition": definition,
                    "example": example,
                    "translation": translation,
                    "tags": tags,
                }
            )

    # ── 3. Escribir la fuente canónica ────────────────────────────────────
    CANON.mkdir(parents=True, exist_ok=True)
    for lvl in LEVELS:
        path = CANON / f"{lvl}.tsv"
        with path.open("w", newline="") as fh:
            writer = csv.writer(fh, delimiter="\t", lineterminator="\n")
            writer.writerow(HEADER)
            for card in by_level[lvl]:
                writer.writerow([card[col] for col in HEADER])
        print(f"{path.relative_to(ROOT)}  {len(by_level[lvl])} cards")

    total = sum(len(v) for v in by_level.values())
    print(f"total: {total} cards únicas")


if __name__ == "__main__":
    main()
