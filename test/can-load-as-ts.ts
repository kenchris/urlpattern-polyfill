require("urlpattern-polyfill");
const test = require("ava");

const baseURL = "https://example.com";

test("urlPattern", (t) => {
  let pattern = new URLPattern({ baseURL, pathname: "/product/*?" });
  t.true(pattern.test(baseURL + "/product/a/b"));
});

test("exports urlPattern", (t) => {
  const { URLPattern } = require("urlpattern-polyfill");
  t.true(typeof URLPattern === "function");
});
