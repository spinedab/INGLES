# Contenido de estudio

Fuente canónica de todos los idiomas. **Se edita aquí y solo aquí**: lo que hay
en `webapp/content/`, `mobile/assets/content/`, `mobile/lib/contentRegistry.ts`
y `plan-personal/anki/` está generado y se sobrescribe.

```
content/<lang>/
  lang.json            metadatos: nombre, locale de TTS, titular, variedad
  vocab/<nivel>.tsv    tarjetas (a1, a2, b1, b2)
  grammar.json         temas con regla, ejemplos y ejercicios
  lecturas/<id>.json   lecturas graduadas
  listening/<id>.json  diálogos con guion
```

Generar y validar:

```bash
python3 tools/build_content.py           # regenera todo
python3 tools/build_content.py --check   # valida sin escribir (lo que corre CI)
```

## Idiomas y volumen actual

| | vocabulario | gramática | lecturas | listening |
|---|---|---|---|---|
| inglés (`en`) | 1213 | 23 temas / 120 ej. | 15 | 8 |
| portugués (`pt`) | 500 | 8 / 36 | 4 | 2 |
| francés (`fr`) | 500 | 8 / 36 | 4 | 2 |
| italiano (`it`) | 500 | 8 / 37 | 4 | 2 |
| mandarín (`zh`) | 500 | 8 / 35 | 4 | 2 |

El inglés lleva más recorrido; los cuatro idiomas nuevos tienen los cuatro
niveles poblados y todos los módulos funcionando, así que ningún nivel queda
con la pantalla vacía. Crecer es añadir filas al TSV correspondiente.

## Reglas que el generador impone

**Los ids son permanentes.** El progreso del alumno vive en
`localStorage['srs:<deck>:<id>']`. Reasignar un id no da error visible: le
cambia las tarjetas de sitio a quien ya estudiaba. Por eso un id duplicado o
mal formado es un error fatal, no un aviso.

**El inglés no lleva prefijo.** Sus ids son `a1-001` y su deck `vocab-a1`,
como siempre. Los demás idiomas van prefijados (`pt-a1-001`, deck
`vocab-pt-a1`) para que no puedan colisionar entre sí ni con el inglés.

**El nivel se deduce del nombre del fichero** en lecturas y listening
(`<lang>-<nivel>-...json`), y el índice se construye con los ficheros que
existen. Antes había que declarar cada lectura nueva a mano en tres sitios y
al menos una vez se olvidó: el fichero existía pero era invisible en la app.

**`answer` tiene que caer dentro del rango de `options`.** Fuera de rango deja
un ejercicio que el alumno no puede acertar nunca.

**Un generado sin fuente es un error.** `--check` avisa de ficheros huérfanos,
así que borrar una fuente no deja restos servidos a los usuarios.

## Criterio de contenido

El contenido de cada idioma se escribe **contrastando con el español**, no
traduciendo el del inglés. Lo que le cuesta a un hispanohablante es distinto en
cada lengua:

- **portugués**: falsos amigos y el «portuñol». La cercanía es la trampa:
  `esquisito` no es exquisito y `embaraçada` no es embarazada. Gramática
  centrada en `ficar`, el futuro do subjuntivo (que el español no tiene vivo) y
  el infinitivo pessoal.
- **francés**: la relación entre grafía y sonido, los artículos partitivos
  («je mange DU pain», donde el español no pone nada) y el sujeto obligatorio.
- **italiano**: lo casi idéntico. Artículos `lo`/`gli`, dobles consonantes que
  cambian la palabra (`anno` / `ano`), `essere` o `avere` en el pasado, y el
  congiuntivo tras `penso che`, donde el español usa indicativo.
- **mandarín**: sin parentesco. Tonos como parte de la palabra, clasificadores,
  ausencia de conjugación. Todo A1-A2 lleva **pinyin con tonos** junto a los
  caracteres; referencia HSK.

El tutor IA tiene su propia calibración por idioma en
`api/app/calibration/<lang>.md` y escenarios de roleplay ambientados en
`api/app/scenarios/<lang>.json`.
