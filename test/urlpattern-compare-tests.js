import test from "ava";
import { readFileSync } from "fs";
import { dirname, resolve } from "path";
import { fileURLToPath } from "url";
import "urlpattern-polyfill";

function runTests(data) {
  for (let entry of data) {
    test(`Component: ${entry.component} ` +
         `Left: ${JSON.stringify(entry.left)} ` +
         `Right: ${JSON.stringify(entry.right)}`, t => {
      const assert_equals = (actual, expected, msg) => t.is(actual, expected, msg);

      const left = new URLPattern(entry.left);
      const right = new URLPattern(entry.right);

      assert_equals(URLPattern.compareComponent(entry.component, left, right), entry.expected);

      // We have to coerce to an integer here in order to avoid asserting
      // that `+0` is `-0`.
      const reverse_expected = ~~(entry.expected * -1);
      assert_equals(URLPattern.compareComponent(entry.component, right, left), reverse_expected, "reverse order");

      assert_equals(URLPattern.compareComponent(entry.component, left, left), 0, "left equality");
      assert_equals(URLPattern.compareComponent(entry.component, right, right), 0, "right equality");
    });
  }
}

let path = fileURLToPath(import.meta.url);
let data = readFileSync(resolve(dirname(path), "urlpattern-compare-test-data.json"));
runTests(JSON.parse(data));
