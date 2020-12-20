import {parseShorthand} from './parseShorthand';
import {ParseOptions, pathToRegexp, TokensToRegexpOptions} from './path-to-regex-6.2';
import {URLPatternResult, URLPatternInit, URLPatternKeys} from './url-pattern.interfaces';
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
  isAbsolutePathname,
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
  if (typeof url !== "string") {
    throw new TypeError(`parameter 1 is not of type 'string'.`);
  }
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
function applyInit(o: URLPatternInit, init: URLPatternInit, isPattern: boolean): URLPatternInit {
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
      throw new TypeError(`invalid baseURL '${init.baseURL}'.`);
    }
  }

  // Apply the URLPatternInit component values on top of the default and
  // baseURL values.
  if (init.protocol) o.protocol = canonicalizeProtocol(init.protocol, isPattern);
  if (init.username) o.username = canonicalizeUsername(init.username, isPattern);
  if (init.password) o.password = canonicalizePassword(init.password, isPattern);
  if (init.hostname) o.hostname = canonicalizeHostname(init.hostname, isPattern);
  if (init.port) o.port = canonicalizePort(init.port, isPattern);

  if (init.pathname) {
    o.pathname = init.pathname;
    if (baseURL && !isAbsolutePathname(o.pathname, isPattern)) {
      // Find the last slash in the baseURL pathname.  Since the URL is
      // hierarchical it should have a slash to be valid, but we are cautious
      // and check.  If there is no slash then we cannot use resolve the
      // relative pathname and just treat the init pathname as an absolute
      // value.
      const slashIndex = baseURL.pathname.lastIndexOf('/');
      if (slashIndex >= 0) {
        // Extract the baseURL path up to and including the first slash.
        // Append the relative init pathname to it.
        o.pathname = baseURL.pathname.substring(0, slashIndex + 1) + o.pathname;
      }
    }
    o.pathname = canonicalizePathname(o.pathname, isPattern);
  }
  if (init.search) o.search = canonicalizeSearch(init.search, isPattern);
  if (init.hash) o.hash = canonicalizeHash(init.hash, isPattern);

  return o;
}

export class URLPattern {
  private pattern: URLPatternInit;
  private regexp: any = {};
  private keys: any = {};

  constructor(init: URLPatternInit | string, baseURL?: string) {
    try {
      // shorthand
      if (typeof init === 'string') {
        init = parseShorthand(init);
        if (baseURL) {
          if (typeof baseURL === 'string') {
            init.baseURL = baseURL;
          } else {
            throw new TypeError(`'baseURL' parameter is not of type 'string'.`);
          }
        }
      }
      // no or invalid arguments
      if (!init || typeof init !== 'object') {
        throw new TypeError(`parameter 1 is not of type 'string' and cannot convert to dictionary.`);
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
      let component: URLPatternKeys;
      for (component in this.pattern) {
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
          this.regexp[component] = pathToRegexp(pattern as string, this.keys[component], options);
        } catch {
          // If a pattern is illegal the constructor will throw an exception
          throw new TypeError(`invalid ${component} pattern '${this.pattern[component]}'.`);
        }
      }
    } catch (err) {
      throw new TypeError(`Failed to construct 'URLPattern': ${err.message}`);
    }
  }

  test(input: string) {
    let values: URLPatternInit = {};

    if (typeof input === 'undefined') {
      return false;
    }

    try {
      if (typeof input === 'object') {
        values = applyInit(values, input, false);
      } else {
        values = applyInit(values, extractValues(input), false);
      }
    } catch (err) {
      // Treat exceptions simply as a failure to match.
      console.error(err.message);
      return false;
    }

    let component:URLPatternKeys
    for (component in this.pattern) {
      let match;
      let portMatchFix = component == 'port' && values.protocol && values.port === defaultPortForProtocol(values.protocol);
      if (portMatchFix) {
        match = this.regexp[component].exec('');
      } else {
        const fallback = component == 'pathname' ? '/' : '';
        match = this.regexp[component].exec(values[component] || fallback);
      }

      if (!match) {
        return false;
      }
    }

    return true;
  }

  exec(input: string | URLPatternInit): URLPatternResult | null | undefined {
    let values = {} as URLPatternInit;

    if (typeof input === 'undefined') {
      return;
    }

    try {
      if (typeof input === 'object') {
        values = applyInit(values, input, false);
      } else {
        values = applyInit(values, extractValues(input), false);
      }
    } catch (err) {
      // Treat exceptions simply as a failure to match.
      console.error(err.message);
      return null;
    }

    let result: any = {
      input: input,
    };

    let component: URLPatternKeys;
    for (component in this.pattern) {
      let match;
      let portMatchFix = component == 'port' && values.protocol
        && values.port === defaultPortForProtocol(values.protocol);

      if (portMatchFix) {
        match = this.regexp[component].exec('');
      } else {
        const fallback = component == 'pathname' ? '/' : '';
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

      if (!result) result = {};

      result[component] = {
        input: values[component] || '',
        groups,
      };
    }

    return result;
  }
}