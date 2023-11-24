import test from "ava";
import "urlpattern-polyfill";

test("URLPattern.hasRegExpGroups", t => {
  const assert_true = (actual, msg) => t.true(actual, msg);
  const assert_false = (actual, msg) => t.false(actual, msg);

  assert_true('hasRegExpGroups' in URLPattern.prototype, "hasRegExpGroups is not implemented");
  assert_false(new URLPattern({}).hasRegExpGroups, "match-everything pattern");
  for (let component of ['protocol', 'username', 'password', 'hostname', 'port', 'pathname', 'search', 'hash']) {
    assert_false(new URLPattern({[component]: '*'}).hasRegExpGroups, `wildcard in ${component}`);
    assert_false(new URLPattern({[component]: ':foo'}).hasRegExpGroups, `segment wildcard  in ${component}`);
    assert_false(new URLPattern({[component]: ':foo?'}).hasRegExpGroups, `optional segment wildcard  in ${component}`);
    assert_true(new URLPattern({[component]: ':foo(hi)'}).hasRegExpGroups, `named regexp group in ${component}`);
    assert_true(new URLPattern({[component]: '(hi)'}).hasRegExpGroups, `anonymous regexp group in ${component}`);
    if (component !== 'protocol' && component !== 'port') {
      // These components are more narrow in what they accept in any case.
      assert_false(new URLPattern({[component]: 'a-{:hello}-z-*-a'}).hasRegExpGroups, `wildcards mixed in with fixed text and wildcards in ${component}`);
      assert_true(new URLPattern({[component]: 'a-(hi)-z-(lo)-a'}).hasRegExpGroups, `regexp groups mixed in with fixed text and wildcards in ${component}`);
    }
  }
  assert_false(new URLPattern({pathname: '/a/:foo/:baz?/b/*'}).hasRegExpGroups, "complex pathname with no regexp");
  assert_true(new URLPattern({pathname: '/a/:foo/:baz([a-z]+)?/b/*'}).hasRegExpGroups, "complex pathname with regexp");
});