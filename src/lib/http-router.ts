import { IncomingMessage, ServerResponse } from 'http';
import { URL } from 'url';

export interface HttpRouteHandler {
  (req: IncomingMessage, res: ServerResponse): Promise<boolean>;
}

export interface RouteConfig {
  handler: HttpRouteHandler;
  method?: string[];
  path?: string; // For exact matches
  pathPattern?: RegExp; // For pattern matching
}

export abstract class HttpRouter {
  protected routes: RouteConfig[] = [];

  /**
   * Add a route configuration
   */
  protected addRoute(config: RouteConfig): void {
    this.routes.push(config);
  }

  /**
   * Handle incoming HTTP requests
   * Returns true if request was handled, false otherwise
   */
  public async handleRequest(req: IncomingMessage, res: ServerResponse): Promise<boolean> {
    const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
    
    // Find matching route
    const matchedRoute = this.findMatchingRoute(req.method || '', url.pathname);
    if (!matchedRoute) {
      return false; // No route matched
    }

    try {
      // Validate HTTP method if specified
      if (matchedRoute.method && !matchedRoute.method.includes(req.method || '')) {
        res.writeHead(405, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ 
          error: 'Method not allowed',
          allowed_methods: matchedRoute.method.join(', ')
        }));
        return true; // Handled with error response
      }

      // Execute route handler
      return await matchedRoute.handler(req, res);
    } catch (error: any) {
      console.error(`[HttpRouter] Error in route handler:`, error);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ 
        error: 'Internal server error',
        message: error.message || 'Unknown error'
      }));
      return true; // Handled with error response
    }
  }

  /**
   * Find the first route that matches the request
   */
  protected findMatchingRoute(method: string, pathname: string): RouteConfig | null {
    for (const route of this.routes) {
      // Check exact path match first
      if (route.path && route.path === pathname) {
        return route;
      }
      
      // Check pattern match
      if (route.pathPattern && route.pathPattern.test(pathname)) {
        return route;
      }
    }
    
    return null;
  }

  /**
   * Get all registered routes for debugging/documentation
   */
  public getRoutes(): Array<{ path?: string; pathPattern?: string; methods?: string[] }> {
    return this.routes.map(route => ({
      path: route.path,
      pathPattern: route.pathPattern?.source,
      methods: route.method
    }));
  }
}
