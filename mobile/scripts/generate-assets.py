#!/usr/bin/env python3
"""Genera los assets de icono/splash de la app a partir del diseño de
`webapp/icons/app-icon.svg` (rect #2d6cdf + E blanca + barra #b9d1ff).

Se dibujan con Pillow en lugar de rasterizar el SVG porque la geometría es
trivial y así controlamos exactamente el safe-zone de cada plataforma:

- `icon.png`            1024x1024 opaco, full-bleed. iOS aplica su propia
                        máscara redondeada, así que NO llevamos esquinas.
- `adaptive-icon.png`   1024x1024 con fondo transparente y la marca dentro del
                        66% central (safe zone del adaptive icon de Android).
- `splash-icon.png`     1024x1024 transparente, marca centrada.
- `favicon.png`         48x48 con esquinas redondeadas (la web sí las necesita).

Uso: python3 scripts/generate-assets.py
"""

from pathlib import Path

from PIL import Image, ImageDraw

BLUE = (45, 108, 223, 255)      # #2d6cdf
WHITE = (255, 255, 255, 255)
PALE = (185, 209, 255, 255)     # #b9d1ff

# Geometría del SVG original, en su viewBox de 512x512.
VIEWBOX = 512.0
E_POLYGON = [
    (128, 122), (384, 122), (384, 176), (190, 176),
    (190, 230), (358, 230), (358, 282), (190, 282),
    (190, 336), (392, 336), (392, 390), (128, 390),
]
BAR_RECT = (112, 414, 400, 448)  # x0, y0, x1, y1

# Bounding box del grupo E+barra dentro del viewBox. El SVG original no está
# centrado (la barra lo desplaza hacia abajo); eso se disimulaba con las
# esquinas redondeadas, pero en un icono full-bleed se nota, así que centramos
# el grupo por su bbox en lugar de por el viewBox.
MARK_BBOX = (
    min(min(x for x, _ in E_POLYGON), BAR_RECT[0]),
    min(min(y for _, y in E_POLYGON), BAR_RECT[1]),
    max(max(x for x, _ in E_POLYGON), BAR_RECT[2]),
    max(max(y for _, y in E_POLYGON), BAR_RECT[3]),
)

ASSETS = Path(__file__).resolve().parent.parent / "assets"


def _draw_mark(draw: ImageDraw.ImageDraw, size: int, coverage: float) -> None:
    """Dibuja la E + barra ocupando `coverage` del lado, centradas por bbox.

    `coverage` es la fracción del lado del lienzo que ocupa el lado mayor del
    grupo, así que 1.0 llega justo a los bordes y 0.66 deja el safe-zone de
    Android.
    """
    bx0, by0, bx1, by1 = MARK_BBOX
    unit = size * coverage / max(bx1 - bx0, by1 - by0)
    dx = (size - (bx1 - bx0) * unit) / 2 - bx0 * unit
    dy = (size - (by1 - by0) * unit) / 2 - by0 * unit

    draw.polygon([(x * unit + dx, y * unit + dy) for x, y in E_POLYGON], fill=WHITE)
    x0, y0, x1, y1 = BAR_RECT
    draw.rectangle((x0 * unit + dx, y0 * unit + dy, x1 * unit + dx, y1 * unit + dy), fill=PALE)


def _rounded_mask(size: int, radius: int) -> Image.Image:
    mask = Image.new("L", (size, size), 0)
    ImageDraw.Draw(mask).rounded_rectangle((0, 0, size - 1, size - 1), radius=radius, fill=255)
    return mask


def build_icon(size: int = 1024) -> Image.Image:
    """Icono de tienda: opaco, sin esquinas redondeadas, sin canal alfa.

    App Store Connect rechaza iconos con transparencia, de ahí el modo RGB.
    """
    img = Image.new("RGBA", (size, size), BLUE)
    # 0.60: iOS recorta las esquinas, así que la marca necesita aire alrededor.
    _draw_mark(ImageDraw.Draw(img), size, coverage=0.60)
    return img.convert("RGB")


def build_adaptive_icon(size: int = 1024) -> Image.Image:
    """Foreground del adaptive icon de Android: marca al 45% del lienzo, porque
    el launcher recorta hasta el 66% central y encima anima un zoom."""
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    _draw_mark(ImageDraw.Draw(img), size, coverage=0.45)
    return img


def build_splash_icon(size: int = 1024) -> Image.Image:
    """Baldosa completa (fondo azul + marca) sobre transparente.

    Deliberadamente NO es la marca blanca suelta: el splash usa fondo claro en
    light mode (#f8fafc) y una E blanca sería invisible ahí. La baldosa azul se
    lee sobre ambos temas con una sola imagen.
    """
    img = Image.new("RGBA", (size, size), BLUE)
    _draw_mark(ImageDraw.Draw(img), size, coverage=0.62)
    img.putalpha(_rounded_mask(size, radius=int(size * 96 / VIEWBOX)))
    return img


def build_favicon(size: int = 48) -> Image.Image:
    """Favicon web: aquí sí redondeamos, porque ningún navegador enmascara."""
    hi = size * 16  # dibuja grande y reduce, para bordes suaves
    img = Image.new("RGBA", (hi, hi), BLUE)
    _draw_mark(ImageDraw.Draw(img), hi, coverage=0.62)
    img.putalpha(_rounded_mask(hi, radius=int(hi * 96 / VIEWBOX)))
    return img.resize((size, size), Image.LANCZOS)


def main() -> None:
    ASSETS.mkdir(parents=True, exist_ok=True)
    outputs = {
        "icon.png": build_icon(),
        "adaptive-icon.png": build_adaptive_icon(),
        "splash-icon.png": build_splash_icon(),
        "favicon.png": build_favicon(),
    }
    for name, img in outputs.items():
        path = ASSETS / name
        img.save(path, "PNG")
        print(f"{path.relative_to(ASSETS.parent)}  {img.size[0]}x{img.size[1]}  {img.mode}")


if __name__ == "__main__":
    main()
