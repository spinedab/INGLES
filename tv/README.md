# App de televisor — LG (webOS) y Samsung (Tizen)

La misma app de siempre, manejable con mando desde el sofá. **No hay una
segunda copia del código**: el paquete se ensambla desde [`../webapp`](../webapp)
y solo se le añaden dos archivos, igual que hace el despliegue web.

| | |
|---|---|
| LG | webOS, paquete `.ipk`, `appinfo.json` |
| Samsung | Tizen, paquete `.wgt`, `config.xml` |
| Mínimo | Tizen 6.0 / webOS 6 (televisores de 2021 en adelante) |
| App id | `com.spinedab.ingles` — el mismo que iOS y Android |

## Construir

```bash
./build-tv.sh                 # ensambla las dos plataformas
./build-tv.sh webos           # solo LG
PACKAGE=1 ./build-tv.sh       # ensambla y además empaqueta
```

Salida en `build/webos/`, `build/tizen/` y los paquetes en `build/dist/`.
Nada de esto se versiona.

## Qué se añade a la webapp

- **`shared/tv.js`** — navegación con mando. Las flechas mueven el foco al
  vecino geométricamente más cercano, OK activa, ATRÁS vuelve al inicio y en
  la raíz cierra la app.
- **`shared/tv.css`** — interfaz de «10 pies»: cuerpo de texto a 28px, margen
  de overscan, foco grueso y tema oscuro forzado.

Y se quitan `sw.js` y el manifiesto de PWA, que en un televisor no sirven de
nada.

## Las tres trampas de este entorno

**1. Los navegadores de TV van años por detrás.** Tizen 6 embarca Chromium 76
y webOS 6 embarca Chromium 79. Eso descarta buena parte del CSS que usa
`app.css`:

| Característica | Necesita | ¿En TV? |
|---|---|---|
| OKLCH | Chromium 111 | no |
| `:where()` | 88 | no |
| `:focus-visible` | 86 | no |
| `gap` en flexbox | 84 | no (en grid sí, es de la 66) |
| `:has()` | 105 | no |

Un color inválido **no se ignora sin más**: se descarta la declaración
completa, así que `background: var(--bg)` con `--bg` en OKLCH deja el fondo
transparente y el texto puede quedar ilegible. Por eso `tv.css` redefine los
tokens en HEX — convertidos desde la paleta OKLCH, no aproximados a ojo — y
evita esa sintaxis. **Si añades color a `app.css`, comprueba que el alias
correspondiente exista también en `tv.css`.**

**2. `ares-package` necesita `-n` y no lo dice.** Por defecto minifica con
uglify-js, que no sabe parsear módulos ES. Como la webapp usa `import`, el
empaquetado falla con `Failed to minify code` señalando un archivo cualquiera,
lo que despista porque ese archivo está bien. El flag `-n` / `--no-minify`
existe pero está oculto de `--help`. `build-tv.sh` ya lo pasa.

**3. No hay síntesis de voz.** `speechSynthesis` no está disponible en estos
televisores, así que los 8 listenings pierden el audio. El módulo ya lo
detecta y degrada: deshabilita los botones, avisa y deja el guion visible, con
lo que el ejercicio se convierte en lectura. Es la limitación más visible de
la versión de TV y la que habría que resolver con audio pregrabado.

## Publicar

Ninguno de los dos paquetes se puede publicar sin cuenta de fabricante, y esas
cuentas son tuyas.

### LG
1. Cuenta en [LG Seller Lounge](https://seller.lgappstv.com) — gratuita.
2. Para probar en el televisor: Developer Mode desde la LG Content Store,
   luego `ares-setup-device` y `ares-install`.
3. Subir el `.ipk`. LG firma en el proceso de publicación, así que el paquete
   que genera este script ya sirve tal cual.

### Samsung
1. Cuenta en [Samsung Seller Office](https://seller.samsungapps.com) — gratuita.
2. **Firma obligatoria.** El `.wgt` que genera este script sale *sin firmar* y
   por tanto no instala ni se admite. Hace falta Tizen Studio para crear un
   perfil de certificado (autor + distribuidor) con tu cuenta Samsung. Para
   instalar en un televisor concreto además hay que registrar su DUID.
3. Tizen Studio no está instalado en este Mac: es un instalador gráfico de
   varios GB. Es el único paso del proceso que no se puede automatizar desde
   aquí.
