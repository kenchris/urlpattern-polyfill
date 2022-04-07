
export const {URLPattern} = require("./url-pattern");

if (!globalThis.URLPattern) {
  globalThis.URLPattern = URLPattern;
}