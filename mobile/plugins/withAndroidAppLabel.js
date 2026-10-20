/**
 * Config plugin: nombre visible bajo el icono en Android.
 *
 * `expo.name` es «TutorInglesIA», sin espacios ni tilde, a propósito: de él sale
 * el nombre del proyecto de Xcode (ver IOS.md). En iOS el nombre visible lo pone
 * CFBundleDisplayName, pero en Android `app_name` sale de `expo.name` y el
 * launcher mostraba «TutorInglesIA». Esto lo sustituye en strings.xml en cada
 * prebuild, sin tocar `expo.name`.
 */
const { withStringsXml, AndroidConfig } = require('@expo/config-plugins');

module.exports = function withAndroidAppLabel(config, label = 'Tutor Inglés IA') {
  return withStringsXml(config, (cfg) => {
    cfg.modResults = AndroidConfig.Strings.setStringItem(
      [AndroidConfig.Resources.buildResourceItem({ name: 'app_name', value: label })],
      cfg.modResults,
    );
    return cfg;
  });
};
