import type * as Types from "./types";

declare global {
  class URLPattern extends Types.URLPattern {}
  type URLPatternInit = Types.URLPatternInit;
  type URLPatternResult = Types.URLPatternResult;
  type URLPatternComponentResult = Types.URLPatternComponentResult;
}
