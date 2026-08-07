#!/usr/bin/env python3
"""Añade lotes de vocabulario a `content/vocab/<nivel>.tsv`.

Idempotente: salta las palabras cuya forma base ya existe en cualquier nivel, y
continúa la numeración de ids desde el último emitido, **sin reasignar ninguno**
— el progreso SRS del aprendiz vive en `localStorage['srs:<id>']`.

Uso: python3 tools/vocab_lote.py
Después: python3 tools/build_vocab.py
"""

import csv
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
CANON = ROOT / "content" / "vocab"
FIELDS = ("id", "front", "definition", "example", "translation", "tags")
LEVELS = ("a1", "a2", "b1", "b2")

# (front, definition, example, translation, tags-extra)
# El tag de nivel se añade solo. «awl» = Academic Word List (Coxhead, 2000).
B2 = [
    ("abstract (adj)", "based on ideas, not physical things", "The paper is too abstract to be useful.", "abstracto", "adjective awl"),
    ("accommodate (v)", "to provide space for; to adapt to", "The hall accommodates 300 people.", "alojar/adaptarse", "verb awl"),
    ("accumulate (v)", "to increase in quantity over time", "Dust accumulates quickly here.", "acumular", "verb awl"),
    ("acknowledge (v)", "to accept that something is true", "She acknowledged the mistake.", "reconocer", "verb awl"),
    ("adequate (adj)", "enough for a purpose, but not more", "The funding is adequate but not generous.", "suficiente/adecuado", "adjective awl"),
    ("advocate (v/n)", "to publicly support; a supporter", "He advocates smaller classes.", "abogar por/defensor", "verb awl"),
    ("allocate (v)", "to give out for a specific purpose", "We allocated two hours to the task.", "asignar", "verb awl"),
    ("alter (v)", "to change slightly", "The plan was altered at the last minute.", "modificar", "verb awl"),
    ("anticipate (v)", "to expect and prepare for", "We didn't anticipate such demand.", "prever/anticipar", "verb awl"),
    ("arbitrary (adj)", "decided by chance or whim, not reason", "The deadline felt arbitrary.", "arbitrario", "adjective awl"),
    ("articulate (v)", "to express an idea clearly", "She articulated her concerns well.", "expresar con claridad", "verb awl"),
    ("aspect (n)", "one part or feature of something", "Cost is only one aspect of the problem.", "aspecto", "noun awl"),
    ("assert (v)", "to state firmly", "He asserted that the data were sound.", "afirmar/sostener", "verb awl"),
    ("attain (v)", "to reach or achieve", "Few attain that level of fluency.", "alcanzar/lograr", "verb awl"),
    ("attribute (v/n)", "to say something is caused by; a quality", "She attributes her success to practice.", "atribuir/atributo", "verb awl"),
    ("autonomy (n)", "the freedom to decide for yourself", "Learners need some autonomy.", "autonomía", "noun awl"),
    ("bias (n)", "an unfair preference or tendency", "The sample had an obvious bias.", "sesgo", "noun awl"),
    ("capacity (n)", "the ability or amount that fits", "Our capacity to learn changes with age.", "capacidad", "noun awl"),
    ("cease (v)", "to stop", "The noise ceased at midnight.", "cesar", "verb awl formal"),
    ("cite (v)", "to mention as an example or source", "She cited three studies.", "citar", "verb awl"),
    ("clarify (v)", "to make clearer", "Could you clarify that point?", "aclarar", "verb awl"),
    ("coincide (v)", "to happen at the same time", "The dates coincide with the holidays.", "coincidir", "verb awl"),
    ("comprehensive (adj)", "including everything relevant", "a comprehensive review of the field", "exhaustivo/integral", "adjective awl"),
    ("comprise (v)", "to consist of", "The course comprises six modules.", "comprender/constar de", "verb awl formal"),
    ("conceive (v)", "to form an idea of", "It's hard to conceive of such a scale.", "concebir", "verb awl"),
    ("conform (v)", "to behave according to rules or norms", "The design conforms to the standard.", "ajustarse/cumplir", "verb awl"),
    ("consecutive (adj)", "following one after another", "three consecutive days of rain", "consecutivo", "adjective awl"),
    ("consolidate (v)", "to make stronger or combine into one", "Sleep consolidates what you learned.", "consolidar", "verb awl"),
    ("constrain (v)", "to limit or restrict", "Time constrains what we can cover.", "limitar/constreñir", "verb awl"),
    ("contradict (v)", "to say the opposite of", "The results contradict the hypothesis.", "contradecir", "verb awl"),
    ("convey (v)", "to communicate an idea or feeling", "The tone conveys impatience.", "transmitir", "verb awl"),
    ("correlate (v)", "to have a mutual relationship", "Exposure correlates with fluency.", "correlacionar", "verb awl"),
    ("credible (adj)", "believable, deserving trust", "a credible explanation", "creíble", "adjective awl"),
    ("criterion (n)", "a standard used to judge (pl. criteria)", "Fluency is one criterion among several.", "criterio", "noun awl irregular-plural"),
    ("crucial (adj)", "extremely important", "Feedback is crucial at this stage.", "crucial", "adjective awl"),
    ("decline (v/n)", "to decrease; to refuse politely", "Enrolment declined last year.", "disminuir/rechazar", "verb awl"),
    ("deduce (v)", "to reach a conclusion by reasoning", "We can deduce the meaning from context.", "deducir", "verb awl"),
    ("deem (v)", "to consider something to be", "The evidence was deemed sufficient.", "considerar/estimar", "verb formal"),
    ("deliberate (adj)", "done on purpose", "a deliberate omission", "deliberado", "adjective awl"),
    ("denote (v)", "to mean or indicate", "The symbol denotes a long vowel.", "denotar", "verb awl"),
    ("deploy (v)", "to put into use or position", "They deployed a new strategy.", "desplegar/emplear", "verb awl"),
    ("deteriorate (v)", "to become worse", "His accent deteriorated without practice.", "deteriorarse", "verb awl"),
    ("devise (v)", "to invent a method or plan", "She devised a simpler test.", "idear/diseñar", "verb awl"),
    ("discern (v)", "to notice or understand with effort", "It's hard to discern a pattern.", "discernir/percibir", "verb awl formal"),
    ("discrete (adj)", "separate and distinct", "two discrete categories", "discreto/separado", "adjective awl"),
    ("disparity (n)", "a clear difference, usually unfair", "the disparity between regions", "disparidad", "noun awl"),
    ("disseminate (v)", "to spread widely", "The findings were disseminated online.", "difundir", "verb awl formal"),
    ("distort (v)", "to change so it is no longer accurate", "The summary distorts the argument.", "distorsionar", "verb awl"),
    ("elaborate (v)", "to give more detail", "Could you elaborate on that?", "detallar/ampliar", "verb awl"),
    ("elicit (v)", "to get a response from someone", "The question elicited no answer.", "provocar/obtener", "verb awl"),
    ("embody (v)", "to represent an idea in a clear form", "The design embodies the principle.", "encarnar", "verb awl"),
    ("emerge (v)", "to come out or become known", "A pattern emerged from the data.", "surgir/emerger", "verb awl"),
    ("empirical (adj)", "based on observation, not theory", "There is little empirical support.", "empírico", "adjective awl"),
    ("encompass (v)", "to include a wide range", "The term encompasses several methods.", "abarcar", "verb awl"),
    ("enhance (v)", "to improve the quality of", "Sleep enhances retention.", "mejorar/realzar", "verb awl"),
    ("entail (v)", "to involve as a necessary part", "Fluency entails a lot of listening.", "conllevar/implicar", "verb awl"),
    ("erode (v)", "to wear away gradually", "Confidence erodes without practice.", "erosionar", "verb awl"),
    ("exacerbate (v)", "to make a bad situation worse", "Rushing exacerbates the problem.", "agravar", "verb awl formal"),
    ("exemplify (v)", "to be a typical example of", "This case exemplifies the trend.", "ejemplificar", "verb awl"),
    ("exert (v)", "to apply force or influence", "Peers exert a strong influence.", "ejercer", "verb awl"),
    ("explicit (adj)", "stated clearly and directly", "explicit grammar instruction", "explícito", "adjective awl"),
    ("exploit (v)", "to use fully; to use unfairly", "The method exploits spaced repetition.", "aprovechar/explotar", "verb awl"),
    ("feasible (adj)", "possible to do in practice", "Thirty minutes a day is feasible.", "factible/viable", "adjective awl"),
    ("fluctuate (v)", "to rise and fall irregularly", "Motivation fluctuates over months.", "fluctuar", "verb awl"),
    ("formulate (v)", "to express or devise carefully", "He formulated a clear hypothesis.", "formular", "verb awl"),
    ("foster (v)", "to encourage the development of", "The class fosters risk-taking.", "fomentar", "verb awl"),
    ("fundamental (adj)", "forming a necessary base", "a fundamental difference", "fundamental", "adjective awl"),
    ("hamper (v)", "to make progress difficult", "Anxiety hampers production.", "dificultar/obstaculizar", "verb"),
    ("hierarchy (n)", "a system ranked by level", "a hierarchy of difficulty", "jerarquía", "noun awl"),
    ("hinder (v)", "to slow or prevent progress", "Translating word by word hinders fluency.", "impedir/estorbar", "verb awl"),
    ("hypothesis (n)", "an idea to be tested (pl. hypotheses)", "The hypothesis was not supported.", "hipótesis", "noun awl irregular-plural"),
    ("impede (v)", "to obstruct or delay", "Noise impedes comprehension.", "impedir", "verb awl formal"),
    ("implement (v)", "to put a plan into action", "We implemented the change in March.", "implementar/aplicar", "verb awl"),
    ("implicit (adj)", "suggested but not stated", "implicit learning through exposure", "implícito", "adjective awl"),
    ("incur (v)", "to become subject to a cost or loss", "You may incur additional fees.", "incurrir en", "verb awl formal"),
    ("indispensable (adj)", "absolutely necessary", "Practice is indispensable.", "indispensable", "adjective"),
    ("induce (v)", "to cause or persuade", "The drug induces drowsiness.", "inducir/provocar", "verb awl"),
    ("inevitable (adj)", "certain to happen", "Some errors are inevitable.", "inevitable", "adjective awl"),
    ("infer (v)", "to conclude from evidence", "We can infer the meaning from context.", "inferir", "verb awl"),
    ("inherent (adj)", "existing as a natural part", "an inherent limitation of the method", "inherente", "adjective awl"),
    ("initiate (v)", "to start something", "She initiated the conversation.", "iniciar", "verb awl"),
    ("integral (adj)", "necessary to make something complete", "Feedback is integral to learning.", "integral/esencial", "adjective awl"),
    ("integrate (v)", "to combine into a whole", "The course integrates all four skills.", "integrar", "verb awl"),
    ("intervene (v)", "to become involved to change something", "The teacher intervened early.", "intervenir", "verb awl"),
    ("intrinsic (adj)", "belonging naturally; from within", "intrinsic motivation", "intrínseco", "adjective awl"),
    ("isolate (v)", "to separate from others", "We isolated one variable.", "aislar", "verb awl"),
    ("latter (adj)", "the second of two mentioned", "Of the two, the latter is cheaper.", "el último (de dos)", "adjective awl"),
    ("magnitude (n)", "great size or importance", "the magnitude of the effect", "magnitud", "noun awl"),
    ("manifest (v/adj)", "to show clearly; obvious", "Anxiety manifests as silence.", "manifestar(se)", "verb awl"),
    ("mediate (v)", "to help two sides reach agreement", "Social interaction mediates learning.", "mediar", "verb awl"),
    ("mere (adj)", "nothing more than", "a mere coincidence", "simple/mero", "adjective"),
    ("methodology (n)", "the set of methods used", "The methodology was clearly described.", "metodología", "noun awl"),
    ("negligible (adj)", "so small it can be ignored", "The difference was negligible.", "insignificante", "adjective awl"),
    ("notion (n)", "an idea or belief", "the notion of a critical period", "noción/idea", "noun awl"),
    ("obscure (adj/v)", "not well known; to hide", "The point is obscured by jargon.", "oscuro/ocultar", "adjective awl"),
    ("offset (v)", "to balance one thing against another", "Gains offset the initial cost.", "compensar", "verb awl"),
    ("omit (v)", "to leave out", "He omitted the third person -s.", "omitir", "verb awl"),
    ("onset (n)", "the beginning of something", "the onset of adolescence", "inicio/comienzo", "noun"),
    ("outweigh (v)", "to be greater in value than", "The benefits outweigh the effort.", "pesar más que", "verb"),
    ("overt (adj)", "done openly, not hidden", "overt correction of errors", "abierto/manifiesto", "adjective awl"),
    ("paramount (adj)", "more important than anything else", "Clarity is paramount here.", "primordial", "adjective formal"),
    ("pertinent (adj)", "relevant to the matter", "a pertinent question", "pertinente", "adjective awl formal"),
    ("phenomenon (n)", "an observable fact (pl. phenomena)", "a well-documented phenomenon", "fenómeno", "noun awl irregular-plural"),
    ("plausible (adj)", "seeming reasonable or probable", "a plausible explanation", "plausible/verosímil", "adjective awl"),
    ("preclude (v)", "to make impossible", "Cost precludes a larger sample.", "impedir/excluir", "verb formal"),
    ("predominant (adj)", "most common or strongest", "the predominant view in the field", "predominante", "adjective awl"),
    ("presume (v)", "to suppose something is true", "I presume you've read it.", "presumir/suponer", "verb awl"),
    ("prompt (v)", "to cause an action or response", "The image prompted a memory.", "provocar/inducir", "verb"),
    ("proponent (n)", "someone who supports an idea", "a proponent of extensive reading", "partidario", "noun"),
    ("rationale (n)", "the reasons behind a decision", "the rationale for spaced repetition", "fundamento/razón", "noun awl"),
    ("refute (v)", "to prove that something is wrong", "The study refutes that claim.", "refutar", "verb formal"),
    ("reinforce (v)", "to make stronger", "Retrieval reinforces memory.", "reforzar", "verb awl"),
    ("resilient (adj)", "able to recover quickly", "Resilient learners keep going.", "resiliente", "adjective"),
    ("retain (v)", "to keep or hold on to", "You retain what you retrieve.", "retener", "verb awl"),
    ("robust (adj)", "strong and reliable", "a robust finding", "robusto/sólido", "adjective"),
    ("salient (adj)", "most noticeable or important", "the salient features of the text", "destacado/saliente", "adjective formal"),
    ("scarce (adj)", "not enough; hard to find", "Water is scarce in the region.", "escaso", "adjective awl"),
    ("simultaneous (adj)", "happening at the same time", "simultaneous translation", "simultáneo", "adjective awl"),
    ("stem from (phr v)", "to be caused by", "The error stems from the L1.", "derivarse de", "phrasal-verb"),
    ("substantial (adj)", "large in amount or importance", "a substantial improvement", "considerable/sustancial", "adjective awl"),
    ("supersede (v)", "to replace something older", "The new model supersedes the old one.", "reemplazar/sustituir", "verb formal"),
    ("tentative (adj)", "not certain; provisional", "a tentative conclusion", "provisional/tentativo", "adjective"),
    ("threshold (n)", "the level at which something starts", "a threshold of comprehension", "umbral", "noun"),
    ("underpin (v)", "to support or form the basis of", "Five principles underpin the method.", "sustentar/apuntalar", "verb"),
    ("viable (adj)", "able to work successfully", "a viable alternative", "viable", "adjective"),
    ("warrant (v)", "to justify or deserve", "The claim warrants closer study.", "justificar/merecer", "verb formal"),
    ("widespread (adj)", "existing in many places", "a widespread misconception", "generalizado", "adjective"),
    ("yield (v/n)", "to produce a result; output", "The method yields better retention.", "producir/rendimiento", "verb awl"),
]

