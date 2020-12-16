import {
  pathToRegexp,
  TokensToRegexpOptions,
  ParseOptions
} from "./path-to-regex-6.2";

if (!String.prototype.replaceAll) {
	String.prototype.replaceAll = function(searchValue: string | RegExp, replaceValue: any): string {
		if (Object.prototype.toString.call(searchValue).toLowerCase() === '[object regexp]') {
			return this.replace(searchValue, replaceValue);
		}
		return this.replace(new RegExp(searchValue, 'g'), replaceValue);
	};
}

// The default wildcard pattern used for a component when the constructor
// input does not provide an explicit value.
const DEFAULT_PATTERN = "(.*)";

// The default wildcard pattern for the pathname component.
const DEFAULT_PATHNAME_PATTERN = "/(.*)";

// default to strict mode and case sensitivity.  In addition, most
// components have no concept of a delimiter or prefix character.
const DEFAULT_OPTIONS: TokensToRegexpOptions & ParseOptions = {
  delimiter: "",
  prefixes: "",
  sensitive: true,
  strict: true
}

// The options to use for hostname patterns.  This uses a
// "." delimiter controlling how far a named group like ":bar" will match
// by default.  Note, hostnames are case insensitive but we require case
// sensitivity here.  This assumes that the hostname values have already
// been normalized to lower case as in URL().
const HOSTNAME_OPTIONS: TokensToRegexpOptions & ParseOptions = {
  delimiter: ".",
  prefixes: "",
  sensitive: true,
  strict: true
}

// The options to use for pathname patterns.  This uses a
// "/" delimiter controlling how far a named group like ":bar" will match
// by default.  It also configures "/" to be treated as an automatic
// prefix before groups.
const PATHNAME_OPTIONS: TokensToRegexpOptions & ParseOptions = {
  delimiter: "/",
  prefixes: "/",
  sensitive: true,
  strict: true
}

export function parseShorthand(str: string) {
  let protocol = "";
  let hostname = "";
  let pathname = "";
  let search = "";
  let hash = "";

  let i = str.indexOf("://");
  if (i !== -1) {
    protocol = str.substring(0, i);
    str = str.substring(i + 3);

    i = str.indexOf("/")
    hostname = str.substring(0, i);
    str = str.substring(i + 1);
  }

  i = str.indexOf("#");
  if (i !== -1) {
    hash = str.substring(i + 1);
    str = str.substring(0, i);
  }

  str = str.replace(/(:\w+)\?/g, (_, name) => name + "§").replace(/\*\?/g,"*§").replace(/\)\?/g, ")§");
  i = str.indexOf("?")

  if (i !== -1) {
    pathname = str.substring(0, i).replace("§", "?");
    search = str.substring(i + 1).replace("§", "?");
  } else {
    pathname = str.replace("§", "?");
  }

  return { protocol, hostname, pathname, search, hash }
}

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

interface URLPatternValues {
  [key: string]: string | undefined;
  pathname?: string;
  protocol?: string;
  username?: string;
  password?: string;
  hostname?: string;
  port?: string;
  search?: string;
  hash?: string;
}

interface URLPatternComponentResult {
  input?: any,
  [key:string]: { input: any, groups: any } | any;
}

// Utility function to determine if a pathname is absolute or not.  For
// URL values this mainly consists of a check for a leading slash.  For
// patterns we do some additional checking for escaped or grouped slashes.
function isAbsolutePathname(pathname: string, isPattern: boolean): boolean {
  if (!pathname.length) {
    return false;
  }

  if (pathname[0] === '/') {
    return true;
  }

  if (!isPattern) {
    return false;
  }

  if (pathname.length < 2) {
    return false;
  }

  // Patterns treat escaped slashes and slashes within an explicit grouping as
  // valid leading slashes.  For example, "\/foo" or "{/foo}".  Patterns do
  // not consider slashes within a custom regexp group as valid for the leading
  // pathname slash for now.  To support that we would need to be able to
  // detect things like ":name_123(/foo)" as a valid leading group in a pattern,
  // but that is considered too complex for now.
  if ((pathname[0] == '\\' || pathname[0] == '{') && pathname[1] == '/') {
    return true;
  }

  return false;
}

function isASCII(str: string, extended: boolean) {
  return (extended ? /^[\x00-\xFF]*$/ : /^[\x00-\x7F]*$/).test(str);
}

function validatePatternEncoding(pattern: string, component: string) {
  if (!pattern.length) return pattern;
  if (isASCII(pattern, true)) return pattern; // ASCII only

  // TODO: Consider if we should canonicalize patterns instead.  See:
  //       https://github.com/WICG/urlpattern/issues/33
  throw new TypeError(`Illegal character in '${component}' pattern '${pattern}'. `
    + "Patterns must be URL encoded ASCII.");
}

