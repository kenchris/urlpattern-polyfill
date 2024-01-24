import type * as Types from "./types.js";
export { URLPattern } from "./types.js";

declare global {
  class URLPattern extends Types.URLPattern {}
  type URLPatternArgs = Types.URLPatternArgs;
  type URLPatternInit = Types.URLPatternInit;
  type URLPatternResult = Types.URLPatternResult;
  type URLPatternComponentResult = Types.URLPatternComponentResult;
}
