type URLPatternComponentResult = {
  input: string
  groups: Record<string, string | null>
}

type URLPatternResult = {
  readonly protocol: string
  readonly username: string
  readonly password: string
  readonly hostname: string
  readonly port: string
  readonly pathname: string
  readonly search: string
  readonly hash: string
}

declare class URLPattern {
  constructor(input?: string | object, baseURL?: string)

  readonly protocol: URLPatternComponentResult
  readonly username: URLPatternComponentResult
  readonly password: URLPatternComponentResult
  readonly hostname: URLPatternComponentResult
  readonly port: URLPatternComponentResult
  readonly pathname: URLPatternComponentResult
  readonly search: URLPatternComponentResult
  readonly hash: URLPatternComponentResult

  test(input?: string | object, baseURL?: string): boolean
  exec(input?: string | object, baseURL?: string): URLPatternResult
}

export { URLPattern }