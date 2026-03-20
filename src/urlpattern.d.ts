/**
 * URLPattern API type declarations.
 *
 * URLPattern is a browser-native API (Baseline 2025).
 * TypeScript does not yet include it in lib.dom.d.ts.
 */

interface URLPatternInit {
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

interface URLPatternResult {
  inputs: (string | URLPatternInit)[];
  protocol: URLPatternComponentResult;
  username: URLPatternComponentResult;
  password: URLPatternComponentResult;
  hostname: URLPatternComponentResult;
  port: URLPatternComponentResult;
  pathname: URLPatternComponentResult;
  search: URLPatternComponentResult;
  hash: URLPatternComponentResult;
}

interface URLPatternComponentResult {
  input: string;
  groups: Record<string, string | undefined>;
}

declare class URLPattern {
  constructor(init: URLPatternInit);
  constructor(pattern: string, baseURL?: string);

  test(input: string | URLPatternInit, baseURL?: string): boolean;
  exec(input: string | URLPatternInit, baseURL?: string): URLPatternResult | null;

  readonly protocol: string;
  readonly username: string;
  readonly password: string;
  readonly hostname: string;
  readonly port: string;
  readonly pathname: string;
  readonly search: string;
  readonly hash: string;
}
