URLPattern polyfills
===

URLPattern is a new web API for matching URLs. Its intended to both provide a convenient API for web developers and to be usable in other web APIs that need to match URLs; e.g. service workers. The [explainer](https://github.com/wanderview/service-worker-scope-pattern-matching/blob/master/explainer.md) discusses the motivating use cases. There is also a [design document](https://docs.google.com/document/d/17L6b3zlTHtyxQvOAvbK55gQOi5rrJLERwjt_sKXpzqc/edit#) that goes into more details.

This is a polyfill for the URLPattern and URLPatternList API currently in development in Chromium based browsers. A specification has not been written yet, but this follows the C++ implementation as well as possible and incorporates and passes the same test suite.

Once the initial Chromium prototype is complete we will gather feedback and iterate. When we believe the API is stable, we will then codify it in a spec.

Basic example
---

```javascript
let p = new URLPattern({ pathname: '/foo/:name });

let r = p.exec('https://example.com/foo/bar');
console.log(r.pathname.input); // "/foo/bar"
console.log(r.pathname.groups.name); // "bar"

let r2 = p.exec({ pathname: '/foo/baz' });
console.log(r2.pathname.groups.name); // "baz"
```

Example of matching same-origin JPG or PNG requests
---

```javascript
// Match same-origin jpg or png URLs.
// Note: This uses a named group to make it easier to access
//       the result later.
const p = new URLPattern({
  pathname: '/*.:filetype(jpg|png)',
  baseURL: self.location
});

for (let url in url_list) {
  const r = p.exec(url);

  // skip non-matches
  if (!r) {
    continue;
  }

  if (r.pathname.groups['filetype'] === 'jpg') {
    // process jpg
  } else if (r.pathname.groups['filetype'] === 'png') {
    // process png
  }
}
```

The pattern in this case can be made simpler without the origin check by leaving off the baseURL.

```javascript
// Match any URL ending with 'jpg' or 'png'.
const p = new URLPattern({ pathname: '/*.:filetype(jpg|png)' });
```

Example of Short Form Support
---
We are planning to also support a "short form" for initializing URLPattern objects.
This is supported by the polyfill but not yet by the Chromium implementation.

For example:

```javascript
const p = new URLPattern("https://*.example.com/foo/*");
```

Or:

```javascript
const p = new URLPattern("foo/*", self.location);
```

API reference
===

API overview with typeScript type annotations is found below. Associated browser Web IDL can be found [here](https://source.chromium.org/chromium/chromium/src/+/master:third_party/blink/renderer/modules/url_pattern/).

```ts
class URLPattern {
  constructor(init: URLPatternInit);
  constructor(shortPattern: string, baseURL: string = ""));

  test(input: URLPattern | string): boolean;
  exec(input: URLPattern | string): URLPatternResult;
};

interface URLPatternInit {
  baseURL?: string;
  username?: string;
  password?: string;
  protocol?: string;
  hostname?: string;
  port?: string;
  pathname?: string;
  search?: string;
  hash?: string;
}

interface URLPatterncomponentResult {
  input: string;
  groups: { [key: string]: string };
}

interface URLPatternResult {
  input: URLPatternInit | string;

  protocol: URLPatterncomponentResult;
  username: URLPatterncomponentResult;
  password: URLPatterncomponentResult;
  hostname: URLPatterncomponentResult;
  port: URLPatterncomponentResult;
  pathname: URLPatterncomponentResult;
  search: URLPatterncomponentResult;
  hash: URLPatterncomponentResult;
}
```

Learn more
===

- [Explainer](https://github.com/wanderview/service-worker-scope-pattern-matching/blob/master/explainer.md)
- [Design Document](https://docs.google.com/document/d/17L6b3zlTHtyxQvOAvbK55gQOi5rrJLERwjt_sKXpzqc/edit#)

Reporting a security issue
===
If you have information about a security issue or vulnerability with an Intel-maintained open source project on https://github.com/intel, please send an e-mail to secure@intel.com. Encrypt sensitive information using our PGP public key. For issues related to Intel products, please visit https://security-center.intel.com.
