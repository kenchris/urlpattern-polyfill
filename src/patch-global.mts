import { URLPattern } from "./url-pattern";
export { URLPattern };

if (!globalThis.URLPattern) {
  globalThis.URLPattern = URLPattern;
}
