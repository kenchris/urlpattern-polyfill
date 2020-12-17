export function parseShorthand(str: string) {
  let protocol = '';
  let hostname = '';
  let pathname = '';
  let search = '';
  let hash = '';

  let i = str.indexOf('://');
  if (i !== -1) {
    protocol = str.substring(0, i);
    str = str.substring(i + 3);

    i = str.indexOf('/');
    hostname = str.substring(0, i);
    str = str.substring(i + 1);
  }

  i = str.indexOf('#');
  if (i !== -1) {
    hash = str.substring(i + 1);
    str = str.substring(0, i);
  }

  str = str
    .replace(/(:\w+)\?/g, (_, name) => name + '§')
    .replace(/\*\?/g, '*§')
    .replace(/\)\?/g, ')§');
  i = str.indexOf('?');

  if (i !== -1) {
    pathname = str.substring(0, i).replace('§', '?');
    search = str.substring(i + 1).replace('§', '?');
  } else {
    pathname = str.replace('§', '?');
  }

  return { protocol, hostname, pathname, search, hash };
}
