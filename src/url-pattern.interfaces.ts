
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
export interface URLPatternValues {
  [key: string]: string | undefined;
  pathname?: string;
  protocol?: string;
  username?: string;
  password?: string;
  hostname?: string;
  port?: string;
  search?: string;
  hash?: string;
}
export interface URLPatternComponentResult {
  input?: any;
  [key: string]: { input: any; groups: any; } | any;
}
