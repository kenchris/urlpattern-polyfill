import { parseShorthand } from './parseShorthand';
import { ParseOptions, pathToRegexp, TokensToRegexpOptions } from './path-to-regex-6.2';
import { URLPatternComponentResult, URLPatternInit, URLPatternValues } from './url-pattern.interfaces';
import {
  canonicalizeHash,
  canonicalizeHostname,
  canonicalizePassword,
  canonicalizePathname,
  canonicalizePort,
  canonicalizeProtocol,
  canonicalizeSearch,
  canonicalizeUsername,
  defaultPortForProtocol,
  isAbsolutePathname
} from './url-utils';

// The default wildcard pattern used for a component when the constructor
// input does not provide an explicit value.
const DEFAULT_PATTERN = '(.*)';
// The default wildcard pattern for the pathname component.
const DEFAULT_PATHNAME_PATTERN = '/(.*)';
// default to strict mode and case sensitivity.  In addition, most
// components have no concept of a delimiter or prefix character.
const DEFAULT_OPTIONS: TokensToRegexpOptions & ParseOptions = {
  delimiter: '',
  prefixes: '',
  sensitive: true,
  strict: true,
};
// The options to use for hostname patterns.  This uses a
// "." delimiter controlling how far a named group like ":bar" will match
// by default.  Note, hostnames are case insensitive but we require case
// sensitivity here.  This assumes that the hostname values have already
// been normalized to lower case as in URL().
const HOSTNAME_OPTIONS: TokensToRegexpOptions & ParseOptions = {
  delimiter: '.',
  prefixes: '',
  sensitive: true,
  strict: true,
};
// The options to use for pathname patterns.  This uses a
// "/" delimiter controlling how far a named group like ":bar" will match
// by default.  It also configures "/" to be treated as an automatic
// prefix before groups.
const PATHNAME_OPTIONS: TokensToRegexpOptions & ParseOptions = {
  delimiter: '/',
  prefixes: '/',
  sensitive: true,
  strict: true,
};

function extractValues(url: string): URLPatternInit {
  const o = new URL(url); // May throw.
  return {
    protocol: o.protocol.substring(0, o.protocol.length - 1),
    username: o.username,
    password: o.password,
    hostname: o.hostname,
    port: o.port,
    pathname: o.pathname,
    search: o.search != '' ? o.search.substring(1, o.search.length) : undefined,
    hash: o.hash != '' ? o.hash.substring(1, o.hash.length) : undefined,
  };
}
// A utility method that takes a URLPatternInit, splits it apart, and applies
// the individual component values in the given set of strings.  The strings
// are only applied if a value is present in the init structure.
function applyInit(o: URLPatternValues, init: URLPatternInit, isPattern: boolean): URLPatternValues {
  // If there is a baseURL we need to apply its component values first.  The
  // rest of the URLPatternInit structure will then later override these
  // values.  Note, the baseURL will always set either an empty string or
  // longer value for each considered component.  We do not allow null strings
  // to persist for these components past this phase since they should no
  // longer be treated as wildcards.
  let baseURL;
  if (init.baseURL) {
    try {
      baseURL = new URL(init.baseURL);
      o.protocol = baseURL.protocol ? baseURL.protocol.substring(0, baseURL.protocol.length - 1) : '';
      o.username = baseURL.username;
      o.password = baseURL.password;
      o.hostname = baseURL.hostname;
      o.port = baseURL.port;
      o.pathname = baseURL.pathname ? baseURL.pathname : '/';
      // Do no propagate search or hash from the base URL.  This matches the
      // behavior when resolving a relative URL against a base URL.
    } catch {
      throw new TypeError(`Invalid baseURL '${init.baseURL}'.`);
    }
  }

  // Apply the URLPatternInit component values on top of the default and
  // baseURL values.
  if (init.protocol)
    o.protocol = canonicalizeProtocol(init.protocol, isPattern);
  if (init.username)
    o.username = canonicalizeUsername(init.username, isPattern);
  if (init.password)
    o.password = canonicalizePassword(init.password, isPattern);
  if (init.hostname)
    o.hostname = canonicalizeHostname(init.hostname, isPattern);
  if (init.port)
    o.port = canonicalizePort(init.port, isPattern);

  if (init.pathname) {
    o.pathname = init.pathname;
    if (baseURL && !isAbsolutePathname(o.pathname, isPattern)) {
      // FIXME: is hierarchical
      // Find the last slash in the baseURL pathname.  Since the URL is
      // hierarchical it should have a slash to be valid, but we are cautious
      // and check.  If there is no slash then we cannot use resolve the
      // relative pathname and just treat the init pathname as an absolute
      // value.
      const slashIndex = baseURL.pathname.lastIndexOf('/');
      if (slashIndex >= 0) {
        // Extract the baseURL path up to and including the first slash.  Append
        // the relative init pathname to it.
        o.pathname = baseURL.pathname.substring(0, slashIndex + 1) + o.pathname;
      }

      //o.pathname = new URL(o.pathname, init.baseURL).pathname;
    }
    o.pathname = canonicalizePathname(o.pathname, isPattern);
  }
  if (init.search)
    o.search = canonicalizeSearch(init.search, isPattern);
  if (init.hash)
    o.hash = canonicalizeHash(init.hash, isPattern);

  return o;
}

