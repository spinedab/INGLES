#!/usr/bin/env python3
"""Sube capturas de pantalla a App Store Connect.

Apple no acepta un simple POST con el fichero: hay que reservar el asset, subir
los bytes a las URLs que devuelve (`uploadOperations`, que pueden ser varias
partes) y después confirmar con el MD5 del original. Si no se confirma, la
captura queda en estado inválido y bloquea el envío.

Uso:
    python3 tools/asc_screenshots.py <localizationId> <displayType> <png>...

Ejemplo (6.9", que cubre iPhone 16/17 Pro Max):
    python3 tools/asc_screenshots.py 042b452d-... APP_IPHONE_67 shots/*.png

Tipos útiles: APP_IPHONE_67 (6.7"/6.9", 1290x2796 o 1320x2868),
              APP_IPHONE_65, APP_IPAD_PRO_3GEN_129.
"""

from __future__ import annotations

import hashlib
import sys
import urllib.request
from pathlib import Path

from asc import call


def upload_bytes(op: dict, data: bytes) -> None:
    chunk = data[op["offset"]: op["offset"] + op["length"]]
    req = urllib.request.Request(op["url"], data=chunk, method=op["method"])
    for h in op.get("requestHeaders") or []:
        req.add_header(h["name"], h["value"])
    with urllib.request.urlopen(req) as r:
        if r.status not in (200, 201, 204):
            raise SystemExit(f"fallo subiendo parte: HTTP {r.status}")


def ensure_set(localization_id: str, display_type: str) -> str:
    status, out = call("GET", f"/v1/appStoreVersionLocalizations/{localization_id}/appScreenshotSets")
    if status == 200:
        for s in out.get("data", []):
            if s["attributes"]["screenshotDisplayType"] == display_type:
                print(f"set existente {s['id']} ({display_type})")
                return s["id"]
    status, out = call("POST", "/v1/appScreenshotSets", body={
        "data": {
            "type": "appScreenshotSets",
            "attributes": {"screenshotDisplayType": display_type},
            "relationships": {"appStoreVersionLocalization": {
                "data": {"type": "appStoreVersionLocalizations", "id": localization_id}}},
        }})
    if status != 201:
        raise SystemExit(f"no se pudo crear el set: HTTP {status}\n{out}")
    print(f"set creado {out['data']['id']} ({display_type})")
    return out["data"]["id"]


def upload_one(set_id: str, path: Path) -> None:
    data = path.read_bytes()
    status, out = call("POST", "/v1/appScreenshots", body={
        "data": {
            "type": "appScreenshots",
            "attributes": {"fileName": path.name, "fileSize": len(data)},
            "relationships": {"appScreenshotSet": {
                "data": {"type": "appScreenshotSets", "id": set_id}}},
        }})
    if status != 201:
        raise SystemExit(f"reserva fallida para {path.name}: HTTP {status}\n{out}")

    shot_id = out["data"]["id"]
    for op in out["data"]["attributes"]["uploadOperations"]:
        upload_bytes(op, data)

    # Sin este commit la captura queda inválida y bloquea el envío.
    status, out = call("PATCH", f"/v1/appScreenshots/{shot_id}", body={
        "data": {"type": "appScreenshots", "id": shot_id,
                 "attributes": {"uploaded": True,
                                "sourceFileChecksum": hashlib.md5(data).hexdigest()}}})
    state = (out or {}).get("data", {}).get("attributes", {}).get("assetDeliveryState", {})
    print(f"  {path.name:22} HTTP {status}  estado={state.get('state')}")


def main() -> None:
    if len(sys.argv) < 4:
        raise SystemExit(__doc__)
    localization_id, display_type, files = sys.argv[1], sys.argv[2], sys.argv[3:]
    set_id = ensure_set(localization_id, display_type)
    for f in sorted(files):
        upload_one(set_id, Path(f))


if __name__ == "__main__":
    main()
