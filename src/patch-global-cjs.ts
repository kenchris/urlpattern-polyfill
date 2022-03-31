import { URLPattern } from "./index.impl.cjs";

if (!globalThis.URLPattern) {
  globalThis.URLPattern = URLPattern;
}