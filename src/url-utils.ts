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

export function isSpecialScheme(protocol_regexp: any) {
  if (!protocol_regexp) {
    return true;
  }
  const specialSchemes = [
    'ftp',
    'file',
    'http',
    'https',
    'ws',
    'wss',
  ];
  for (const scheme of specialSchemes) {
    if (protocol_regexp.test(scheme)) {
      return true;
    }
  }
  return false;
}

export function canonicalizeHash(hash: string, isPattern: boolean) {
  if (isPattern || hash === '') {
    return hash;
  }
  const url = new URL("https://example.com");
  url.hash = hash;
  return url.hash ? url.hash.substring(1, url.hash.length) : '';
}

export function canonicalizeSearch(search: string, isPattern: boolean) {
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
  const url = new URL("https://example.com");
  url.hostname = hostname;
  return url.hostname;
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

export function canonicalizePathname(pathname: string, isPattern: boolean) {
  if (isPattern || pathname === '') {
    return pathname;
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
  const url = new URL('data:example');
  url.pathname = input;
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
