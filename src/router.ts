/**
 * URLPattern-based client-side router.
 *
 * Uses the browser-native URLPattern API (Baseline 2025) for route matching.
 * Navigation via history.pushState() + popstate listener.
 */

export interface RouteMatch {
  page: string;
  params: Record<string, string>;
}

interface RouteDefinition {
  pattern: URLPattern;
  page: string;
}

const BASE = '/ui';

const routes: RouteDefinition[] = [
  { pattern: new URLPattern({ pathname: `${BASE}/` }), page: 'chat' },
  { pattern: new URLPattern({ pathname: `${BASE}/chat/:groupId?` }), page: 'chat' },
  { pattern: new URLPattern({ pathname: `${BASE}/sessions` }), page: 'sessions' },
  { pattern: new URLPattern({ pathname: `${BASE}/sessions/:key` }), page: 'sessions' },
  { pattern: new URLPattern({ pathname: `${BASE}/skills` }), page: 'skills' },
  { pattern: new URLPattern({ pathname: `${BASE}/workflows` }), page: 'workflows' },
  { pattern: new URLPattern({ pathname: `${BASE}/workflows/:id` }), page: 'workflows' },
  // Also match without /ui prefix for standalone mode
  { pattern: new URLPattern({ pathname: '/' }), page: 'chat' },
  { pattern: new URLPattern({ pathname: '/chat/:groupId?' }), page: 'chat' },
  { pattern: new URLPattern({ pathname: '/sessions' }), page: 'sessions' },
  { pattern: new URLPattern({ pathname: '/sessions/:key' }), page: 'sessions' },
  { pattern: new URLPattern({ pathname: '/skills' }), page: 'skills' },
  { pattern: new URLPattern({ pathname: '/workflows' }), page: 'workflows' },
  { pattern: new URLPattern({ pathname: '/workflows/:id' }), page: 'workflows' },
];

function matchRoute(url: string): RouteMatch {
  for (const route of routes) {
    const result = route.pattern.exec(url);
    if (result) {
      const groups = result.pathname.groups as Record<string, string | undefined>;
      const params: Record<string, string> = {};
      for (const [key, value] of Object.entries(groups)) {
        if (value !== undefined && value !== '') {
          params[key] = value;
        }
      }
      return { page: route.page, params };
    }
  }
  // Unknown routes default to chat
  return { page: 'chat', params: {} };
}

export class RouteChangeEvent extends Event {
  readonly route: RouteMatch;

  constructor(route: RouteMatch) {
    super('route-change');
    this.route = route;
  }
}

export class Router extends EventTarget {
  private _current: RouteMatch;
  private _popstateHandler: (() => void) | null = null;

  constructor() {
    super();
    this._current = matchRoute(window.location.href);
  }

  get current(): RouteMatch {
    return this._current;
  }

  navigate(path: string): void {
    // Ensure path starts with base in bundled mode
    const fullPath = path.startsWith(BASE) ? path : path;
    history.pushState(null, '', fullPath);
    this._resolve();
  }

  start(): void {
    this._popstateHandler = () => this._resolve();
    window.addEventListener('popstate', this._popstateHandler);
    // Resolve the initial route
    this._resolve();
  }

  stop(): void {
    if (this._popstateHandler) {
      window.removeEventListener('popstate', this._popstateHandler);
      this._popstateHandler = null;
    }
  }

  private _resolve(): void {
    this._current = matchRoute(window.location.href);
    this.dispatchEvent(new RouteChangeEvent(this._current));
  }
}

/** Singleton router instance. */
export const router = new Router();

/** Convenience function for programmatic navigation. */
export function navigate(path: string): void {
  router.navigate(path);
}
