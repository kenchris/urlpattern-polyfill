if (!globalThis.URLPattern) {
  const {URLPattern} = require("./url-pattern.cjs");
  globalThis.URLPattern = URLPattern;
}

exports.URLPattern = URLPattern;
