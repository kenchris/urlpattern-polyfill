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

const applyNodeJSFixes = (str: string) => str.replace("|", "%7C");

function isASCII(str: string, extended: boolean) {
  return (extended ? /^[\x00-\xFF]*$/ : /^[\x00-\x7F]*$/).test(str);
}

function validatePatternEncoding(pattern: string, component: string) {
  if (!pattern.length)
    return pattern;
  if (isASCII(pattern, false))
    return pattern; // ASCII only

  // TODO: Consider if we should canonicalize patterns instead.  See:
  //       https://github.com/WICG/urlpattern/issues/33
  throw new TypeError(`Illegal character in '${component}' pattern '${pattern}'. `
    + "Patterns must be URL encoded ASCII.");
}

export function canonicalizeHash(hash: string, isPattern: boolean) {
  if (isPattern) {
    return validatePatternEncoding(hash, "hash");
  }
  const url = new URL("https://example.com");
  url.hash = hash;
  return url.hash ? applyNodeJSFixes(url.hash.substring(1, url.hash.length)) : '';
}

export function canonicalizeSearch(search: string, isPattern: boolean) {
  if (isPattern) {
    return validatePatternEncoding(search, "search");
  }
  const url = new URL("https://example.com");
  url.search = search;
  return url.search ? applyNodeJSFixes(url.search.substring(1, url.search.length)) : '';
}

export function canonicalizeHostname(hostname: string, isPattern: boolean) {
  if (isPattern) {
    return validatePatternEncoding(hostname, "hostname");
  }
  const url = new URL("https://example.com");
  url.hostname = hostname;
  return applyNodeJSFixes(url.hostname);
}

export function canonicalizePassword(password: string, isPattern: boolean) {
  if (isPattern) {
    return validatePatternEncoding(password, "password");
  }
  const url = new URL("https://example.com");
  url.password = password;
  return applyNodeJSFixes(url.password);
}

export function canonicalizeUsername(username: string, isPattern: boolean) {
  if (isPattern) {
    return validatePatternEncoding(username, "username");
  }
  const url = new URL("https://example.com");
  url.username = username;
  return applyNodeJSFixes(url.username);
}

export function canonicalizePathname(pathname: string, isPattern: boolean) {
  if (isPattern) {
    return validatePatternEncoding(pathname, "pathname");
  }

  const leadingSlash = pathname[0] == "/";
  pathname = new URL(pathname, "https://example.com").pathname;
  if (!leadingSlash) {
    pathname = pathname.substring(1, pathname.length);
  }

  return applyNodeJSFixes(pathname);
}

export function canonicalizePort(port: string, isPattern: boolean): string {
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

export function canonicalizeProtocol(protocol: string, isPattern: boolean) {
  if (isPattern) {
    return validatePatternEncoding(protocol, "protocol");
  }

  if (/^[-+.A-Za-z0-9]*$/.test(protocol))
    return protocol.toLowerCase();
  throw new TypeError(`Invalid protocol '${protocol}'.`);
}

export function defaultPortForProtocol(protocol: string): string {
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