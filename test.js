import test from 'ava';
import {URLPattern, URLPatternList} from './dist/index.js';

// console.log(new URLPattern())

const baseURL = 'https://test'

test('demo passing test', t => {
  t.pass();
});

test('urlPattern', t => {
  let pattern = new URLPattern({baseURL, pathname:'/product'});

  // t.true(pattern.test(baseURL + '/product/a/b'));
  t.pass()
});
