const { URLPattern } = require("./dist/pony.cjs");

module.exports = { URLPattern };

if (!globalThis.URLPattern) {
  globalThis.URLPattern = URLPattern;
}
