# Aprende Inglés con IA — App nativa Android

**Paquete:** `com.spinedab.ingles`
**Tipo:** Capacitor wrap + AAB firmado (clave SpineDab) · targetSdk 35
**AAB release:** `dist/*-release.aab`

**Web pública:** https://spinedab.github.io/INGLES/

## Descripción
Webapp + tutor IA para aprender inglés.

## Compilar AAB
```bash
cd mobile
npm install
npx cap sync android
cd android && ./gradlew bundleRelease
# salida: android/app/build/outputs/bundle/release/app-release.aab
```