LOTES = {"b2": B2}


def headword(front: str) -> str:
    return re.sub(r"\s*\(.*?\)", "", front).strip().lower()


def main() -> None:
    # Todas las palabras ya existentes, de todos los niveles: no queremos que la
    # misma palabra aparezca en dos decks.
    existing = {}
    decks = {}
    for lvl in LEVELS:
        path = CANON / f"{lvl}.tsv"
        rows = list(csv.DictReader(path.open(), delimiter="\t"))
        decks[lvl] = rows
        for r in rows:
            existing[headword(r["front"])] = lvl

    for lvl, lote in LOTES.items():
        rows = decks[lvl]
        next_num = max(int(r["id"].split("-")[1]) for r in rows)
        added = skipped = 0

        for front, definition, example, translation, tags in lote:
            key = headword(front)
            if key in existing:
                skipped += 1
                continue
            next_num += 1
            rows.append({
                "id": f"{lvl}-{next_num:03d}",
                "front": front,
                "definition": definition,
                "example": example,
                "translation": translation,
                "tags": f"{lvl} {tags}".strip(),
            })
            existing[key] = lvl
            added += 1

        path = CANON / f"{lvl}.tsv"
        with path.open("w", newline="") as fh:
            w = csv.writer(fh, delimiter="\t", lineterminator="\n")
            w.writerow(FIELDS)
            for r in rows:
                w.writerow([r[c] for c in FIELDS])

        print(f"{lvl}: +{added} nuevas (omitidas {skipped} ya existentes) → {len(rows)} cards")


if __name__ == "__main__":
    main()
