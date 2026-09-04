#!/usr/bin/env python3
"""Genera TODO el contenido de todos los idiomas para todos los consumidores.

Fuente canónica, editable a mano, un directorio por idioma:

    content/<lang>/lang.json            metadatos (nombre, locale TTS, titular)
    content/<lang>/vocab/<nivel>.tsv    tarjetas de vocabulario
    content/<lang>/grammar.json         temas de gramática con ejercicios
    content/<lang>/lecturas/<id>.json   lecturas graduadas
    content/<lang>/listening/<id>.json  diálogos de comprensión oral

Consumidores generados (nunca editar a mano):

    webapp/content/languages.json               lista de idiomas disponibles
    webapp/content/<lang>/index.json            qué hay por nivel (lecturas, listening…)
    webapp/content/<lang>/{vocab,grammar,lecturas,listening}
    mobile/assets/content/<lang>/...            lo mismo, va en el bundle de Expo
    mobile/lib/contentRegistry.ts               imports estáticos (Metro no admite
                                                rutas dinámicas), generado
    plan-personal/anki/vocab-<lang>-<nivel>.tsv import de Anki (el inglés conserva
                                                el nombre antiguo vocab-<nivel>.tsv)

Por qué un index.json: antes cada lectura nueva había que declararla en
reading.js, content.ts y sw.js, y se olvidó al menos una vez, con lo que el
fichero existía pero era invisible en la app. Ahora la lista se deriva de los
ficheros que existen y las apps la leen.

Ids y progreso SRS. El estado del aprendiz vive en localStorage bajo
`srs:<deck>:<id>`. El inglés conserva sus ids históricos (`a1-001`) y sus
decks (`vocab-a1`) para no corromper el progreso de nadie. Los demás idiomas
llevan el código de idioma delante (`pt-a1-001`, deck `vocab-pt-a1`), con lo
que no pueden colisionar entre sí ni con el inglés. Un id duplicado o
reasignado es por tanto un error fatal, no un aviso.

Uso: python3 tools/build_content.py [--check]
     --check valida y compara sin escribir (para CI).
"""

from __future__ import annotations

import argparse
import csv
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
CONTENT = ROOT / "content"
LEVELS = ("a1", "a2", "b1", "b2")
VOCAB_FIELDS = ("id", "front", "definition", "example", "translation", "tags")
GRAMMAR_REQUIRED = ("id", "title", "level", "why", "rule", "examples", "exercises")
READING_REQUIRED = ("title", "summary", "text", "glosses", "collocations", "questions")
LISTENING_REQUIRED = ("title", "summary", "script", "vocabulary", "questions")
LANG_REQUIRED = ("code", "name", "native", "tts", "headline")

WEB = ROOT / "webapp" / "content"
MOBILE = ROOT / "mobile" / "assets" / "content"
REGISTRY = ROOT / "mobile" / "lib" / "contentRegistry.ts"
ANKI = ROOT / "plan-personal" / "anki"


def dump(obj) -> str:
    return json.dumps(obj, indent=2, ensure_ascii=False) + "\n"


def headword(front: str) -> str:
    return re.sub(r"\s*\(.*?\)", "", front).strip().lower()


def id_prefix(lang: str) -> str:
    # El inglés no lleva prefijo por compatibilidad con el progreso existente.
    return "" if lang == "en" else f"{lang}-"


# ---------------------------------------------------------------- vocabulario
def load_vocab(lang: str, level: str, errors: list[str]) -> list[dict]:
    path = CONTENT / lang / "vocab" / f"{level}.tsv"
    if not path.exists():
        return []
    with path.open(newline="", encoding="utf-8") as fh:
        rows = list(csv.reader(fh, delimiter="\t"))
    rel = path.relative_to(ROOT)
    if not rows or tuple(rows[0]) != VOCAB_FIELDS:
        errors.append(f"{rel}: la cabecera debe ser {list(VOCAB_FIELDS)}")
        return []

    pattern = rf"{id_prefix(lang)}{level}-\d{{3,}}"
    cards: list[dict] = []
    for lineno, row in enumerate(rows[1:], start=2):
        if not any(c.strip() for c in row):
            continue
        if len(row) != len(VOCAB_FIELDS):
            errors.append(f"{rel}:{lineno}: {len(row)} campos, se esperaban {len(VOCAB_FIELDS)}")
            continue
        card = {f: c.strip() for f, c in zip(VOCAB_FIELDS, row)}
        where = f"{rel}:{lineno} ({card['id'] or 'sin id'})"
        for f in VOCAB_FIELDS:
            if not card[f]:
                errors.append(f"{where}: campo '{f}' vacío")
        if not re.fullmatch(pattern, card["id"]):
            errors.append(f"{where}: el id debe tener la forma {id_prefix(lang)}{level}-NNN")
        if level not in card["tags"].split():
            errors.append(f"{where}: falta el tag de nivel '{level}'")
        cards.append(card)
    return cards


