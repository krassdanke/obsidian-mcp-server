import { IncomingMessage, ServerResponse } from 'http';
import { AuthConfig } from './auth.js';
import { SQLiteSessionStore } from './session-store.js';
import { HttpRouter, RouteConfig } from './http-router.js';
import { 
  handleOAuthAuth, 
  handleOAuthCallback, 
  handleOAuthMetadata, 
  handleUserInfo, 
  handleClientRegistration, 
  handleTokenRetrieval 
} from './oauth-handlers.js';

export interface OAuthRouteConfig {
  authConfig: AuthConfig;
  sessionStore: SQLiteSessionStore;
}

export class OAuthRouter extends HttpRouter {
  private authConfig: AuthConfig;
  private sessionStore: SQLiteSessionStore;

  constructor(config: OAuthRouteConfig) {
    super();
    this.authConfig = config.authConfig;
    this.sessionStore = config.sessionStore;
    this.initializeRoutes();
  }

  private initializeRoutes(): void {
    // OAuth authorization endpoint
    this.addRoute({
      handler: this.createAuthHandler(),
      method: ['GET'],
      path: '/auth'
    });

    // OAuth callback endpoint  
    this.addRoute({
      handler: this.createCallbackHandler(),
      method: ['GET'],
      path: '/auth/callback'
    });

    // Token retrieval endpoint
    this.addRoute({
      handler: this.createTokenHandler(),
      method: ['GET'],
      path: '/auth/token'
    });

    // OAuth metadata discovery endpoint
    this.addRoute({
      handler: this.createMetadataHandler(),
      method: ['GET'],
      path: '/.well-known/oauth-authorization-server'
    });

    // User info endpoint
    this.addRoute({
      handler: this.createUserInfoHandler(),
      method: ['GET'],
      path: '/userinfo'
    });

    // Client registration endpoint
    this.addRoute({
      handler: this.createClientRegistrationHandler(),
      method: ['POST'],
      path: '/client-registration'
    });
  }

  /**
   * Handle incoming HTTP requests for OAuth endpoints
   */
  public async handleRequest(req: IncomingMessage, res: ServerResponse): Promise<boolean> {
    if (!this.authConfig.enabled) {
      return false; // Let other handlers process the request
    }

    return await super.handleRequest(req, res);
  }

  // Route handler factories (returns handlers compatible with HttpRouter interface)
  private createAuthHandler() {
    return async (req: IncomingMessage, res: ServerResponse): Promise<boolean> => {
      try {
        handleOAuthAuth(req, res, this.authConfig, this.sessionStore);
        return true;
      } catch (error: any) {
        console.error('[OAuthRouter] Auth route error:', error);
        throw error;
      }
    };
  }

  private createCallbackHandler() {
    return async (req: IncomingMessage, res: ServerResponse): Promise<boolean> => {
      try {
        await handleOAuthCallback(req, res, this.authConfig, this.sessionStore);
        return true;
      } catch (error: any) {
        console.error('[OAuthRouter] Callback route error:', error);
        throw error;
      }
    };
  }

  private createTokenHandler() {
    return async (req: IncomingMessage, res: ServerResponse): Promise<boolean> => {
      try {
        handleTokenRetrieval(req, res, this.authConfig, this.sessionStore);
        return true;
      } catch (error: any) {
        console.error('[OAuthRouter] Token route error:', error);
        throw error;
      }
    };
  }

  private createMetadataHandler() {
    return async (req: IncomingMessage, res: ServerResponse): Promise<boolean> => {
      try {
        handleOAuthMetadata(req, res, this.authConfig);
        return true;
      } catch (error: any) {
        console.error('[OAuthRouter] Metadata route error:', error);
        throw error;
      }
    };
  }

  private createUserInfoHandler() {
    return async (req: IncomingMessage, res: ServerResponse): Promise<boolean> => {
      try {
        await handleUserInfo(req, res, this.authConfig);
        return true;
      } catch (error: any) {
        console.error('[OAuthRouter] UserInfo route error:', error);
        throw error;
      }
    };
  }

  private createClientRegistrationHandler() {
    return async (req: IncomingMessage, res: ServerResponse): Promise<boolean> => {
      try {
        handleClientRegistration(req, res, this.authConfig);
        return true;
      } catch (error: any) {
        console.error('[OAuthRouter] ClientRegistration route error:', error);
        throw error;
      }
    };
  }
}
