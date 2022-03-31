if (!globalThis.URLPattern) {
  const { URLPattern } = await import("./index.raw.js");
  globalThis.URLPattern = URLPattern;
}

const URLPattern = globalThis.URLPattern;
export { URLPattern }