def vocab_json(cards: list[dict]) -> str:
    return dump([{**{k: c[k] for k in VOCAB_FIELDS if k != "tags"}, "tags": c["tags"].split()} for c in cards])


def anki_tsv(cards: list[dict]) -> str:
    return "\n".join("\t".join([c["front"], c["definition"], c["example"], c["translation"], c["tags"]]) for c in cards) + "\n"


# ------------------------------------------------------------------ gramática
def validate_grammar(lang: str, topics: list, errors: list[str]) -> None:
    seen: set[str] = set()
    for i, t in enumerate(topics):
        where = f"{lang}/grammar.json tema[{i}] {t.get('id', '(sin id)')}"
        for f in GRAMMAR_REQUIRED:
            if not t.get(f):
                errors.append(f"{where}: falta '{f}'")
        if not t.get("id"):
            continue
        if t["id"] in seen:
            errors.append(f"{where}: id duplicado")
        seen.add(t["id"])
        if t.get("level") not in LEVELS:
            errors.append(f"{where}: nivel '{t.get('level')}' no es uno de {LEVELS}")
        for j, ex in enumerate(t.get("examples") or []):
            if not (isinstance(ex, list) and len(ex) == 2 and all(ex)):
                errors.append(f"{where}: examples[{j}] debe ser [frase, explicación]")
        validate_questions(t.get("exercises") or [], where, errors)


def validate_questions(questions: list, where: str, errors: list[str]) -> None:
    if not questions:
        errors.append(f"{where}: sin preguntas")
    for j, q in enumerate(questions):
        qw = f"{where} q[{j}]"
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
        # Fuera de rango = el aprendiz no puede acertar nunca. Fatal.
        if not isinstance(ans, int) or not (0 <= ans < len(opts)):
            errors.append(f"{qw}: 'answer' = {ans!r} fuera de rango (0..{len(opts) - 1})")


# ----------------------------------------------------- lecturas y listening
def load_items(lang: str, kind: str, required: tuple, errors: list[str]) -> dict[str, dict]:
    folder = CONTENT / lang / kind
    items: dict[str, dict] = {}
    if not folder.exists():
        return items
    prefix = id_prefix(lang)
    for path in sorted(folder.glob("*.json")):
        rel = path.relative_to(ROOT)
        try:
            d = json.loads(path.read_text(encoding="utf-8"))
        except json.JSONDecodeError as e:
            errors.append(f"{rel}: JSON inválido — {e}")
            continue
        # El nivel se deduce del nombre: [<lang>-]<nivel>-... ; así el índice
        # no depende de un campo que se pueda olvidar.
        m = re.fullmatch(rf"{prefix}({'|'.join(LEVELS)})-.+", path.stem)
        if not m:
            errors.append(f"{rel}: el nombre debe ser {prefix}<nivel>-<algo>.json")
            continue
        for f in required:
            if f not in d or d[f] in (None, "", []):
                errors.append(f"{rel}: falta «{f}»")
        validate_questions(d.get("questions") or [], str(rel), errors)
        d["_level"] = m.group(1)
        items[path.stem] = d
    return items


# --------------------------------------------------------------------- idioma
def load_lang(lang: str, errors: list[str]) -> dict:
    path = CONTENT / lang / "lang.json"
    if not path.exists():
        errors.append(f"content/{lang}: falta lang.json")
        return {"code": lang}
    meta = json.loads(path.read_text(encoding="utf-8"))
    for f in LANG_REQUIRED:
        if not meta.get(f):
            errors.append(f"content/{lang}/lang.json: falta «{f}»")
    if meta.get("code") != lang:
        errors.append(f"content/{lang}/lang.json: code='{meta.get('code')}' no coincide con la carpeta")
    return meta


