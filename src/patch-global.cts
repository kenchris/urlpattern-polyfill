import { URLPattern } from "./url-pattern.cjs";

if (!globalThis.URLPattern) {
  globalThis.URLPattern = URLPattern;
}