function canonicalizeHash(hash: string, isPattern: boolean) {
  if (isPattern) {
    return validatePatternEncoding(hash, "hash");
  }
  const url = new URL("https://example.com");
  url.hash = hash;
  // NOTE: Node URL handling is buggy!
  return url.hash ? url.hash.substring(1, url.hash.length).replace("|", "%7C") : '';
}

function canonicalizeSearch(search: string, isPattern: boolean) {
  if (isPattern) {
    return validatePatternEncoding(search, "search");
  }
  const url = new URL("https://example.com");
  url.search = search;
  // NOTE: Node URL handling is buggy!
  return url.search ? url.search.substring(1, url.search.length).replace("|", "%7C") : '';
}

function canonicalizeHostname(hostname: string, isPattern: boolean) {
  if (isPattern) {
    return validatePatternEncoding(hostname, "hostname");
  }
  const url = new URL("https://example.com");
  url.hostname = hostname;
  // NOTE: Node URL handling is buggy!
  return url.hostname.replace("|", "%7C");
}

function canonicalizePassword(password: string, isPattern: boolean) {
  if (isPattern) {
    return validatePatternEncoding(password, "password");
  }
  const url = new URL("https://example.com");
  url.password = password;
  // NOTE: Node URL handling is buggy!
  return url.password.replace("|", "%7C");
}

function canonicalizeUsername(username: string, isPattern: boolean) {
  if (isPattern) {
    return validatePatternEncoding(username, "username");
  }
  const url = new URL("https://example.com");
  url.username = username;
  // NOTE: Node URL handling is buggy!
  return url.username.replace("|", "%7C");
}

function canonicalizePathname(pathname: string, isPattern: boolean) {
  if (isPattern) {
    return validatePatternEncoding(pathname, "pathname");
  }

  const leadingSlash = pathname[0] == "/";
  pathname = new URL(pathname, "https://example.com").pathname;
  if (!leadingSlash) {
    pathname = pathname.substring(1, pathname.length);
  }

  // NOTE: Node URL handling is buggy!
  return pathname.replace("|", "%7C");
}

function defaultPortForProtocol(protocol: string): string {
  switch(protocol) {
    case "ws":
    case "http":
      return '80';
    case "wws":
    case "https":
      return '443';
    case "ftp":
      return '21';
    default:
      return '';
  }
}

function canonicalizePort(port: string, isPattern: boolean): string {
  console.log("input", port, isPattern )
  if (isPattern) {
    return validatePatternEncoding(port, "port");
  }
  // Since ports only consist of digits there should be no encoding needed.
  // Therefore we directly use the UTF8 encoding version of CanonicalizePort().
  if (/^[0-9]*$/.test(port) && parseInt(port) <= 65535) {
    return port;
  }
  throw new TypeError(`Invalid port '${port}'.`);
}

function canonicalizeProtocol(protocol: string, isPattern: boolean) {
  if (isPattern) {
    return validatePatternEncoding(protocol, "protocol");
  }

  if (/^[-+.A-Za-z0-9]*$/.test(protocol)) return protocol.toLowerCase();
  throw new TypeError(`Invalid protocol '${protocol}'.`);
}

function extractValues(url: string): URLPatternInit {
  const o = new URL(url); // May throw.
  return {
    protocol: o.protocol.substring(0, o.protocol.length - 1), // not optional
    username: o.username,
    password: o.password,
    hostname: o.hostname,
    port: o.port,
    pathname: o.pathname,
    search: o.search != "" ? o.search.substring(1, o.search.length) : undefined,
    hash: o.hash != "" ? o.hash.substring(1, o.hash.length) : undefined
  }
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
      o.protocol = baseURL.protocol ? baseURL.protocol.substring(0, baseURL.protocol.length - 1) : "";
      o.username = baseURL.username;
      o.password = baseURL.password;
      o.hostname = baseURL.hostname;
      o.port = baseURL.port;
      o.pathname = baseURL.pathname ? baseURL.pathname : "/";
      // Do no propagate search or hash from the base URL.  This matches the
      // behavior when resolving a relative URL against a base URL.
    } catch {
      throw new TypeError(`Invalid baseURL '${init.baseURL}'.`);
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
    if (baseURL && !isAbsolutePathname(o.pathname, isPattern)) { // FIXME: is hierarchical
      // Find the last slash in the baseURL pathname.  Since the URL is
      // hierarchical it should have a slash to be valid, but we are cautious
      // and check.  If there is no slash then we cannot use resolve the
      // relative pathname and just treat the init pathname as an absolute
      // value.
      const slashIndex = baseURL.pathname.lastIndexOf("/");
      if (slashIndex >= 0) {
        // Extract the baseURL path up to and including the first slash.  Append
        // the relative init pathname to it.
        o.pathname = baseURL.pathname.substring(0, slashIndex + 1) + o.pathname;
      }

      //o.pathname = new URL(o.pathname, init.baseURL).pathname;
    }
    o.pathname = canonicalizePathname(o.pathname, isPattern);
  }
  if (init.search) o.search = canonicalizeSearch(init.search, isPattern);
  if (init.hash) o.hash = canonicalizeHash(init.hash, isPattern);

  return o;
}

