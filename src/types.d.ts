export type URLPatternArgs =
  | [URLPatternInit | RegExp | undefined]
  | [string, string | undefined];

export declare class URLPattern {
  constructor(...args: URLPatternArgs);
  test(...args: URLPatternArgs): boolean;
  exec(...args: URLPatternArgs): URLPatternResult | null;

  readonly protocol: string;
  readonly username: string;
  readonly password: string;
  readonly hostname: string;
  readonly port: string;
  readonly pathname: string;
  readonly search: string;
  readonly hash: string;
}

export interface URLPatternInit {
  protocol?: string;
  username?: string;
  password?: string;
  hostname?: string;
  port?: string;
  pathname?: string;
  search?: string;
  hash?: string;
  baseURL?: string;
}

export interface URLPatternResult {
  inputs: URLPatternArgs;
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
  groups: {
    [key: string]: string | undefined;
  };
}