def build_lang(lang: str, errors: list[str], warnings: list[str], outputs: dict[Path, str]) -> dict:
    meta = load_lang(lang, errors)

    decks = {lvl: load_vocab(lang, lvl, errors) for lvl in LEVELS}
    ids: dict[str, str] = {}
    words: dict[str, str] = {}
    for lvl, cards in decks.items():
        for c in cards:
            if c["id"] in ids:
                errors.append(f"{lang}: id duplicado '{c['id']}' en {ids[c['id']]} y {lvl}")
            ids[c["id"]] = lvl
            key = headword(c["front"])
            if key in words:
                warnings.append(f"{lang}: palabra repetida '{key}' en {words[key]} y {lvl} ({c['id']})")
            words[key] = lvl

    gpath = CONTENT / lang / "grammar.json"
    topics = json.loads(gpath.read_text(encoding="utf-8")) if gpath.exists() else []
    validate_grammar(lang, topics, errors)

    readings = load_items(lang, "lecturas", READING_REQUIRED, errors)
    listening = load_items(lang, "listening", LISTENING_REQUIRED, errors)

    index = {
        "lang": lang,
        "vocab": {lvl: len(cards) for lvl, cards in decks.items() if cards},
        "grammar": {lvl: sum(1 for t in topics if t.get("level") == lvl) for lvl in LEVELS},
        "readings": {lvl: [i for i, d in readings.items() if d["_level"] == lvl] for lvl in LEVELS},
        "listening": {lvl: [i for i, d in listening.items() if d["_level"] == lvl] for lvl in LEVELS},
    }

    for target in (WEB / lang, MOBILE / lang):
        outputs[target / "index.json"] = dump(index)
        outputs[target / "grammar.json"] = dump(topics)
        for lvl, cards in decks.items():
            if cards:
                outputs[target / "vocab" / f"{lvl}.json"] = vocab_json(cards)
        for i, d in readings.items():
            outputs[target / "lecturas" / f"{i}.json"] = dump({k: v for k, v in d.items() if k != "_level"})
        for i, d in listening.items():
            outputs[target / "listening" / f"{i}.json"] = dump({k: v for k, v in d.items() if k != "_level"})

    for lvl, cards in decks.items():
        if cards:
            name = f"vocab-{lvl}.tsv" if lang == "en" else f"vocab-{lang}-{lvl}.tsv"
            outputs[ANKI / name] = anki_tsv(cards)

    return {
        "meta": meta,
        "index": index,
        "vocab_levels": [lvl for lvl, c in decks.items() if c],
        "readings": sorted(readings),
        "listening": sorted(listening),
        "stats": (sum(len(c) for c in decks.values()), len(topics), sum(len(t.get("exercises", [])) for t in topics), len(readings), len(listening)),
    }


