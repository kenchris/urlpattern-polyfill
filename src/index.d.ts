type URLPatternInput = URLPatternInit | string;

export declare class URLPattern {
  constructor(init?: URLPatternInput, baseURL?: string);

  test(input?: URLPatternInput, baseURL?: string): boolean;

  exec(input?: URLPatternInput, baseURL?: string): URLPatternResult | null;

  get protocol(): string;
  get username(): string;
  get password(): string;
  get hostname(): string;
  get port(): string;
  get pathname(): string;
  get search(): string;
  get hash(): string;
}

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

export interface URLPatternResult {
  inputs: [URLPatternInput];
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