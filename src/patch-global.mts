import { URLPattern } from "./url-pattern";

if (!globalThis.URLPattern) {
  globalThis.URLPattern = URLPattern;
}