import "urlpattern-polyfill";
import test from "ava";

const baseURL = "https://example.com";

test("urlPattern", (t) => {
  let pattern = new URLPattern({ baseURL, pathname: "/product/*?" });
  t.true(pattern.test(baseURL + "/product/a/b"));
});

test("export of urlPattern there?", async (t) => {
  /** overwrite global wil local version imported, so we know the export is in place */
  const { URLPattern } = await import("urlpattern-polyfill");
  let pattern = new URLPattern({ baseURL, pathname: "/product/*?" });
  t.true(pattern.test(baseURL + "/product/a/b"));
});
