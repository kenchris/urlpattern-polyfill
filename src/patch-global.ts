import { URLPattern } from "./index.impl.js";

if (!globalThis.URLPattern) {
  globalThis.URLPattern = URLPattern;
}