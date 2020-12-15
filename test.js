import test from 'ava';
import {URLPattern, URLPatternList} from './dist/index.js';

const baseURL = 'https://example.com';

test('urlPattern', t => {
  let pattern = new URLPattern({ baseURL, pathname: '/product/*?' });
  t.true(pattern.test(baseURL + '/product/a/b'));
});

test('JavaScript URL routing 1/2', t => {
  const imagePattern = new URLPattern({
    pathname: '/*.:imagetype(jpg|png|gif)'
  });

  let result = imagePattern.exec("https://example.com/images/flower.jpg");
  t.true(result.pathname.groups['imagetype'] === "jpg");

  result = imagePattern.test("https://example.com/images/thumbs/flower.avif");
  t.false(result);

  result = imagePattern.exec("https://example.com/images/thumbs/flower.png");
  t.true(result.pathname.groups['imagetype'] === "png"); 
});
