#!/usr/bin/env python3
"""Cliente de la App Store Connect API para gestionar la ficha de esta app.

Autentica con la clave .p8 y un JWT ES256, así que **no necesita la contraseña
del Apple ID** ni sesión interactiva. La clave privada nunca se imprime ni se
guarda aquí.

Config por entorno (o ~/.appstoreconnect/config):
    ASC_KEY_ID      id de la clave, p.ej. S32YS2GL7U
    ASC_ISSUER_ID   uuid del emisor (App Store Connect → Usuarios y acceso →
                    Integraciones → API de App Store Connect)
    ASC_KEY_PATH    (opcional) ruta al .p8; por defecto
                    ~/.appstoreconnect/private_keys/AuthKey_<KEY_ID>.p8

Uso:
    python3 tools/asc.py get  /v1/apps '{"filter[bundleId]":"com.spinedab.ingles"}'
    python3 tools/asc.py post /v1/bundleIds '<json>'
    python3 tools/asc.py patch /v1/apps/6798352342 '<json>'

Notas de la API aprendidas a base de topársela:
  - `/v1/apps` **no** admite CREATE (403). El registro de una app solo se puede
    crear desde la web de App Store Connect.
  - Cambiar `primaryLocale` falla con 409 MISSING_SCREENSHOTS_PRIMARY_LOCALE
    mientras no existan capturas para ese idioma.
"""

from __future__ import annotations  # el python3 del sistema es 3.9

import json
import os
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

import jwt

BASE = "https://api.appstoreconnect.apple.com"
CONFIG = Path.home() / ".appstoreconnect" / "config"


def _config() -> dict:
    """Env primero; si falta algo, se completa con ~/.appstoreconnect/config
    (formato CLAVE=valor)."""
    cfg = {}
    if CONFIG.exists():
        for line in CONFIG.read_text().splitlines():
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                k, v = line.split("=", 1)
                cfg[k.strip()] = v.strip()
    for k in ("ASC_KEY_ID", "ASC_ISSUER_ID", "ASC_KEY_PATH"):
        if os.environ.get(k):
            cfg[k] = os.environ[k]

    missing = [k for k in ("ASC_KEY_ID", "ASC_ISSUER_ID") if not cfg.get(k)]
    if missing:
        raise SystemExit(
            f"Falta configuración: {', '.join(missing)}.\n"
            f"Defínelas por entorno o en {CONFIG}:\n"
            "  ASC_KEY_ID=XXXXXXXXXX\n"
            "  ASC_ISSUER_ID=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
        )
    cfg.setdefault(
        "ASC_KEY_PATH",
        str(Path.home() / ".appstoreconnect" / "private_keys" / f"AuthKey_{cfg['ASC_KEY_ID']}.p8"),
    )
    if not Path(cfg["ASC_KEY_PATH"]).exists():
        raise SystemExit(f"No existe la clave privada: {cfg['ASC_KEY_PATH']}")
    return cfg


def token(cfg: dict) -> str:
    # 20 min es el máximo que Apple acepta para claves de equipo.
    return jwt.encode(
        {
            "iss": cfg["ASC_ISSUER_ID"],
            "iat": int(time.time()),
            "exp": int(time.time()) + 20 * 60,
            "aud": "appstoreconnect-v1",
        },
        Path(cfg["ASC_KEY_PATH"]).read_text(),
        algorithm="ES256",
        headers={"kid": cfg["ASC_KEY_ID"], "typ": "JWT"},
    )


def call(method: str, path: str, params: dict = None, body: dict = None):
    cfg = _config()
    url = BASE + path
    if params:
        url += "?" + urllib.parse.urlencode(params)
    data = json.dumps(body).encode() if body else None
    req = urllib.request.Request(url, data=data, method=method)
    req.add_header("Authorization", f"Bearer {token(cfg)}")
    if data:
        req.add_header("Content-Type", "application/json")
    try:
        with urllib.request.urlopen(req) as r:
            raw = r.read()
            return r.status, (json.loads(raw) if raw else None)
    except urllib.error.HTTPError as e:
        raw = e.read()
        try:
            return e.code, json.loads(raw)
        except Exception:
            return e.code, {"raw": raw.decode(errors="replace")}


def main() -> None:
    if len(sys.argv) < 3:
        raise SystemExit(__doc__)
    method = sys.argv[1].upper()
    path = sys.argv[2]
    arg = json.loads(sys.argv[3]) if len(sys.argv) > 3 else None
    status, out = call(
        method, path,
        params=arg if method == "GET" else None,
        body=arg if method != "GET" else None,
    )
    print(f"HTTP {status}")
    print(json.dumps(out, indent=2, ensure_ascii=False) if out is not None else "(sin cuerpo)")


if __name__ == "__main__":
    main()