export class URLPattern {
  private pattern: URLPatternValues;
  private regexp: any = {};
  private keys: any = {};

  constructor(...args: any) {
    let init: URLPatternInit;

    if (typeof args[0] === "object") {
      init = args[0];
    }
    // shorthand
    else if (typeof args[0] === "string") {
      init = parseShorthand(args[0]);
      if (args[1]) {
        if (typeof args[1] === "string") {
          init.baseURL = args[1];
        } else {
          throw TypeError;
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
      hash: DEFAULT_PATTERN
    }

    this.pattern = applyInit(defaults, init, true);

    for (let component in this.pattern) {
      let options;
      const pattern = this.pattern[component];
      this.keys[component] = [];
      switch(component) {
        case "hostname":
          options = HOSTNAME_OPTIONS;
          break;
        case "pathname":
          options = PATHNAME_OPTIONS;
          break;
        default:
          options = DEFAULT_OPTIONS;
      }
      try {
        // @ts-ignore
        this.regexp[component] = pathToRegexp(pattern, this.keys[component], options);
        console.log(component, this.pattern[component], this.regexp[component]);
      } catch {
        // If a pattern is illegal the constructor will throw an exception
        throw new TypeError(`Invalid ${component} pattern '${this.pattern[component]}'.`);
      }
    }
  }

  test(input: string) {
    let values: URLPatternValues = {
      pathname: '',
      protocol: '',
      username: '',
      password: '',
      hostname: '',
      port: '',
      search: '',
      hash: ''
    };

    try {
      values = applyInit(values, extractValues(input), typeof input !== "string"); // allows string or URL object.
    } catch {
      return false;
    }

    for (let part in this.pattern) {
      //if (!this.regexp[part]) {
      //  continue;
      //}
      // @ts-ignore
      let result = this.regexp[part].test(values[part]);
      // @ts-ignore
      //console.log(part, this.regexp[part], values[part], result);
      if (!result) {
        return false;
      }
    }

    return true;
  }

  exec(input: string | URLPatternInit): URLPatternComponentResult | null | undefined | number {
    let values: URLPatternValues = {};

    if (typeof input === "undefined") {
      return;
    }

    try {
      if (typeof input === "object") {
        values = applyInit(values, input, false);
      } else {
        values = applyInit(values, extractValues(input), false); // allows string or URL object.
      }
    } catch {
      return null;
    }

    console.log("values", values);

    let result: URLPatternComponentResult | null = null;
    for (let component in this.pattern) {
      //console.log("component/pattern/value", component, this.pattern[component], values[component]);
      if (!values[component]) {
        if (component === "pathname" && this.pattern[component] === DEFAULT_PATHNAME_PATTERN)
          continue;

        if (component !== "pathname" && this.pattern[component] === DEFAULT_PATTERN)
          continue;
      }

      let match;
      let portMatchFix = component == "port" && values.protocol && values.port === defaultPortForProtocol(values.protocol)
      if (portMatchFix) {
        // @ts-ignore
        match = this.regexp[component].exec('');
      } else {
        // @ts-ignore
        match = this.regexp[component].exec(values[component] || '');
      }

      //console.log("regex, value, match", component, this.regexp[component], values[component], match);

      let groups = {} as Array<string>;
      if (!match) {
        return null;
      }

      for (let [i, key] of this.keys[component].entries()) {
        if (typeof key.name === "string" || typeof key.name === "number") {
          let value = match[i + 1];
          groups[key.name] = value || '';
        }
      }

      if (!result) result = {};

      if (!Object.keys(groups).length && !match.input.length) {
        if (!result["exactly_empty_components"]) {
          result["exactly_empty_components"] = [];
        }
        result["exactly_empty_components"].push(component);
      } else {
        result[component] = {
          input: match.input,
          groups
        };
      }

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
      throw TypeError;
    }

    const firstItem = list[0];
    if (firstItem instanceof URLPattern) {
      for (let pattern of list) {
        if (!(pattern instanceof URLPattern)) {
         throw TypeError;
        }
        this.patterns.push(pattern);
      }
    } else {
      try {
        for (let patternInit of list) {
          let init = {};
          if (typeof patternInit === "object") {
            init = Object.assign(Object.assign({}, options), patternInit);
          } else if (typeof patternInit === "string") {
            init = Object.assign(Object.assign({}, options), parseShorthand(patternInit));
          } else {
            throw TypeError;
          }

          this.patterns.push(new URLPattern(init));
        }
      } catch {
        throw TypeError;
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