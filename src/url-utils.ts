import {ParseOptions, TokensToRegexpOptions} from './path-to-regex-modified';

// default to strict mode and case sensitivity.  In addition, most
// components have no concept of a delimiter or prefix character.
export const DEFAULT_OPTIONS: TokensToRegexpOptions & ParseOptions = {
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
export const HOSTNAME_OPTIONS: TokensToRegexpOptions & ParseOptions = {
  delimiter: '.',
  prefixes: '',
  sensitive: true,
  strict: true,
};

// The options to use for pathname patterns.  This uses a
// "/" delimiter controlling how far a named group like ":bar" will match
// by default.  It also configures "/" to be treated as an automatic
// prefix before groups.
export const PATHNAME_OPTIONS: TokensToRegexpOptions & ParseOptions = {
  delimiter: '/',
  prefixes: '/',
  sensitive: true,
  strict: true,
};

// Utility function to determine if a pathname is absolute or not.  For
// URL values this mainly consists of a check for a leading slash.  For
// patterns we do some additional checking for escaped or grouped slashes.
export function isAbsolutePathname(pathname: string, isPattern: boolean): boolean {
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

function maybeStripPrefix(value: string, prefix: string): string {
  if (value.startsWith(prefix)) {
    return value.substring(prefix.length, value.length);
  }
  return value;
}

function maybeStripSuffix(value: string, suffix: string): string {
  if (value.endsWith(suffix)) {
    return value.substr(0, value.length - suffix.length);
  }
  return value;
}

export const SPECIAL_SCHEMES = [
  'ftp',
  'file',
  'http',
  'https',
  'ws',
  'wss',
];

export function isSpecialScheme(protocol_regexp: any) {
  if (!protocol_regexp) {
    return true;
  }
  for (const scheme of SPECIAL_SCHEMES) {
    if (protocol_regexp.test(scheme)) {
      return true;
    }
  }
  return false;
}

export function canonicalizeHash(hash: string, isPattern: boolean) {
  hash = maybeStripPrefix(hash, '#');
  if (isPattern || hash === '') {
    return hash;
  }
  const url = new URL("https://example.com");
  url.hash = hash;
  return url.hash ? url.hash.substring(1, url.hash.length) : '';
}

export function canonicalizeSearch(search: string, isPattern: boolean) {
  search = maybeStripPrefix(search, '?');
  if (isPattern || search === '') {
    return search;
  }
  const url = new URL("https://example.com");
  url.search = search;
  return url.search ? url.search.substring(1, url.search.length) : '';
}

export function canonicalizeHostname(hostname: string, isPattern: boolean) {
  if (isPattern || hostname === '') {
    return hostname;
  }
  return hostnameEncodeCallback(hostname);
}

export function canonicalizePassword(password: string, isPattern: boolean) {
  if (isPattern || password === '') {
    return password;
  }
  const url = new URL("https://example.com");
  url.password = password;
  return url.password;
}

export function canonicalizeUsername(username: string, isPattern: boolean) {
  if (isPattern || username === '') {
    return username;
  }
  const url = new URL("https://example.com");
  url.username = username;
  return url.username;
}

export function canonicalizePathname(pathname: string, protocol: string | undefined,
                                     isPattern: boolean) {
  if (isPattern || pathname === '') {
    return pathname;
  }

  if (protocol && !SPECIAL_SCHEMES.includes(protocol)) {
    const url = new URL(`${protocol}:${pathname}`);
    return url.pathname;
  }

  const leadingSlash = pathname[0] == "/";
  pathname = new URL(pathname, "https://example.com").pathname;
  if (!leadingSlash) {
    pathname = pathname.substring(1, pathname.length);
  }

  return pathname;
}

export function canonicalizePort(port: string, protocol: string | undefined, isPattern: boolean): string {
  if (defaultPortForProtocol(protocol) === port) {
    port = '';
  }

  if (isPattern || port === '') {
    return port;
  }

  return portEncodeCallback(port);
}

export function canonicalizeProtocol(protocol: string, isPattern: boolean) {
  protocol = maybeStripSuffix(protocol, ':');

  if (isPattern || protocol === '') {
    return protocol;
  }

  return protocolEncodeCallback(protocol);
}

export function defaultPortForProtocol(protocol: string | undefined): string {
  switch (protocol) {
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

export function protocolEncodeCallback(input: string): string {
  if (input === '') {
    return input;
  }
  if (/^[-+.A-Za-z0-9]*$/.test(input))
    return input.toLowerCase();
  throw new TypeError(`Invalid protocol '${input}'.`);
}

export function usernameEncodeCallback(input: string): string {
  if (input === '') {
    return input;
  }
  const url = new URL('https://example.com');
  url.username = input;
  return url.username;
}

export function passwordEncodeCallback(input: string): string {
  if (input === '') {
    return input;
  }
  const url = new URL('https://example.com');
  url.password = input;
  return url.password;
}

export function hostnameEncodeCallback(input: string): string {
  if (input === '') {
    return input;
  }
  if (/[#%/:<>?@[\]\\|]/g.test(input)) {
    throw(new TypeError(`Invalid hostname '${input}'`));
  }
  const url = new URL('https://example.com');
  url.hostname = input;
  return url.hostname;
}

export function portEncodeCallback(input: string): string {
  if (input === '') {
    return input;
  }
  // Since ports only consist of digits there should be no encoding needed.
  // Therefore we directly use the UTF8 encoding version of CanonicalizePort().
  if ((/^[0-9]*$/.test(input) && parseInt(input) <= 65535)) {
    return input;
  }
  throw new TypeError(`Invalid port '${input}'.`);
}

export function standardURLPathnameEncodeCallback(input: string): string {
  if (input === '') {
    return input;
  }
  const url = new URL('https://example.com');
  url.pathname = input;
  if (input[0] !== '/')
    return url.pathname.substring(1, url.pathname.length);
  return url.pathname;
}

export function pathURLPathnameEncodeCallback(input: string): string {
  if (input === '') {
    return input;
  }
  const url = new URL(`data:${input}`);
  return url.pathname;
}

export function searchEncodeCallback(input: string): string {
  if (input === '') {
    return input;
  }
  const url = new URL('https://example.com');
  url.search = input;
  return url.search.substring(1, url.search.length);
}

export function hashEncodeCallback(input: string): string {
  if (input === '') {
    return input;
  }
  const url = new URL('https://example.com');
  url.hash = input;
  return url.hash.substring(1, url.hash.length);
}
