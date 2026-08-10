/**
 * Config plugin: inyecta la configuración de firma de release de Android.
 *
 * `android/` es una carpeta generada y gitignorada, así que editar
 * `android/app/build.gradle` a mano no sirve: el siguiente
 * `expo prebuild --clean` lo borra y el build de release se firmaría con la
 * clave de debug sin avisar. Esto lo aplica en cada prebuild, así que el AAB
 * firmado es reproducible desde el repo.
 *
 * El keystore NO vive aquí. Se lee del entorno, de modo que no puede colarse en
 * un commit:
 *
 *     source ~/.android-signing/ingles.env
 *     export INGLES_KEYSTORE INGLES_KEY_ALIAS INGLES_KEYSTORE_PASSWORD
 *
 * Si las variables no están definidas, `storeFile` apunta a /dev/null y Gradle
 * falla con un error claro en vez de producir un AAB inservible.
 */
const { withAppBuildGradle } = require('@expo/config-plugins');

const SIGNING_CONFIG = `
        inglesUpload {
            storeFile file(System.getenv("INGLES_KEYSTORE") ?: "/dev/null")
            storePassword System.getenv("INGLES_KEYSTORE_PASSWORD")
            keyAlias System.getenv("INGLES_KEY_ALIAS")
            keyPassword System.getenv("INGLES_KEYSTORE_PASSWORD")
        }`;

module.exports = function withAndroidUploadSigning(config) {
  return withAppBuildGradle(config, (cfg) => {
    let gradle = cfg.modResults.contents;

    if (gradle.includes('inglesUpload')) {
      return cfg;
    }

    // 1. Declarar el signingConfig junto al de debug.
    if (!gradle.includes('signingConfigs {')) {
      throw new Error(
        'withAndroidUploadSigning: no encuentro el bloque signingConfigs en app/build.gradle',
      );
    }
    gradle = gradle.replace(
      /signingConfigs \{/,
      `signingConfigs {${SIGNING_CONFIG}`,
    );

    // 2. Que release lo use en vez de la clave de debug.
    const releaseUsesDebug = /(buildTypes \{[\s\S]*?release \{[\s\S]*?signingConfig )signingConfigs\.debug/;
    if (!releaseUsesDebug.test(gradle)) {
      throw new Error(
        'withAndroidUploadSigning: release no usa signingConfigs.debug; revisa la plantilla de Expo',
      );
    }
    gradle = gradle.replace(releaseUsesDebug, '$1signingConfigs.inglesUpload');

    cfg.modResults.contents = gradle;
    return cfg;
  });
};
