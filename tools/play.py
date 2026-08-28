#!/usr/bin/env python3
"""Sube el AAB a Google Play (prueba cerrada Alpha) vía la Developer API.

Existe porque las dos vías manuales fallaron por límites ajenos al proyecto:
el puente del navegador de Claude tope las subidas en 10 MB (el AAB pesa 54)
y la sesión web caduca. La API no tiene ninguno de los dos problemas y deja
la subida reproducible.

Usa la service account play-uploader@spinedab-play-api (la misma de MANDO,
ver dream-admin/MANDO_DEPLOY.md), que debe estar invitada en Play Console →
Usuarios y permisos con permiso de subir a pruebas. La llave vive fuera del
repo en ~/.android-signing/play-service-account.json.

Uso:
  python3 tools/play.py check                 # ¿la service account ve la app?
  python3 tools/play.py upload <ruta.aab>     # sube y deja BORRADOR en alpha
  python3 tools/play.py upload <ruta.aab> --release  # ...y lo publica a testers

Deja borrador por defecto a propósito: publicar a verificadores es una acción
visible para terceros y conviene que sea una decisión explícita.
"""
import json
import sys
import time
from pathlib import Path

import jwt  # PyJWT con cryptography, ya instalado en esta Mac
import urllib.request
import urllib.error

KEY_PATH = Path.home() / '.android-signing' / 'play-service-account.json'
PACKAGE = 'com.spinedab.ingles'
TRACK = 'alpha'
API = 'https://androidpublisher.googleapis.com/androidpublisher/v3'
UPLOAD_API = 'https://androidpublisher.googleapis.com/upload/androidpublisher/v3'


def access_token() -> str:
    sa = json.loads(KEY_PATH.read_text())
    now = int(time.time())
    assertion = jwt.encode(
        {
            'iss': sa['client_email'],
            'scope': 'https://www.googleapis.com/auth/androidpublisher',
            'aud': 'https://oauth2.googleapis.com/token',
            'iat': now,
            'exp': now + 3600,
        },
        sa['private_key'],
        algorithm='RS256',
    )
    data = urllib.parse.urlencode({
        'grant_type': 'urn:ietf:params:oauth:grant-type:jwt-bearer',
        'assertion': assertion,
    }).encode()
    with urllib.request.urlopen(urllib.request.Request(
            'https://oauth2.googleapis.com/token', data=data)) as r:
        return json.load(r)['access_token']


def call(method: str, url: str, token: str, body=None, content_type='application/json'):
    data = None
    if body is not None:
        data = body if isinstance(body, bytes) else json.dumps(body).encode()
    req = urllib.request.Request(url, data=data, method=method, headers={
        'Authorization': f'Bearer {token}',
        'Content-Type': content_type,
    })
    try:
        with urllib.request.urlopen(req) as r:
            raw = r.read()
            return json.loads(raw) if raw else {}
    except urllib.error.HTTPError as e:
        detail = e.read().decode(errors='replace')
        sys.exit(f'HTTP {e.code} en {method} {url}\n{detail}')


def main() -> None:
    if len(sys.argv) < 2 or sys.argv[1] not in ('check', 'upload'):
        sys.exit(__doc__)
    token = access_token()

    # Toda operación pasa por un "edit", una transacción que solo tiene efecto
    # al hacer commit. `check` abre uno y lo borra: si eso funciona, la service
    # account tiene acceso a la app.
    edit = call('POST', f'{API}/applications/{PACKAGE}/edits', token)
    edit_id = edit['id']

    if sys.argv[1] == 'check':
        call('DELETE', f'{API}/applications/{PACKAGE}/edits/{edit_id}', token)
        print(f'OK: la service account tiene acceso a {PACKAGE}')
        return

    aab = Path(sys.argv[2])
    if not aab.is_file():
        sys.exit(f'No existe {aab}')
    release = '--release' in sys.argv[3:]

    print(f'Subiendo {aab.name} ({aab.stat().st_size // 2**20} MB)...')
    bundle = call(
        'POST',
        f'{UPLOAD_API}/applications/{PACKAGE}/edits/{edit_id}/bundles?uploadType=media',
        token, aab.read_bytes(), 'application/octet-stream',
    )
    version = bundle['versionCode']
    print(f'  versionCode {version} aceptado por Play')

    call('PUT', f'{API}/applications/{PACKAGE}/edits/{edit_id}/tracks/{TRACK}', token, {
        'track': TRACK,
        'releases': [{
            'versionCodes': [str(version)],
            'status': 'completed' if release else 'draft',
        }],
    })
    call('POST', f'{API}/applications/{PACKAGE}/edits/{edit_id}:commit', token)
    estado = 'publicado a verificadores' if release else 'como BORRADOR'
    print(f'Hecho: versionCode {version} en pista {TRACK} {estado}.')


if __name__ == '__main__':
    import urllib.parse  # usado en access_token
    main()
