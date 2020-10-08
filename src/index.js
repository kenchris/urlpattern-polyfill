import { pathToRegexp } from "./path-to-regex-1.7.esm.js";

export class URLPattern {
  #pattern = {};
  #regexp = {};
  #keys = {};

  constructor({ baseURL, pathname, protocol, username, password, hostname, port, search, hash }) {
    // If none of the URL part patterns are specified then the constructor will throw an exception. 
    if (!protocol && !username && !password && !hostname && !port && !pathname && !search && !hash) {
      throw TypeError;
    }

    // Set default value depending on availablility of baseURL or not.
    let base;
    if (!baseURL) {
      this.#pattern = {
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
        throw TypeError;
      }
      this.#pattern = {
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
    if (pathname) this.#pattern.pathname = pathname;
    if (protocol) this.#pattern.protocol = protocol;
    if (username) this.#pattern.username = username;
    if (password) this.#pattern.password = password;
    if (hostname) this.#pattern.hostname = hostname;
    if (port) this.#pattern.port = port;
    if (search) this.#pattern.search = search;
    if (hash) this.#pattern.hash = hash;

    // If the baseURL is missing and the pathname is relative then an exception is thrown
    let isRelativePath = !this.#pattern.pathname.startsWith("/");
    if (isRelativePath) {
      if (!baseURL) {
        throw TypeError;
      } else {
        // Resolve against baseURL. E.g. if the pattern is "*hello" and the base URL is
        // "https://example.com/foo/bar", then the final path pattern is "/foo/*hello".
        this.#pattern.pathname = new URL(baseURL, this.#pattern.pathname).pathname;
      }
    }

    try {
      for (let part in this.#pattern) {
        this.#keys[part] = [];
        this.#regexp[part] = pathToRegexp(this.#pattern[part], this.#keys[part], { strict: true, end: true });
        //console.log(part, this.#pattern[part], this.#regexp[part]);
      }
    } catch {
      // If a pattern is illegal the constructor will throw an exception
      throw TypeError;
    }
  }

  test(url) {
    let target;
    try {
      target = new URL(url); // allows string or URL object.
    } catch {
      return false;
    }

    for (let part in this.#pattern) {
      if (!this.#regexp[part].test(target[part])) {
        return false;
      }
    }

    return true;
  }

  exec(url) {
    let target;
    try {
      target = new URL(url); // allows string or URL object.
    } catch {
      return null;
    }

    let result = {};
    for (let part in this.#pattern) {
      const value = this.#regexp[part].exec(target[part]);

      let groups = {};
      if (!value) {
        return null;
      }

      for (let [i, key] of this.#keys[part].entries()) {
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
  #patterns = [];

  constructor(list, options = {}) {
    if (!Array.isArray(list)) {
      throw TypeError;
    }

    const firstItem = list[0];
    if (firstItem instanceof URLPattern) {
      for (let pattern of list) {
        if (!(pattern instanceof URLPattern)) {
         throw TypeError;
        }
        this.#patterns.push(pattern);
      }
    } else {
      try {
        for (let patternInit of list) {
          const init = Object.assign(Object.assign({}, options), patternInit);
          this.#patterns.push(new URLPattern(init));
        }
      } catch {
        throw TypeError;
      }
    }
  }

  test(url) {
    let target;
    try {
      target = new URL(url); // allows string or URL object.
    } catch {
      return false;
    }

    for (let urlPattern of this.#patterns) {
      if (urlPattern.test(target)) {
        return true;
      }
    }
    return false;
  }

  exec(url) {
    let target;
    try {
      target = new URL(url); // allows string or URL object.
    } catch {
      return null;
    }

    for (let urlPattern of this.#patterns) {
      const value = urlPattern.exec(target);
      if (value) {
        return value;
      }
    }
    return null;
  }
}