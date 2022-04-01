import "../dist/index.mjs";
import  test  from "ava";

const baseURL = 'https://example.com';


test('urlPattern', t => {
  let pattern = new URLPattern({baseURL, pathname: '/product/*?'});
  t.true(pattern.test(baseURL + '/product/a/b'));
});