def registry_ts(built: dict[str, dict]) -> str:
    """mobile/lib/contentRegistry.ts: Metro exige que cada import sea una ruta
    literal, así que la tabla se genera aquí en vez de construir rutas en
    tiempo de ejecución. La gramática se importa de forma síncrona (son
    ficheros pequeños y varias pantallas la leen al renderizar); vocabulario,
    lecturas y listening se cargan bajo demanda."""
    out = [
        "// GENERADO por tools/build_content.py — no editar a mano.",
        "// Metro no resuelve imports con rutas dinámicas, así que la tabla de",
        "// contenido de cada idioma se escribe aquí de forma literal.",
        "/* eslint-disable */",
        "import type { GrammarTopic, ListeningItem, ReadingText, VocabCard } from './types';",
        "",
    ]
    for lang in built:
        out.append(f"import grammar_{lang} from '../assets/content/{lang}/grammar.json';")
    out += [
        "",
        "export type Loader<T> = () => Promise<T>;",
        "export interface LangMeta { code: string; name: string; native: string; tts: string; headline: string; variant?: string }",
        "export interface LangContent {",
        "  meta: LangMeta;",
        "  grammar: GrammarTopic[];",
        "  vocab: Record<string, Loader<VocabCard[]>>;",
        "  readings: Record<string, string[]>;   // nivel → ids",
        "  listening: Record<string, string[]>;  // nivel → ids",
        "  loadReading: Record<string, Loader<ReadingText>>;",
        "  loadListening: Record<string, Loader<ListeningItem>>;",
        "}",
        "",
        "export const CONTENT: Record<string, LangContent> = {",
    ]
    for lang, b in built.items():
        base = f"../assets/content/{lang}"
        idx = b["index"]
        out.append(f"  {lang}: {{")
        out.append(f"    meta: {json.dumps(b['meta'], ensure_ascii=False)},")
        out.append(f"    grammar: grammar_{lang} as unknown as GrammarTopic[],")
        out.append("    vocab: {")
        for lvl in b["vocab_levels"]:
            out.append(f"      {lvl}: async () => (await import('{base}/vocab/{lvl}.json')).default as VocabCard[],")
        out.append("    },")
        out.append(f"    readings: {json.dumps(idx['readings'])},")
        out.append(f"    listening: {json.dumps(idx['listening'])},")
        out.append("    loadReading: {")
        for i in b["readings"]:
            out.append(f"      '{i}': async () => (await import('{base}/lecturas/{i}.json')).default as ReadingText,")
        out.append("    },")
        out.append("    loadListening: {")
        for i in b["listening"]:
            out.append(f"      '{i}': async () => (await import('{base}/listening/{i}.json')).default as ListeningItem,")
        out.append("    },")
        out.append("  },")
    out.append("};")
    out.append("")
    out.append("export const LANGUAGE_CODES = " + json.dumps(list(built)) + " as const;")
    return "\n".join(out) + "\n"


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--check", action="store_true")
    args = ap.parse_args()

    langs = sorted(p.name for p in CONTENT.iterdir() if p.is_dir() and (p / "lang.json").exists())
    if "en" in langs:  # el inglés primero: es el idioma por defecto de las apps
        langs.remove("en"); langs.insert(0, "en")
    if not langs:
        print("✗ no hay ningún content/<lang>/lang.json", file=sys.stderr)
        return 1

    errors: list[str] = []
    warnings: list[str] = []
    outputs: dict[Path, str] = {}
    built = {lang: build_lang(lang, errors, warnings, outputs) for lang in langs}

    if errors:
        print(f"✗ {len(errors)} error(es) en la fuente canónica:", file=sys.stderr)
        for e in errors:
            print(f"  - {e}", file=sys.stderr)
        return 1
    for w in warnings:
        print(f"⚠ {w}", file=sys.stderr)

    outputs[WEB / "languages.json"] = dump([b["meta"] for b in built.values()])
    outputs[REGISTRY] = registry_ts(built)

    if args.check:
        stale = [p for p, body in outputs.items() if not p.exists() or p.read_text(encoding="utf-8") != body]
        # También sobra lo generado que ya no tiene fuente (un fichero borrado).
        generated_dirs = [WEB, MOBILE]
        extra = [p for d in generated_dirs if d.exists() for p in d.rglob("*.json") if p not in outputs]
        if stale or extra:
            print("✗ generados desincronizados; corre tools/build_content.py:", file=sys.stderr)
            for p in stale:
                print(f"  - desactualizado: {p.relative_to(ROOT)}", file=sys.stderr)
            for p in extra:
                print(f"  - huérfano: {p.relative_to(ROOT)}", file=sys.stderr)
            return 1
        print(f"✓ {len(outputs)} ficheros generados al día ({', '.join(langs)})")
        return 0

    # Limpia lo huérfano antes de escribir, para que un fichero borrado en la
    # fuente desaparezca también de las apps.
    for d in (WEB, MOBILE):
        if d.exists():
            for p in d.rglob("*.json"):
                if p not in outputs:
                    p.unlink()
    for path, body in outputs.items():
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(body, encoding="utf-8")

    for lang, b in built.items():
        v, g, ex, r, l = b["stats"]
        print(f"{lang}: {v:>5} cards · {g:>2} temas/{ex:>3} ejercicios · {r:>2} lecturas · {l:>2} listening")
    print(f"→ {len(outputs)} ficheros")
    return 0


if __name__ == "__main__":
    sys.exit(main())
