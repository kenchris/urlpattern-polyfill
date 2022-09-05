import { ParseOptions, parse, Token, tokensToRegexp, TokensToRegexpOptions } from './path-to-regex-modified';
import { URLPatternResult, URLPatternInit, URLPatternKeys } from './url-pattern.interfaces';
import {
  DEFAULT_OPTIONS,
  HOSTNAME_OPTIONS,
  PATHNAME_OPTIONS,
  canonicalizeHash,
  canonicalizeHostname,
  canonicalizePassword,
  canonicalizePathname,
  canonicalizePort,
  canonicalizeProtocol,
  canonicalizeSearch,
  canonicalizeUsername,
  defaultPortForProtocol,
  treatAsIPv6Hostname,
  isAbsolutePathname,
  isSpecialScheme,
  protocolEncodeCallback,
  usernameEncodeCallback,
  passwordEncodeCallback,
  hostnameEncodeCallback,
  ipv6HostnameEncodeCallback,
  portEncodeCallback,
  standardURLPathnameEncodeCallback,
  pathURLPathnameEncodeCallback,
  searchEncodeCallback,
  hashEncodeCallback,
} from './url-utils';
import { Parser } from './url-pattern-parser';

// Define the components in a URL.  The ordering of this constant list is
// signficant to the implementation below.
const COMPONENTS: URLPatternKeys[] = [
  'protocol',
  'username',
  'password',
  'hostname',
  'port',
  'pathname',
  'search',
  'hash',
];

// The default wildcard pattern used for a component when the constructor
// input does not provide an explicit value.
const DEFAULT_PATTERN = '*';

function extractValues(url: string, baseURL?: string): URLPatternInit {
  if (typeof url !== "string") {
    throw new TypeError(`parameter 1 is not of type 'string'.`);
  }
  const o = new URL(url, baseURL); // May throw.
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
  if (typeof init.baseURL === 'string') {
    try {
      baseURL = new URL(init.baseURL);
      o.protocol = baseURL.protocol ? baseURL.protocol.substring(0, baseURL.protocol.length - 1) : '';
      o.username = baseURL.username;
      o.password = baseURL.password;
      o.hostname = baseURL.hostname;
      o.port = baseURL.port;
      o.pathname = baseURL.pathname;
      o.search = baseURL.search ? baseURL.search.substring(1, baseURL.search.length) : '';
      o.hash = baseURL.hash ? baseURL.hash.substring(1, baseURL.hash.length) : '';
    } catch {
      throw new TypeError(`invalid baseURL '${init.baseURL}'.`);
    }
  }

  // Apply the URLPatternInit component values on top of the default and
  // baseURL values.
  if (typeof init.protocol === 'string') {
    o.protocol = canonicalizeProtocol(init.protocol, isPattern);
  }

  if (typeof init.username === 'string') {
    o.username = canonicalizeUsername(init.username, isPattern);
  }

  if (typeof init.password === 'string') {
    o.password = canonicalizePassword(init.password, isPattern);
  }

  if (typeof init.hostname === 'string') {
    o.hostname = canonicalizeHostname(init.hostname, isPattern);
  }

  if (typeof init.port === 'string') {
    o.port = canonicalizePort(init.port, o.protocol, isPattern);
  }

  if (typeof init.pathname === 'string') {
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
    o.pathname = canonicalizePathname(o.pathname, o.protocol, isPattern);
  }

  if (typeof init.search === 'string') {
    o.search = canonicalizeSearch(init.search, isPattern);
  }

  if (typeof init.hash === 'string') {
    o.hash = canonicalizeHash(init.hash, isPattern);
  }

  return o;
}

function escapePatternString(value: string): string {
  return value.replace(/([+*?:{}()\\])/g, '\\$1');
}

function escapeRegexpString(value: string): string {
  return value.replace(/([.+*?^${}()[\]|/\\])/g, '\\$1');
}

