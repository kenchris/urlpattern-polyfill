import { ParseOptions, Options, parse, Part, PartType, partsToRegexp, Modifier, modifierToString } from './path-to-regex-modified';
import { URLPatternResult, URLPatternInit, URLPatternKeys, URLPatternOptions, URLPatternComponent } from './url-pattern.interfaces';
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
    search: o.search !== '' ? o.search.substring(1, o.search.length) : undefined,
    hash: o.hash !== '' ? o.hash.substring(1, o.hash.length) : undefined,
  };
}

function processBaseURLString(input: string, isPattern: boolean) {
  if (!isPattern) {
    return input;
  }

  return escapePatternString(input);
}

// A utility method that takes a URLPatternInit, splits it apart, and applies
// the individual component values in the given set of strings.  The strings
// are only applied if a value is present in the init structure.
function applyInit(o: URLPatternInit, init: URLPatternInit, isPattern: boolean): URLPatternInit {
  // If there is a baseURL we need to apply its component values first.  The
  // rest of the URLPatternInit structure will then later override these
  // values.
  let baseURL;
  if (typeof init.baseURL === 'string') {
    try {
      baseURL = new URL(init.baseURL);
      if (init.protocol === undefined) {
        o.protocol = processBaseURLString(baseURL.protocol.substring(0, baseURL.protocol.length - 1), isPattern);
      }
      if (!isPattern && init.protocol === undefined && init.hostname === undefined &&
          init.port === undefined && init.username === undefined) {
        o.username = processBaseURLString(baseURL.username, isPattern);
      }
      if (!isPattern && init.protocol === undefined && init.hostname === undefined &&
          init.port === undefined && init.username === undefined &&
          init.password === undefined) {
        o.password = processBaseURLString(baseURL.password, isPattern);
      }
      if (init.protocol === undefined && init.hostname === undefined) {
        o.hostname = processBaseURLString(baseURL.hostname, isPattern);
      }
      if (init.protocol === undefined && init.hostname === undefined &&
          init.port === undefined) {
        o.port = processBaseURLString(baseURL.port, isPattern);
      }
      if (init.protocol === undefined && init.hostname === undefined &&
          init.port === undefined && init.pathname === undefined) {
        o.pathname = processBaseURLString(baseURL.pathname, isPattern);
      }
      if (init.protocol === undefined && init.hostname === undefined &&
          init.port === undefined && init.pathname === undefined &&
          init.search === undefined) {
        o.search = processBaseURLString(baseURL.search.substring(1, baseURL.search.length), isPattern);
      }
      if (init.protocol === undefined && init.hostname === undefined &&
          init.port === undefined && init.pathname === undefined &&
          init.search === undefined && init.hash === undefined) {
        o.hash = processBaseURLString(baseURL.hash.substring(1, baseURL.hash.length), isPattern);
      }
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
        o.pathname = processBaseURLString(baseURL.pathname.substring(0, slashIndex + 1), isPattern) + o.pathname;
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
function partsToPattern(parts: Part[], options: Options & ParseOptions): string {
  options.delimiter ??=  "/#?";
  options.prefixes ??= "./";
  options.sensitive ??= false;
  options.strict ??= false;
  options.end ??= true;
  options.start ??= true;
  options.endsWith = '';

  const kFullWildcardRegex = ".*";
  const segmentWildcardRegex = `[^${escapeRegexpString(options.delimiter)}]+?`;
  const regexIdentifierPart = /[$_\u200C\u200D\p{ID_Continue}]/u;

  let result = "";
  for (let i = 0; i < parts.length; ++i) {
    const part = parts[i];

    if (part.type === PartType.kFixed) {
      // A simple fixed string part.
      if (part.modifier === Modifier.kNone) {
        result += escapePatternString(part.value);
        continue;
      }

      // A fixed string, but with a modifier which requires a grouping.
      // For example, `{foo}?`.
      result += `{${escapePatternString(part.value)}}${modifierToString(part.modifier)}`;
      continue;
    }

    // Determine if the token name was custom or automatically assigned.
    const customName = part.hasCustomName();

    // Determine if the token needs a grouping like `{ ... }`.  This is
    // necessary when the group:
    //
    // 1. is using a non-automatic prefix or any suffix.
    let needsGrouping =
      !!part.suffix.length ||
      (!!part.prefix.length &&
        (part.prefix.length !== 1 ||
          !options.prefixes.includes(part.prefix)));

    const lastPart = i > 0 ? parts[i - 1] : null;
    const nextPart: any = i < parts.length - 1 ? parts[i + 1] : null;

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
      part.type === PartType.kSegmentWildcard &&
      part.modifier === Modifier.kNone && nextPart && !nextPart.prefix.length &&
      !nextPart.suffix.length) {
      if (nextPart.type === PartType.kFixed) {
        const code = nextPart.value.length > 0 ? nextPart.value[0] : "";
        needsGrouping = regexIdentifierPart.test(code);
      } else {
        needsGrouping = !nextPart.hasCustomName();
      }
    }

    // 3. preceded by a fixed text part that ends with an implicit prefix
    //    character (like `/`).  This occurs when the original pattern used
    //    an escape or grouping to prevent the implicit prefix; e.g.
    //    `\\/*` or `/{*}`.  In these cases we use a grouping to prevent the
    //    implicit prefix in the generated string.
    if (!needsGrouping && !part.prefix.length && lastPart &&
      lastPart.type === PartType.kFixed) {
      const code = lastPart.value[lastPart.value.length - 1];
      needsGrouping = options.prefixes.includes(code);
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

    result += escapePatternString(part.prefix);

    if (customName) {
      result += `:${part.name}`;
    }

    if (part.type === PartType.kRegex) {
      result += `(${part.value})`;
    } else if (part.type === PartType.kSegmentWildcard) {
      // We only need to emit a regexp if a custom name was
      // not specified.  A custom name like `:foo` gets the
      // kSegmentWildcard type automatically.
      if (!customName) {
        result += `(${segmentWildcardRegex})`;
      }
    } else if (part.type === PartType.kFullWildcard) {
      // We can only use the `*` wildcard card if we meet a number
      // of conditions.  We must use an explicit `(.*)` group if:
      //
      // 1. A custom name was used; e.g. `:foo(.*)`.
      // 2. If the preceding group is a matching group without a modifier; e.g.
      //    `(foo)(.*)`.  In that case we cannot emit the `*` shorthand without
      //    it being mistakenly interpreted as the modifier for the previous
      //    group.
      // 3. The current group is not enclosed in a `{ }` grouping.
      // 4. The current group does not have an implicit prefix like `/`.
      if (!customName && (!lastPart ||
        lastPart.type === PartType.kFixed ||
        lastPart.modifier !== Modifier.kNone ||
        needsGrouping ||
        part.prefix !== "")) {
        result += "*";
      } else {
        result += `(${kFullWildcardRegex})`;
      }
    }

    // If the matching group is a simple `:foo` custom name with the default
    // segment wildcard, then we must check for a trailing suffix that could
    // be interpreted as a trailing part of the name itself.  In these cases
    // we must escape the beginning of the suffix in order to separate it
    // from the end of the custom name; e.g. `:foo\\bar` instead of `:foobar`.
    if (part.type === PartType.kSegmentWildcard && customName &&
      !!part.suffix.length) {
      if (regexIdentifierPart.test(part.suffix[0])) {
        result += '\\';
      }
    }

    result += escapePatternString(part.suffix);

    if (needsGrouping) {
      result += '}';
    }

    if (part.modifier !== Modifier.kNone) {
      result += modifierToString(part.modifier);
    }
  }

  return result;
}

export class URLPattern {
  #pattern: URLPatternInit;
  #regexp: any = {};
  #names: string[] = {};
  #component_pattern: any = {};
  #parts: any = {};
  #hasRegExpGroups: boolean = false;

  constructor(init: URLPatternInit | string, baseURL?: string, options?: URLPatternOptions);
  constructor(init: URLPatternInit | string, options?: URLPatternOptions);
  constructor(init: URLPatternInit | string = {}, baseURLOrOptions?: string | URLPatternOptions, options?: URLPatternOptions) {
    try {
      let baseURL = undefined;
      if (typeof baseURLOrOptions === 'string') {
        baseURL = baseURLOrOptions;
      } else {
        options = baseURLOrOptions;
      }

      if (typeof init === 'string') {
        const parser = new Parser(init);
        parser.parse();
        init = parser.result;
        if (baseURL === undefined && typeof init.protocol !== 'string') {
          throw new TypeError(`A base URL must be provided for a relative constructor string.`);
        }
        init.baseURL = baseURL;
      } else {
        if (!init || typeof init !== 'object') {
          throw new TypeError(`parameter 1 is not of type 'string' and cannot convert to dictionary.`);
        }
        if (baseURL) {
          throw new TypeError(`parameter 1 is not of type 'string'.`);
        }
      }

      if (typeof options === "undefined") {
        options = { ignoreCase: false };
      }

      const ignoreCaseOptions = { ignoreCase: options.ignoreCase === true };

      const defaults: URLPatternInit = {
        pathname: DEFAULT_PATTERN,
        protocol: DEFAULT_PATTERN,
        username: DEFAULT_PATTERN,
        password: DEFAULT_PATTERN,
        hostname: DEFAULT_PATTERN,
        port: DEFAULT_PATTERN,
        search: DEFAULT_PATTERN,
        hash: DEFAULT_PATTERN,
      };

      this.#pattern = applyInit(defaults, init, true);

      if (defaultPortForProtocol(this.#pattern.protocol) === this.#pattern.port) {
        this.#pattern.port = '';
      }

      let component: URLPatternKeys;
      // Iterate in component order so we are sure to compile the protocol
      // before the pathname.  We need to know the protocol in order to know
      // which kind of canonicalization to apply.
      for (component of COMPONENTS) {
        if (!(component in this.#pattern))
          continue;
        const options: Options & ParseOptions = {};
        const pattern = this.#pattern[component];
        this.#names[component] = [];
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
            if (isSpecialScheme(this.#regexp.protocol)) {
              Object.assign(options, PATHNAME_OPTIONS, ignoreCaseOptions);
              options.encodePart = standardURLPathnameEncodeCallback;
            } else {
              Object.assign(options, DEFAULT_OPTIONS, ignoreCaseOptions);
              options.encodePart = pathURLPathnameEncodeCallback;
            }
            break;
          case 'search':
            Object.assign(options, DEFAULT_OPTIONS, ignoreCaseOptions);
            options.encodePart = searchEncodeCallback;
            break;
          case 'hash':
            Object.assign(options, DEFAULT_OPTIONS, ignoreCaseOptions);
            options.encodePart = hashEncodeCallback;
            break;
        }
        try {
          this.#parts[component] = parse(pattern as string, options);
          this.#regexp[component] = partsToRegexp(this.#parts[component], /* out */ this.#names[component], options);
          this.#component_pattern[component] = partsToPattern(this.#parts[component], options);
          this.#hasRegExpGroups = this.#hasRegExpGroups ||
                                  this.#parts[component].some((p: Part) => p.type === PartType.kRegex);
        } catch (err) {
          // If a pattern is illegal the constructor will throw an exception
          throw new TypeError(`invalid ${component} pattern '${this.#pattern[component]}'.`);
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

    let component: URLPatternKeys;
    for (component of COMPONENTS) {
      if (!this.#regexp[component].exec(values[component])) {
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
    for (component of COMPONENTS) {
      let match = this.#regexp[component].exec(values[component]);
      if (!match) {
        return null;
      }

      let groups = {} as Array<string>;
      for (let [i, name] of this.#names[component].entries()) {
        if (typeof name === 'string' || typeof name === 'number') {
          let value = match[i + 1];
          groups[name] = value;
        }
      }

      result[component] = {
        input: values[component] ?? '',
        groups,
      };
    }

    return result;
  }

  static compareComponent(component: URLPatternComponent, left: URLPattern, right: URLPattern) : Number {
    const comparePart = (left: Part, right: Part) : Number => {
      // We prioritize PartType in the ordering so we can favor fixed text.  The
      // type ordering is:
      //
      //  kFixed > kRegex > kSegmentWildcard > kFullWildcard.
      //
      // We considered kRegex greater than the wildcards because it is likely to be
      // used for imposing some constraint and not just duplicating wildcard
      // behavior.
      //
      // This comparison depends on the PartType enum having the
      // correct corresponding numeric values.
      //
      // Next the Modifier is considered:
      //
      //  kNone > kOneOrMore > kOptional > kZeroOrMore.
      //
      // The rationale here is that requring the match group to exist is more
      // restrictive then making it optional and requiring an exact count is more
      // restrictive than repeating.
      //
      // This comparison depends on the Modifier enum in liburlpattern having the
      // correct corresponding numeric values.
      //
      // Finally we lexicographically compare the text components from left to
      // right; `prefix`, `value`, and `suffix`.  It's OK to depend on simple
      // byte-wise string comparison here because the values have all been URL
      // encoded.  This guarantees the strings contain only ASCII.
      for (let attr of ["type", "modifier", "prefix", "value", "suffix"]) {
        if (left[attr] < right[attr])
          return -1;
        else if (left[attr] === right[attr])
          continue;
        else
          return 1;
      }
      return 0;
    }

    const emptyFixedPart: Part = new Part(PartType.kFixed, "", "", "", "", Modifier.kNone);
    const wildcardOnlyPart: Part = new Part(PartType.kFullWildcard, "", "", "", "", Modifier.kNone);

    const comparePartList = (left: Part[], right: Part[]) : Number => {
      // Begin by comparing each Part in the lists with each other.  If any
      // are not equal, then we are done.
      let i = 0;
      for (; i < Math.min(left.length, right.length); ++i) {
        let result = comparePart(left[i], right[i]);
        if (result) // 1 or -1.
          return result;
      }

      // No differences were found, so declare them equal.
      if (left.length === right.length) {
        return 0;
      }

      // We reached the end of at least one of the lists without finding a
      // difference.  However, we must handle the case where one list is longer
      // than the other.  In this case we compare the next Part from the
      // longer list to a synthetically created empty kFixed Part.  This is
      // necessary in order for "/foo/" to be considered more restrictive, and
      // therefore greater, than "/foo/*".
      return comparePart(left[i] ?? emptyFixedPart, right[i] ?? emptyFixedPart);
    }

    // If both the left and right components are empty wildcards, then they are
    // effectively equal.
    if (!left.#component_pattern[component] && !right.#component_pattern[component]) {
      return 0;
    }

    // If one side has a real pattern and the other side is an empty component,
    // then we have to compare to a part list with a single full wildcard.
    if (left.#component_pattern[component] && !right.#component_pattern[component]) {
      return comparePartList(left.#parts[component], [wildcardOnlyPart]);
    }

    if (!left.#component_pattern[component] && right.#component_pattern[component]) {
      return comparePartList([wildcardOnlyPart], right.#parts[component]);
    }

    // Otherwise compare the part lists of the patterns on each side.
    return comparePartList(left.#parts[component], right.#parts[component]);
  }

  public get protocol() {
    return this.#component_pattern.protocol;
  }

  public get username() {
    return this.#component_pattern.username;
  }

  public get password() {
    return this.#component_pattern.password;
  }

  public get hostname() {
    return this.#component_pattern.hostname;
  }

  public get port() {
    return this.#component_pattern.port;
  }

  public get pathname() {
    return this.#component_pattern.pathname;
  }

  public get search() {
    return this.#component_pattern.search;
  }

  public get hash() {
    return this.#component_pattern.hash;
  }

  public get hasRegExpGroups() {
    return this.#hasRegExpGroups;
  }
}
