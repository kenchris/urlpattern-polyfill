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

type URLPatternComponent = 'protocol' | 'username' | 'password'
  | 'hostname' | 'port' | 'pathname' | 'search' | 'hash'; 

export type URLPatternKeys = Exclude<keyof URLPatternInit, 'caseSensitivePath'>

export interface URLPatternResult {
  inputs: [URLPatternInit | string];
  protocol: URLPatternComponentResult;
  username: URLPatternComponentResult;
  password: URLPatternComponentResult;
  hostname: URLPatternComponentResult;
  port: URLPatternComponentResult;
  pathname: URLPatternComponentResult;
  search: URLPatternComponentResult;
  hash: URLPatternComponentResult;
}

export interface URLPatternComponentResult {
  input: string;
  groups: { [key: string]: string };
}

export interface URLPatternOptions {
  ignoreCase: boolean;
}