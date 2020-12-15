import test from 'ava';
import {URLPattern, URLPatternList} from './dist/index.js';

const baseURL = 'https://test'

test('demo passing test', t => {
  t.pass();
});

test('urlPattern', t => {
  let pattern = new URLPattern({
    baseURL,
    pathname: '/product/:name*',
  });

  t.true(pattern.test(baseURL + '/product/a/b'));
});
