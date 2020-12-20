export interface URLPatternInit {
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

export type URLPatternKeys = keyof URLPatternInit

export interface URLPatternResult {
  input: URLPatternInit | string;
  protocol: URLPatterncomponentResult;
  username: URLPatterncomponentResult;
  password: URLPatterncomponentResult;
  hostname: URLPatterncomponentResult;
  port: URLPatterncomponentResult;
  pathname: URLPatterncomponentResult;
  search: URLPatterncomponentResult;
  hash: URLPatterncomponentResult;
}

export interface URLPatterncomponentResult {
  input: string;
  groups: { [key: string]: string };
}