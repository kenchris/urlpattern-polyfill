import { URLPattern } from "./url-pattern.mjs";

if (!globalThis.URLPattern) {
  globalThis.URLPattern = URLPattern;
}