// A utility function to convert a list of path-to-regexp Tokens back into
// a pattern string.  The resulting pattern should be equivalent to the
// original parsed pattern, although they may differ due to canonicalization.
function tokensToPattern(tokens: Token[],
  options: TokensToRegexpOptions & ParseOptions): string {
  const wildcardPattern = ".*";
  const segmentWildcardPattern =
    `[^${escapeRegexpString(options.delimiter === undefined ? '/#?' : options.delimiter)}]+?`;
  const regexIdentifierPart = /[$_\u200C\u200D\p{ID_Continue}]/u;

  let result = "";
  for (let i = 0; i < tokens.length; ++i) {
    const token = tokens[i];
    const lastToken = i > 0 ? tokens[i - 1] : null;
    const nextToken: any = i < tokens.length - 1 ? tokens[i + 1] : null;

    // Plain text tokens can be directly added to the pattern string.
    if (typeof token === 'string') {
      result += escapePatternString(token);
      continue;
    }

    // Tokens without a pattern are also plain text, but were originally
    // contained in a `{ ... }` group.  There may be a modifier following
    // the group.  If there is no modifier then we strip the braces off
    // as they are superfluous.
    if (token.pattern === '') {
      if (token.modifier === '') {
        result += escapePatternString(token.prefix);
        continue;
      }
      result += `{${escapePatternString(token.prefix)}}${token.modifier}`;
      continue;
    }

    // Determine if the token name was custom or automatically assigned.
    const customName = typeof token.name !== 'number';

    // Determine if the token needs a grouping like `{ ... }`.  This is
    // necessary when the group:
    //
    // 1. is using a non-automatic prefix or any suffix.
    const optionsPrefixes = options.prefixes !== undefined ? options.prefixes
      : "./";
    let needsGrouping =
      token.suffix !== "" ||
      (token.prefix !== "" &&
        (token.prefix.length !== 1 ||
          !optionsPrefixes.includes(token.prefix)));

    // 2. following by a matching group that may be expressed in a way that can
    //    be mistakenly interpreted as part of the matching group.  For
    //    example:
    //
    //    a. An `(...)` expression following a `:foo` group.  We want to output
    //       `{:foo}(...)` and not `:foo(...)`.
    //    b. A plain text expression following a `:foo` group where the text
    //       could be mistakenly interpreted as part of the name.  We want to
    //       output `{:foo}bar` and not `:foobar`.
    if (!needsGrouping && customName &&
      token.pattern === segmentWildcardPattern &&
      token.modifier === "" && nextToken && !nextToken.prefix &&
      !nextToken.suffix) {
      if (typeof nextToken === "string") {
        const code = nextToken.length > 0 ? nextToken[0] : "";
        needsGrouping = regexIdentifierPart.test(code);
      } else {
        needsGrouping = typeof nextToken.name === "number";
      }
    }

    // 3. preceded by a fixed text part that ends with an implicit prefix
    //    character (like `/`).  This occurs when the original pattern used
    //    an escape or grouping to prevent the implicit prefix; e.g.
    //    `\\/*` or `/{*}`.  In these cases we use a grouping to prevent the
    //    implicit prefix in the generated string.
    if (!needsGrouping && token.prefix === "" && lastToken &&
      typeof lastToken === "string" && lastToken.length > 0) {
      const code = lastToken[lastToken.length - 1];
      needsGrouping = optionsPrefixes.includes(code);
    }

    // This is a full featured token.  We must generate a string that looks
    // like:
    //
    //  { <prefix> <pattern> <suffix> } <modifier>
    //
    // Where the { and } may not be needed.  The <pattern> will be a regexp,
    // named group, or wildcard.
    if (needsGrouping) {
      result += '{';
    }

    result += escapePatternString(token.prefix);

    if (customName) {
      result += `:${token.name}`;
    }

    if (token.pattern === wildcardPattern) {
      // We can only use the `*` wildcard card if we meet a number of
      // conditions.  We must use an explicit `(.*)` group if:
      //
      // 1. A custom name was used; e.g. `:foo(.*)`.
      // 2. If the preceding group is a matching group without a modifier; e.g.
      //    `(foo)(.*)`.  In that case we cannot emit the `*` shorthand without
      //    it being mistakenly interpreted as the modifier for the previous
      //    group.
      if (!customName && (!lastToken ||
        typeof lastToken === 'string' ||
        lastToken.modifier ||
        needsGrouping ||
        token.prefix !== "")) {
        result += '*';
      } else {
        result += `(${wildcardPattern})`;
      }
    } else if (token.pattern === segmentWildcardPattern) {
      // We only need to emit a regexp if a custom name was
      // not specified.  A custom name like `:foo` gets the
      // kSegmentWildcard type automatically.
      if (!customName) {
        result += `(${segmentWildcardPattern})`;
      }
    } else {
      result += `(${token.pattern})`;
    }

    // If the matching group is a simple `:foo` custom name with the default
    // segment wildcard, then we must check for a trailing suffix that could
    // be interpreted as a trailing part of the name itself.  In these cases
    // we must escape the beginning of the suffix in order to separate it
    // from the end of the custom name; e.g. `:foo\\bar` instead of `:foobar`.
    if (token.pattern === segmentWildcardPattern && customName &&
      token.suffix !== "") {
      if (regexIdentifierPart.test(token.suffix[0])) {
        result += '\\';
      }
    }

    result += escapePatternString(token.suffix);

    if (needsGrouping) {
      result += '}';
    }

    result += token.modifier;
  }

  return result;
}

