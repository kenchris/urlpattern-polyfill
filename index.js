import { URLPattern } from "./dist/url-pattern.js";

export { URLPattern };

if (!globalThis.URLPattern) {
  globalThis.URLPattern = URLPattern;
}
