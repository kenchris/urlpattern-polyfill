import test from 'ava';
import {readFileSync} from 'fs';
import {URLPattern} from './dist/index.js';

const baseURL = 'https://example.com';
/*
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
*/

let rawdata = readFileSync('urlpatterntestdata.json');
let data = JSON.parse(rawdata);
let i = 0;

for (let entry of data) {
  test(`Test data ${i++}: Pattern: ${JSON.stringify(entry.pattern)} Input: ${JSON.stringify(entry.input)}`, t => {
    if (entry.error) {
      t.throws(_ => new URLPattern(entry.pattern), {instanceOf: TypeError});
      return;
    }

    const pattern = new URLPattern(entry.pattern);

    // First, validate the test() method by converting the expected result to
    // a truthy value.
    t.is(pattern.test(entry.input), !!entry.expected, 'test() result');

    // Next, start validating the exec() method.
    const result = pattern.exec(entry.input);

    // On a failed match exec() returns null.
    if (!entry.expected) {
      t.is(result, entry.expected, 'exec() failed match result');
      return;
    }

    // Next verify the result.input is correct.  This may be a structured
    // URLPatternInit dictionary object or a URL string.
    if (typeof entry.expected.input === 'object') {
      t.deepEqual(result.input, entry.expected.input,
                            'exec() result.input');
    } else {
      t.is(result.input, entry.expected.input,
                    'exec() result.input');
    }

    // Next we will compare the URLPatternComponentResult for each of these
    // expected components.
    const component_list = [
      'protocol',
      'username',
      'password',
      'hostname',
      'password',
      'pathname',
      'search',
      'hash',
    ];

    for (let component of component_list) {
      let expected_obj = entry.expected[component];

      // If the test expectations don't include a component object, then
      // we auto-generate one.  This is convenient for the many cases
      // where the pattern has a default wildcard or empty string pattern
      // for a component and the input is essentially empty.
      if (!expected_obj) {
        expected_obj = { input: '', groups: {} };

        // Next, we must treat default wildcards differently than empty string
        // patterns.  The wildcard results in a capture group, but the empty
        // string pattern does not.  The expectation object must list which
        // components should be empty instead of wildcards in
        // |exactly_empty_components|.
        if (!entry.expected.exactly_empty_components ||
            !entry.expected.exactly_empty_components.includes(component)) {
          expected_obj.groups['0'] = '';
        }
      }
      t.deepEqual(result[component], expected_obj, `exec() result for ${component}`);
    }
  });
}