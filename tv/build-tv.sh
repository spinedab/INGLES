#!/usr/bin/env bash
# Ensambla la app de televisor para LG (webOS) y Samsung (Tizen).
#
# La app NO se duplica: se toma tal cual de ../webapp y se le inyectan dos
# archivos (tv.css y tv.js) más el manifiesto de cada plataforma. Así una
# corrección en la webapp llega a los tres destinos sin tener que replicarla,
# que es el mismo criterio que sigue el despliegue web.
#
# Uso:
#   ./build-tv.sh              # ensambla las dos plataformas
#   ./build-tv.sh webos        # solo LG
#   ./build-tv.sh tizen        # solo Samsung
#
# Salida: build/webos/ y build/tizen/, listos para empaquetar.
set -euo pipefail

cd "$(dirname "$0")"
TV_DIR="$PWD"
WEBAPP="$TV_DIR/../webapp"
BUILD="$TV_DIR/build"

[ -d "$WEBAPP" ] || { echo "No encuentro ../webapp"; exit 1; }

log() { printf '\033[36m▸\033[0m %s\n' "$1"; }

assemble() {
  local platform="$1"
  local out="$BUILD/$platform"

  log "Ensamblando $platform"
  rm -rf "$out"; mkdir -p "$out"

  # La webapp entera menos lo que no tiene sentido en un televisor.
  # El service worker se excluye a propósito: en TV la app ya está instalada
  # en local, así que cachear no aporta nada y en cambio complica las
  # actualizaciones, que pasan por la tienda y no por la red.
  rsync -a \
    --exclude '.DS_Store' \
    --exclude 'sw.js' \
    --exclude 'manifest.webmanifest' \
    "$WEBAPP/" "$out/"

  cp "$TV_DIR/shared/tv.css" "$out/css/tv.css"
  cp "$TV_DIR/shared/tv.js"  "$out/js/tv.js"

  # Inyección en el HTML. tv.css debe ir DESPUÉS de app.css para poder
  # redefinir los tokens, y tv.js antes del módulo de la app para que el
  # atributo data-platform ya esté puesto cuando se pinte la primera vista.
  python3 - "$out/index.html" <<'PY'
import sys, re
p = sys.argv[1]
html = open(p, encoding='utf-8').read()

if 'css/tv.css' in html:
    sys.exit(0)

html = html.replace(
    '<link rel="stylesheet" href="css/app.css">',
    '<link rel="stylesheet" href="css/app.css">\n<link rel="stylesheet" href="css/tv.css">',
    1)

# El manifiesto de PWA no se copia, así que se quita su <link> para no dejar
# una peticion 404 en cada arranque.
html = re.sub(r'\s*<link rel="manifest"[^>]*>', '', html, count=1)

html = html.replace(
    '<script type="module" src="js/app.js"></script>',
    '<script src="js/tv.js"></script>\n<script type="module" src="js/app.js"></script>',
    1)

open(p, 'w', encoding='utf-8').write(html)
PY

  case "$platform" in
    webos)
      cp "$TV_DIR/webos/appinfo.json" "$TV_DIR/webos/icon.png" \
         "$TV_DIR/webos/largeIcon.png" "$out/"
      ;;
    tizen)
      cp "$TV_DIR/tizen/config.xml" "$TV_DIR/tizen/icon.png" "$out/"
      ;;
  esac

  # Verificaciones: es barato comprobarlo aquí y caro descubrirlo en el
  # televisor, donde no hay consola.
  grep -q 'css/tv.css' "$out/index.html" || { echo "FALLO: tv.css no inyectado"; exit 1; }
  grep -q 'js/tv.js'   "$out/index.html" || { echo "FALLO: tv.js no inyectado"; exit 1; }
  grep -q 'rel="manifest"' "$out/index.html" && { echo "FALLO: quedo el link del manifest"; exit 1; }
  [ ! -e "$out/sw.js" ] || { echo "FALLO: sw.js no deberia estar"; exit 1; }
  # Un color OKLCH en TV descarta la declaracion entera y puede dejar texto
  # ilegible, asi que tv.css no debe contener ninguno.
  ! grep -q 'oklch' "$out/css/tv.css" || { echo "FALLO: tv.css contiene oklch"; exit 1; }

  log "  $(du -sh "$out" | cut -f1) en build/$platform"
}

targets=("${@:-webos tizen}")
[ $# -gt 0 ] && targets=("$@") || targets=(webos tizen)
for t in "${targets[@]}"; do
  case "$t" in
    webos|tizen) assemble "$t" ;;
    *) echo "Plataforma desconocida: $t (usa webos o tizen)"; exit 1 ;;
  esac
done

package_webos() {
  local out="$BUILD/webos"
  local ares
  ares="$(command -v ares-package || echo /tmp/node_modules/.bin/ares-package)"
  [ -x "$ares" ] || { echo "ares-package no encontrado. npm i -g @webosose/ares-cli"; return 1; }

  # -n (--no-minify) es imprescindible y no aparece en --help.
  #
  # Por defecto ares-package minifica con uglify-js, que no sabe parsear
  # modulos ES. Como la webapp usa import/export, el empaquetado falla con
  # "Failed to minify code" señalando un archivo al azar, lo que despista
  # porque el archivo no tiene nada malo. Minificar tampoco aporta: son 620 KB
  # y la app se sirve desde el propio televisor.
  log "Empaquetando .ipk (LG)"
  mkdir -p "$BUILD/dist"
  "$ares" -n "$out" -o "$BUILD/dist" | tail -2
}

package_tizen() {
  local out="$BUILD/tizen"
  # Un .wgt es un ZIP con config.xml en la raiz. Se genera aqui para tener el
  # artefacto completo, pero SIN FIRMAR: Samsung exige firma con un perfil de
  # certificado creado desde Tizen Studio con tu cuenta Samsung, y para
  # instalar en un televisor concreto hace falta ademas su DUID. Sin firma el
  # paquete no instala ni se admite en Seller Office.
  log "Empaquetando .wgt (Samsung, SIN FIRMAR)"
  mkdir -p "$BUILD/dist"
  local wgt="$BUILD/dist/TutorIngles-1.0.0-unsigned.wgt"
  rm -f "$wgt"
  ( cd "$out" && zip -q -r -X "$wgt" . )
  echo "  $(du -h "$wgt" | cut -f1)  $(basename "$wgt")"
}

if [ "${PACKAGE:-0}" = "1" ]; then
  for t in "${targets[@]}"; do
    case "$t" in
      webos) package_webos ;;
      tizen) package_tizen ;;
    esac
  done
fi

cat <<'NEXT'

Listo. Artefactos en tv/build/ (y en tv/build/dist/ si PACKAGE=1).

  PACKAGE=1 ./build-tv.sh        # ensambla y empaqueta

LG webOS — el .ipk queda listo para instalar o subir:
    ares-setup-device                    # registrar el TV (Developer Mode ON)
    ares-install --device <tv> tv/build/dist/*.ipk

Samsung Tizen — el .wgt sale SIN FIRMAR y hay que firmarlo con Tizen Studio:
    tizen package -t wgt -s <perfil> -- tv/build/tizen

Ver tv/README.md para cuentas, firma y publicacion.
NEXT
