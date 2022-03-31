if (!globalThis.URLPattern) {
  const { URLPattern } = require("./index.raw.cjs");
  globalThis.URLPattern = URLPattern;
}

exports.URLPattern = globalThis.URLPattern;