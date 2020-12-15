import { pathToRegexp } from "./path-to-regex-6.2";

const expandStar = (str: string): string => {
  return str.replace(/(?<!\(\.)\*/gi, "(.*)");
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

interface URLPatternOptions {
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

interface URLPatternResult {
  [key:string]: { value:any, groups:any };
}

export class URLPattern {
  private pattern: URLPatternValues;
  private regexp: any = {};
  private keys: any = {};

  constructor(...args: any) {
    let baseURL = null;
    let options: URLPatternOptions;

    if (typeof args[0] === "object") {
      options = args[0];
      baseURL = options.baseURL;
    } 
    // shorthand
    else if (typeof args[0] === "string") {
      options = parseShorthand(args[0]);
      if (args[1]) {
        if (typeof args[1] === "string") {
          baseURL = args[1];
        } else {
          throw TypeError;
        }
      }
    } 
    // invalid arguments
    else {
      throw new TypeError('Incorrect params passed');
    }
    
    const {
      protocol,
      username,
      password,
      hostname,
      port,
      pathname,
      search,
      hash
    } = options;

    // If none of the URL part patterns are specified then the constructor will throw an exception. 
    if (!protocol && !username && !password && !hostname && !port && !pathname && !search && !hash) {
      throw new TypeError('missing parts in URL');
    }

    // Set default value depending on availability of baseURL or not.
    let base;
    if (!baseURL) {
      this.pattern = {
        pathname: "/*",
        protocol: "*",
        username: "*",
        password: "*",
        hostname: "*",
        port: "*",
        search: "*",
        hash: "*"
      } 
    } else {
      try {
        base = new URL(baseURL);
      } catch {
        throw new TypeError('error creating base');
      }
      this.pattern = {
        pathname: base.pathname,
        protocol: base.protocol,
        username: base.username,
        password: base.password,
        hostname: base.hostname,
        port: base.port,
        search: base.search,
        hash: base.hash
      }
    }

    // Override with arguments given to ctor.
    if (options.pathname) this.pattern.pathname = options.pathname;
    if (options.protocol) this.pattern.protocol = options.protocol;
    if (options.username) this.pattern.username = options.username;
    if (options.password) this.pattern.password = options.password;
    if (options.hostname) this.pattern.hostname = options.hostname;
    if (options.port) this.pattern.port = options.port;
    if (options.search) this.pattern.search = options.search;
    if (options.hash) this.pattern.hash = options.hash;

    // If the baseURL is missing and the pathname is relative then an exception is thrown
    let isRelativePath = !this.pattern.pathname.startsWith("/");
    if (isRelativePath) {
      if (!baseURL) {
        throw new TypeError('missing base');
      } else {
        // Resolve against baseURL. E.g. if the pattern is "*hello" and the base URL is
        // "https://example.com/foo/bar", then the final path pattern is "/foo/*hello".
        this.pattern.pathname = new URL(baseURL, this.pattern.pathname).pathname;
      }
    }

    //console.log(JSON.stringify(this.pattern));

    this.pattern.protocol = this.pattern.protocol.replace(":", "\\:");

    try {
      for (let part in this.pattern) {
        this.keys[part] = [];
        //console.log(`${part}: ${expandStar(this.pattern[part])}`);
        this.regexp[part] = pathToRegexp(expandStar(this.pattern[part]), this.keys[part], { strict: true, end: true });
        //console.log(part, this.#pattern[part], this.#regexp[part]);
      }
    } catch {
      // If a pattern is illegal the constructor will throw an exception
      throw new TypeError('illegal pattern');
    }
  }

  test(url: string) {
    let target: URL;
    try {
      target = new URL(url); // allows string or URL object.
    } catch {
      return false;
    }

    for (let part in this.pattern) {
      // @ts-ignore
      let result = this.regexp[part].test(target[part]);
      // @ts-ignore
      // console.log(part, this.regexp[part], target[part], result);
      if (!result) {
        return false;
      }
    }

    return true;
  }

  exec(url: string): URLPatternResult | null {
    let target;
    try {
      target = new URL(url); // allows string or URL object.
    } catch {
      return null;
    }

    let result: URLPatternResult = {};
    for (let part in this.pattern) {
      // @ts-ignore
      const value = this.regexp[part].exec(target[part]);

      let groups = {} as Array<string>;
      if (!value) {
        return null;
      }

      for (let [i, key] of this.keys[part].entries()) {
        if (typeof key.name === "string") {
          groups[key.name] = value[i + 1];
        }
      }

      result[part] = {
        value,
        groups: Object.keys(groups).length ? groups : undefined
      };
    }

    return result;
  }
}

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

  exec(url: string): URLPatternResult | null {
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