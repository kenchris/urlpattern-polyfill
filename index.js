import { URLPattern } from "./dist/pony.js";

export { URLPattern };

if (!globalThis.URLPattern) {
  globalThis.URLPattern = URLPattern;
}
