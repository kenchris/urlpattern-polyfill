import { parseShorthand } from './parseShorthand';
import { URLPattern } from './url-pattern';
import { URLPatternComponentResult } from './url-pattern.interfaces';

export class URLPatternList {
  private patterns: Array<URLPattern> = [];

  constructor(list: URLPattern[], options = {}) {
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