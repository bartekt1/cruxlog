// Puts the symbol tables of the app's native libraries (maps, database) into the store bundle, so Google Play can show
// readable native crash reports. Play warned that the bundle has native code without debug symbols. The download is not bigger.
const { withAppBuildGradle } = require('expo/config-plugins');

const MARK = "debugSymbolLevel 'SYMBOL_TABLE'";

module.exports = function withNativeDebugSymbols(config) {
  return withAppBuildGradle(config, (cfg) => {
    const gradle = cfg.modResults.contents;
    if (gradle.includes(MARK)) return cfg;
    const at = gradle.indexOf('defaultConfig {');
    if (at < 0) throw new Error('withNativeDebugSymbols: no defaultConfig block in app/build.gradle');
    const end = at + 'defaultConfig {'.length;
    cfg.modResults.contents = `${gradle.slice(0, end)}\n        ndk { ${MARK} }${gradle.slice(end)}`;
    return cfg;
  });
};
