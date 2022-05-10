const { URLPattern } = require("./dist/url-pattern.cjs");

module.exports = { URLPattern };

if (!globalThis.URLPattern) {
  globalThis.URLPattern = URLPattern;
}
