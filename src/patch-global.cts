const {URLPattern} = require("./url-pattern.cjs");

if (!globalThis.URLPattern) {
  globalThis.URLPattern = URLPattern;
}