export class URLPattern {
  private pattern: URLPatternInit;
  private regexp: any = {};
  private keys: any = {};
  private component_pattern: any = {};

  constructor(init: URLPatternInit | string = {}, baseURL?: string) {
    try {
      // shorthand
      if (typeof init === 'string') {
        const parser = new Parser(init);
        parser.parse();
        init = parser.result;
        if (baseURL) {
          if (typeof baseURL === 'string') {
            init.baseURL = baseURL;
          } else {
            throw new TypeError(`'baseURL' parameter is not of type 'string'.`);
          }
        } else if (typeof init.protocol !== 'string') {
          throw new TypeError(`A base URL must be provided for a relative constructor string.`);
        }
      } else if (baseURL) {
        throw new TypeError(`parameter 1 is not of type 'string'.`);
      }

      // no or invalid arguments
      if (!init || typeof init !== 'object') {
        throw new TypeError(`parameter 1 is not of type 'string' and cannot convert to dictionary.`);
      }

      const defaults = {
        pathname: DEFAULT_PATTERN,
        protocol: DEFAULT_PATTERN,
        username: DEFAULT_PATTERN,
        password: DEFAULT_PATTERN,
        hostname: DEFAULT_PATTERN,
        port: DEFAULT_PATTERN,
        search: DEFAULT_PATTERN,
        hash: DEFAULT_PATTERN,
      };

      this.pattern = applyInit(defaults, init, true);

      if (defaultPortForProtocol(this.pattern.protocol) === this.pattern.port) {
        this.pattern.port = '';
      }

      let component: URLPatternKeys;
      // Iterate in component order so we are sure to compile the protocol
      // before the pathname.  We need to know the protocol in order to know
      // which kind of canonicalization to apply.
      for (component of COMPONENTS) {
        if (!(component in this.pattern))
          continue;
        const options: TokensToRegexpOptions & ParseOptions = {};
        const pattern = this.pattern[component];
        this.keys[component] = [];
        switch (component) {
          case 'protocol':
            Object.assign(options, DEFAULT_OPTIONS);
            options.encodePart = protocolEncodeCallback;
            break;
          case 'username':
            Object.assign(options, DEFAULT_OPTIONS);
            options.encodePart = usernameEncodeCallback;
            break;
          case 'password':
            Object.assign(options, DEFAULT_OPTIONS);
            options.encodePart = passwordEncodeCallback;
            break;
          case 'hostname':
            Object.assign(options, HOSTNAME_OPTIONS);
            if (treatAsIPv6Hostname(pattern)) {
              options.encodePart = ipv6HostnameEncodeCallback;
            } else {
              options.encodePart = hostnameEncodeCallback;
            }
            break;
          case 'port':
            Object.assign(options, DEFAULT_OPTIONS);
            options.encodePart = portEncodeCallback;
            break;
          case 'pathname':
            if (isSpecialScheme(this.regexp.protocol)) {
              Object.assign(options, PATHNAME_OPTIONS);
              options.encodePart = standardURLPathnameEncodeCallback;
            } else {
              Object.assign(options, DEFAULT_OPTIONS);
              options.encodePart = pathURLPathnameEncodeCallback;
            }
            break;
          case 'search':
            Object.assign(options, DEFAULT_OPTIONS);
            options.encodePart = searchEncodeCallback;
            break;
          case 'hash':
            Object.assign(options, DEFAULT_OPTIONS);
            options.encodePart = hashEncodeCallback;
            break;
        }
        try {
          const tokens = parse(pattern as string, options);
          this.regexp[component] = tokensToRegexp(tokens, this.keys[component], options);
          this.component_pattern[component] = tokensToPattern(tokens, options);
        } catch {
          // If a pattern is illegal the constructor will throw an exception
          throw new TypeError(`invalid ${component} pattern '${this.pattern[component]}'.`);
        }
      }
    } catch (err: any) {
      throw new TypeError(`Failed to construct 'URLPattern': ${err.message}`);
    }
  }

