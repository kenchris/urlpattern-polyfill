URLPattern polyfills
===

URLPattern is a new web API for matching URLs. Its intended to both provide a convenient API for web developers and to be usable in other web APIs that need to match URLs; e.g. service workers. The [explainer](https://github.com/wanderview/service-worker-scope-pattern-matching/blob/master/explainer.md) discusses the motivating use cases. There is also a [design document](https://docs.google.com/document/d/17L6b3zlTHtyxQvOAvbK55gQOi5rrJLERwjt_sKXpzqc/edit#) that goes into more details.

This is a polyfill for the URLPattern and URLPatternList API currently in development in Chromium based browsers. A specification has not been written yet, but this follows the C++ implementation as well as possible and incorporates and passes the same test suite.

Once the initial Chromium prototype is complete we will gather feedback and iterate. When we believe the API is stable, we will then codify it in a spec.

Learn more
===

- [Explainer](https://github.com/wanderview/service-worker-scope-pattern-matching/blob/master/explainer.md)
- [Design Document](https://docs.google.com/document/d/17L6b3zlTHtyxQvOAvbK55gQOi5rrJLERwjt_sKXpzqc/edit#)

Reporting a security issue
===
If you have information about a security issue or vulnerability with an Intel-maintained open source project on https://github.com/intel, please send an e-mail to secure@intel.com. Encrypt sensitive information using our PGP public key. For issues related to Intel products, please visit https://security-center.intel.com.
