const test = require("ava");
const { URLPattern } = require("urlpattern-polyfill/pony");

const baseURL = "https://example.com";

test("urlPattern", (t) => {
  let pattern = new URLPattern({ baseURL, pathname: "/product/*?" });
  t.true(pattern.test(baseURL + "/product/a/b"));
});

test("does not pollute global scope", (t) => {
  t.true(typeof globalThis.URLPattern === "undefined");
});
