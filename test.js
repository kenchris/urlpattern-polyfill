import test from 'ava';
import {URLPattern, URLPatternList, parseShorthand} from './dist/index.js';

const baseURL = 'https://example.com';

test('shorthands 1', t => {
  let {protocol, hostname, pathname, search, hash} = parseShorthand('https://google.com/*:hest?/?q=s#hash');

  t.is(protocol, 'https');
  t.is(hostname, 'google.com');
  t.is(pathname, '*:hest?/');
  t.is(search, 'q=s');
  t.is(hash, 'hash');
});

test('shorthands 2', t => {
  let {protocol, hostname, pathname, search, hash} = parseShorthand('https://google.com/foo/*?/?q=s#hash');

  t.is(protocol, 'https');
  t.is(hostname, 'google.com');
  t.is(pathname, 'foo/*?/');
  t.is(search, 'q=s');
  t.is(hash, 'hash');
});

test('shorthands 3', t => {
  let {protocol, hostname, pathname, search, hash} = parseShorthand('https://google.com/bar/(.*)?/?q=s#hash');

  t.is(protocol, 'https');
  t.is(hostname, 'google.com');
  t.is(pathname, 'bar/(.*)?/');
  t.is(search, 'q=s');
  t.is(hash, 'hash');
});

test('shorthands 4', t => {
  let {protocol, hostname, pathname, search, hash} = parseShorthand('/product/:type*');

  t.is(protocol, '');
  t.is(hostname, '');
  t.is(pathname, '/product/:type*');
  t.is(search, '');
  t.is(hash, '');
});

test('urlPattern', t => {
  let pattern = new URLPattern({baseURL, pathname: '/product/*?'});
  t.true(pattern.test(baseURL + '/product/a/b'));
});

test('JavaScript URL routing 1/2', t => {
  const imagePattern = new URLPattern({
    pathname: '/*.:imagetype(jpg|png|gif)',
  });

  let result = imagePattern.exec('https://example.com/images/flower.jpg');
  t.is(result.pathname.groups['imagetype'], 'jpg');

  result = imagePattern.test('https://example.com/images/thumbs/flower.avif');
  t.false(result);

  result = imagePattern.exec('https://example.com/images/thumbs/flower.png');
  t.is(result.pathname.groups['imagetype'], 'png');
});

test('JavaScript URL routing 2/2', t => {
  const apiPattern = new URLPattern({
    pathname: '/api/:product/:param?',
  });

  let result = apiPattern.exec(baseURL + '/api/videos/12');

  t.is(result.pathname.groups['product'], 'videos');
  t.is(result.pathname.groups['param'], '12');
});