  test(input: string | URLPatternInit = {}, baseURL?: string) {
    let values: URLPatternInit = {
      pathname: '',
      protocol: '',
      username: '',
      password: '',
      hostname: '',
      port: '',
      search: '',
      hash: '',
    };

    if (typeof (input) !== 'string' && baseURL) {
      throw new TypeError(`parameter 1 is not of type 'string'.`);
    }

    if (typeof input === 'undefined') {
      return false;
    }

    try {
      if (typeof input === 'object') {
        values = applyInit(values, input, false);
      } else {
        values = applyInit(values, extractValues(input, baseURL), false);
      }
    } catch (err: any) {
      // Treat exceptions simply as a failure to match.
      return false;
    }

    let component: URLPatternKeys
    for (component in this.pattern) {
      if (!this.regexp[component].exec(values[component])) {
        return false;
      }
    }

    return true;
  }

  exec(input: string | URLPatternInit = {}, baseURL?: string): URLPatternResult | null | undefined {
    let values: URLPatternInit = {
      pathname: '',
      protocol: '',
      username: '',
      password: '',
      hostname: '',
      port: '',
      search: '',
      hash: '',
    };

    if (typeof (input) !== 'string' && baseURL) {
      throw new TypeError(`parameter 1 is not of type 'string'.`);
    }

    if (typeof input === 'undefined') {
      return;
    }

    try {
      if (typeof input === 'object') {
        values = applyInit(values, input, false);
      } else {
        values = applyInit(values, extractValues(input, baseURL), false);
      }
    } catch (err: any) {
      // Treat exceptions simply as a failure to match.
      return null;
    }

    let result: any = {};
    if (baseURL) {
      result.inputs = [input, baseURL];
    } else {
      result.inputs = [input];
    }

    let component: URLPatternKeys;
    for (component in this.pattern) {
      let match = this.regexp[component].exec(values[component]);
      if (!match) {
        return null;
      }

      let groups = {} as Array<string>;
      for (let [i, key] of this.keys[component].entries()) {
        if (typeof key.name === 'string' || typeof key.name === 'number') {
          let value = match[i + 1];
          groups[key.name] = value;
        }
      }

      result[component] = {
        input: values[component] || '',
        groups,
      };
    }

    return result;
  }

  public get protocol() {
    return this.component_pattern.protocol;
  }

  public get username() {
    return this.component_pattern.username;
  }

  public get password() {
    return this.component_pattern.password;
  }

  public get hostname() {
    return this.component_pattern.hostname;
  }

  public get port() {
    return this.component_pattern.port;
  }

  public get pathname() {
    return this.component_pattern.pathname;
  }

  public get search() {
    return this.component_pattern.search;
  }

  public get hash() {
    return this.component_pattern.hash;
  }
}