export class URLPattern {
  private pattern: URLPatternValues;
  private regexp: any = {};
  private keys: any = {};

  constructor(...args: any) {
    let init: URLPatternInit;

    if (typeof args[0] === 'object') {
      init = args[0];
    }

    // shorthand
    else if (typeof args[0] === 'string') {
      init = parseShorthand(args[0]);
      if (args[1]) {
        if (typeof args[1] === 'string') {
          init.baseURL = args[1];
        } else {
          throw new TypeError();
        }
      }
    }

    // invalid arguments
    else {
      throw new TypeError('Incorrect params passed');
    }

    const defaults = {
      pathname: DEFAULT_PATHNAME_PATTERN,
      protocol: DEFAULT_PATTERN,
      username: DEFAULT_PATTERN,
      password: DEFAULT_PATTERN,
      hostname: DEFAULT_PATTERN,
      port: DEFAULT_PATTERN,
      search: DEFAULT_PATTERN,
      hash: DEFAULT_PATTERN,
    };

    this.pattern = applyInit(defaults, init, true);

    for (let component in this.pattern) {
      let options;
      const pattern = this.pattern[component];
      this.keys[component] = [];
      switch (component) {
        case 'hostname':
          options = HOSTNAME_OPTIONS;
          break;
        case 'pathname':
          options = PATHNAME_OPTIONS;
          break;
        default:
          options = DEFAULT_OPTIONS;
      }
      try {
        // @ts-ignore
        this.regexp[component] = pathToRegexp(pattern, this.keys[component], options);
      } catch {
        // If a pattern is illegal the constructor will throw an exception
        throw new TypeError(`Invalid ${component} pattern '${this.pattern[component]}'.`);
      }
    }
  }

  test(input: string) {
    let values: URLPatternValues = {};

    if (typeof input === 'undefined') {
      return false;
    }

    try {
      if (typeof input === 'object') {
        values = applyInit(values, input, false);
      } else {
        values = applyInit(values, extractValues(input), false); // allows string or URL object.
      }
    } catch {
      return false;
    }

    for (let component in this.pattern) {
      let match;
      let portMatchFix = component == 'port' && values.protocol && values.port === defaultPortForProtocol(values.protocol);
      if (portMatchFix) {
        // @ts-ignore
        match = this.regexp[component].exec('');
      } else {
        const fallback = component == 'pathname' ? '/' : '';
        // @ts-ignore
        match = this.regexp[component].exec(values[component] || fallback);
      }

      if (!match) {
        return false;
      }
    }

    return true;
  }

  exec(input: string | URLPatternInit): URLPatternComponentResult | null | undefined {
    let values: URLPatternValues = {};

    if (typeof input === 'undefined') {
      return;
    }

    try {
      if (typeof input === 'object') {
        values = applyInit(values, input, false);
      } else {
        values = applyInit(values, extractValues(input), false); // allows string or URL object.
      }
    } catch {
      return null;
    }

    let result: URLPatternComponentResult | null = null;
    for (let component in this.pattern) {
      let match;
      let portMatchFix = component == 'port' && values.protocol && values.port === defaultPortForProtocol(values.protocol);
      if (portMatchFix) {
        // @ts-ignore
        match = this.regexp[component].exec('');
      } else {
        const fallback = component == 'pathname' ? '/' : '';
        // @ts-ignore
        match = this.regexp[component].exec(values[component] || fallback);
      }

      let groups = {} as Array<string>;
      if (!match) {
        return null;
      }

      for (let [i, key] of this.keys[component].entries()) {
        if (typeof key.name === 'string' || typeof key.name === 'number') {
          let value = match[i + 1];
          groups[key.name] = value || '';
        }
      }

      if (!result)
        result = {};

      result[component] = {
        input: values[component] || '',
        groups,
      };

      result.input = input;
    }

    return result;
  }
}
// -------------

export class URLPatternList {
  private patterns: Array<URLPattern> = [];

  constructor(list: any, options = {}) {
    if (!Array.isArray(list)) {
      throw TypeError('parameter list must be if type URLPattern[]');
    }

    const firstItem = list[0];
    if (firstItem instanceof URLPattern) {
      for (let pattern of list) {
        if (!(pattern instanceof URLPattern)) {
          throw TypeError('parameter list must be if type URLPattern[]');
        }
        this.patterns.push(pattern);
      }
    } else {
      try {
        for (let patternInit of list) {
          let init = {};
          if (typeof patternInit === 'object') {
            init = Object.assign(Object.assign({}, options), patternInit);
          } else if (typeof patternInit === 'string') {
            init = Object.assign(Object.assign({}, options), parseShorthand(patternInit));
          } else {
            throw new TypeError('List contains no parsable information');
          }

          this.patterns.push(new URLPattern(init));
        }
      } catch {
        throw new TypeError('List contains no parsable information');
      }
    }
  }

  test(url: string) {
    try {
      new URL(url); // allows string or URL object.
    } catch {
      return false;
    }

    for (let urlPattern of this.patterns) {
      if (urlPattern.test(url)) {
        return true;
      }
    }
    return false;
  }

  exec(url: string): URLPatternComponentResult | null | number {
    try {
      new URL(url); // allows string or URL object.
    } catch {
      return null;
    }

    for (let urlPattern of this.patterns) {
      const value = urlPattern.exec(url);
      if (value) {
        return value;
      }
    }
    return null;
  }
}
