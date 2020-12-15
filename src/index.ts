import {
  pathToRegexp,
  TokensToRegexpOptions,
  ParseOptions
} from "./path-to-regex-6.2";

const expandStar = (str: string): string => {
  return str; //.replace(/(?<!\(\.)\*/gi, "(.*)");
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
  [key: string]: string;
  pathname: string;
  protocol: string;
  username: string;
  password: string;
  hostname: string;
  port: string;
  search: string;
  hash: string;
}

interface URLPatternComponentResult {
  input?: any,
  [key:string]: { input: any, groups: any } | any;
}

function extractValues(url: string) {
  const o = new URL(url); // May throw.
  return {
    protocol: o.protocol.substring(0, o.protocol.length - 1), // not optional
    username: o.username,
    password: o.password,
    hostname: o.hostname,
    port: o.port,
    pathname: o.pathname,
    search: o.search != "" ? o.search.substring(1, o.search.length) : "",
    hash: o.hash != "" ? o.hash.substring(1, o.hash.length) : ""
  }
}

// A utility method that takes a URLPatternInit, splits it apart, and applies
// the individual component values in the given set of strings.  The strings
// are only applied if a value is present in the init structure.
function applyInit(init: URLPatternInit): URLPatternValues {
  let pathname = DEFAULT_PATHNAME_PATTERN;
  let protocol = DEFAULT_PATTERN;
  let username = DEFAULT_PATTERN;
  let password = DEFAULT_PATTERN;
  let hostname = DEFAULT_PATTERN;
  let port = DEFAULT_PATTERN;
  let search = DEFAULT_PATTERN;
  let hash = DEFAULT_PATTERN;

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
      protocol = baseURL.protocol ? baseURL.protocol.substring(0, baseURL.protocol.length - 1) : "";
      username = baseURL.username ? baseURL.username : "";
      password = baseURL.password ? baseURL.password : "";
      hostname = baseURL.hostname ? baseURL.hostname : "";
      port = baseURL.port ? baseURL.port : "";
      pathname = baseURL.pathname ? baseURL.pathname : "/";
      // Do no propagate search or hash from the base URL.  This matches the
      // behavior when resolving a relative URL against a base URL.
    } catch {
      throw new TypeError(`Invalid baseURL '${init.baseURL}'.`);
    }
  }

  // Apply the URLPatternInit component values on top of the default and
  // baseURL values.
  if (init.protocol) protocol = init.protocol;
  if (init.username) username = init.username;
  if (init.password) password = init.password;
  if (init.hostname) hostname = init.hostname;
  if (init.port) port = init.port;
  if (init.pathname) {
    pathname = init.pathname;
    if (init.baseURL) {
      pathname = new URL(pathname, init.baseURL).pathname;
    }
    // TODO: Compare with updates when it handles relative pathnames
    // If the baseURL is missing and the pathname is relative then an exception is thrown
    /*
    let isRelativePath = !["/", "(", ":"].includes(pathname[0]);
    if (isRelativePath) {
      if (!init.baseURL) {
        throw new TypeError('Missing baseURL');
      } else {
        // Resolve against baseURL. E.g. if the pattern is "*hello" and the base URL is
        // "https://example.com/foo/bar", then the final path pattern is "/foo/*hello".
        pathname = new URL(init.baseURL, pathname).pathname;
      }
      if (!pathname.length || pathname[0] != '/') {
        throw new TypeError(`Could not resolve absolute pathname for '${pathname}'.`);
      }
    }
    */
  }
  if (init.search) search = init.search;
  if (init.hash) hash = init.hash;

  return {
    pathname,
    protocol,
    username,
    password,
    hostname,
    port,
    search,
    hash
  }
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

    this.pattern = applyInit(init);

    for (let component in this.pattern) {
      let options;
      let defaultPattern = DEFAULT_PATTERN;
      const pattern = expandStar(this.pattern[component]);
      this.keys[component] = [];
      switch(component) {
        case "hostname":
          options = HOSTNAME_OPTIONS;
          break;
        case "pathname":
          options = PATHNAME_OPTIONS;
          defaultPattern = DEFAULT_PATHNAME_PATTERN;
          break;
        default:
          options = DEFAULT_OPTIONS;
      }
      if (pattern === defaultPattern) {
        continue;
      }
      try {
        this.regexp[component] = pathToRegexp(pattern, this.keys[component], options);
      } catch {
        // If a pattern is illegal the constructor will throw an exception
        throw new TypeError(`Invalid ${component} pattern '${this.pattern[component]}'.`);
      }
    }
  }

  test(url: string) {
    let values: URLPatternValues;
    try {
      values = extractValues(url); // allows string or URL object.
    } catch {
      return false;
    }

    for (let part in this.pattern) {
      if (!this.regexp[part]) {
        continue;
      }
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
    let values: URLPatternValues;
    if (typeof input === "undefined") {
      return;
    }

    if (typeof input === "object") {
      values = applyInit(input);
      values.pathname = new URL(values.pathname, input.baseURL || "https://example.com").pathname;
    } else {
      try {
        values = extractValues(input); // allows string or URL object.
      } catch {
        return null;
      }
    }

    let result: URLPatternComponentResult | null = null;
    for (let component in this.pattern) {
      if (!this.regexp[component]) {
        continue;
      }

      // @ts-ignore
      const match = this.regexp[component].exec(values[component]);
      console.log(this.regexp[component], values[component], match);

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