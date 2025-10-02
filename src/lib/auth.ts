import { IncomingMessage, ServerResponse } from 'http';
import { z } from 'zod';

// OAuth 2.1 configuration schema
const AuthConfigSchema = z.object({
  enabled: z.boolean().default(false),
  provider: z.enum(['google', 'github', 'microsoft', 'generic-oauth']).optional(),
  clientId: z.string().optional(),
  clientSecret: z.string().optional(),
  issuer: z.string().optional(),
  scope: z.string().default('openid email profile'),
  redirectUri: z.string().optional(),
  // For generic OAuth providers
  authorizationEndpoint: z.string().optional(),
  tokenEndpoint: z.string().optional(),
  userInfoEndpoint: z.string().optional(),
}).refine((data) => {
  // If auth is enabled, provider must be specified
  if (data.enabled && !data.provider) {
    return false;
  }
  return true;
}, {
  message: "Provider must be specified when authentication is enabled",
  path: ["provider"],
});

export type AuthConfig = z.infer<typeof AuthConfigSchema>;

// Provider-specific configurations
const PROVIDER_CONFIGS = {
  google: {
    issuer: 'https://accounts.google.com',
    authorizationEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
    tokenEndpoint: 'https://oauth2.googleapis.com/token',
    userInfoEndpoint: 'https://www.googleapis.com/oauth2/v2/userinfo',
    scope: 'openid email profile',
  },
  github: {
    issuer: 'https://github.com',
    authorizationEndpoint: 'https://github.com/login/oauth/authorize',
    tokenEndpoint: 'https://github.com/login/oauth/access_token',
    userInfoEndpoint: 'https://api.github.com/user',
    userEmailEndpoint: 'https://api.github.com/user/emails',
    scope: 'user:email read:user',
  },
  microsoft: {
    issuer: 'https://login.microsoftonline.com/common/v2.0',
    authorizationEndpoint: 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize',
    tokenEndpoint: 'https://login.microsoftonline.com/common/oauth2/v2.0/token',
    userInfoEndpoint: 'https://graph.microsoft.com/oidc/userinfo',
    scope: 'openid email profile',
  },
  'generic-oauth': {
    issuer: 'https://generic-oauth-provider.com',
    authorizationEndpoint: 'https://generic-oauth-provider.com/oauth/authorize',
    tokenEndpoint: 'https://generic-oauth-provider.com/oauth/token',
    userInfoEndpoint: 'https://generic-oauth-provider.com/userinfo',
    scope: 'openid email profile',
  },
} as const;

export function loadAuthConfig(): AuthConfig {
  const enabled = process.env.AUTH_ENABLED === 'true';
  const provider = process.env.AUTH_PROVIDER as AuthConfig['provider'];
  
  const config = {
    enabled,
    provider: enabled ? provider : undefined,
    clientId: process.env.OAUTH_CLIENT_ID,
    clientSecret: process.env.OAUTH_CLIENT_SECRET,
    issuer: process.env.OAUTH_ISSUER,
    scope: process.env.OAUTH_SCOPE,
    redirectUri: process.env.OAUTH_REDIRECT_URI,
    authorizationEndpoint: process.env.OAUTH_AUTHORIZATION_ENDPOINT,
    tokenEndpoint: process.env.OAUTH_TOKEN_ENDPOINT,
    userInfoEndpoint: process.env.OAUTH_USERINFO_ENDPOINT,
  };

  const validatedConfig = AuthConfigSchema.parse(config);

  // Additional validation: if auth is enabled, ensure required credentials are provided
  if (validatedConfig.enabled && (!validatedConfig.clientId || !validatedConfig.clientSecret)) {
    throw new Error('OAuth authentication is enabled but OAUTH_CLIENT_ID and OAUTH_CLIENT_SECRET are not provided');
  }

  return validatedConfig;
}

export function getProviderConfig(provider: string) {
  return PROVIDER_CONFIGS[provider as keyof typeof PROVIDER_CONFIGS] || null;
}


// Token validation result
export interface TokenValidationResult {
  valid: boolean;
  user?: {
    sub: string;
    email?: string;
    name?: string;
    preferred_username?: string;
  };
  error?: string;
}

// Simple token validation (for now, we'll implement proper JWT validation later)
export async function validateToken(token: string, config: AuthConfig): Promise<TokenValidationResult> {
  if (!config.enabled) {
    return { valid: true }; // No auth required
  }

  if (!token) {
    return { valid: false, error: 'No token provided' };
  }

  // For now, implement a simple validation
  // In a real implementation, you would:
  // 1. Validate token format and basic checks
  // 2. Check token expiration
  // 3. Verify issuer and audience
  // 4. Extract user information from claims

  try {
    // Basic token format validation
    if (token.length < 10) {
      return { valid: false, error: 'Invalid token format' };
    }

    // For development/testing, accept any token that looks reasonable
    // In production, implement proper JWT validation
    if (token.startsWith('Bearer ')) {
      token = token.substring(7);
    }

    // Mock user data for now
    const user = {
      sub: 'user123',
      email: 'user@example.com',
      name: 'Test User',
    };

    return { valid: true, user };
  } catch (error) {
    return { valid: false, error: 'Token validation failed' };
  }
}

// Middleware to validate Bearer tokens
export function createAuthMiddleware(config: AuthConfig) {
  return async (req: IncomingMessage, res: ServerResponse, next: () => void) => {
    if (!config.enabled) {
      return next();
    }

    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.writeHead(401, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Authorization header required' }));
      return;
    }

    const token = authHeader.substring(7);
    const validation = await validateToken(token, config);

    if (!validation.valid) {
      res.writeHead(401, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: validation.error || 'Invalid token' }));
      return;
    }

    // Add user info to request for downstream use
    (req as any).user = validation.user;
    next();
  };
}

// Generate OAuth authorization URL
export function generateAuthUrl(config: AuthConfig, state: string): string {
  if (!config.enabled || !config.provider) {
    throw new Error('Authentication not configured');
  }

  const providerConfig = getProviderConfig(config.provider);
  if (!providerConfig) {
    throw new Error(`Unsupported provider: ${config.provider}`);
  }

  const params = new URLSearchParams({
    client_id: config.clientId!,
    redirect_uri: config.redirectUri || 'http://localhost:8765/auth/callback',
    response_type: 'code',
    scope: config.scope,
    state,
  });

  return `${providerConfig.authorizationEndpoint}?${params.toString()}`;
}

// Exchange authorization code for access token
export async function exchangeCodeForToken(
  code: string,
  config: AuthConfig
): Promise<{ 
  access_token: string; 
  token_type: string; 
  expires_in?: number; 
  refresh_token?: string;
  scope?: string;
}> {
  if (!config.enabled || !config.provider) {
    throw new Error('Authentication not configured');
  }

  const providerConfig = getProviderConfig(config.provider);
  if (!providerConfig) {
    throw new Error(`Unsupported provider: ${config.provider}`);
  }

  const redirectUri = config.redirectUri || `http://${process.env.HOST || 'localhost'}:${process.env.PORT || '8765'}/auth/callback`;

  const response = await fetch(providerConfig.tokenEndpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Accept': 'application/json',
    },
    body: new URLSearchParams({
      client_id: config.clientId!,
      client_secret: config.clientSecret!,
      code,
      grant_type: 'authorization_code',
      redirect_uri: redirectUri } as any).toString(),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Token exchange failed:', response.status, errorText);
    throw new Error(`Token exchange failed: ${response.statusText} - ${errorText}`);
  }

  const tokenData = await response.json();
  
  // Handle different token response formats
  if (tokenData.error) {
    throw new Error(`Token exchange error: ${tokenData.error_description || tokenData.error}`);
  }

  return tokenData;
}

// Get user information from provider
export async function getUserInfo(accessToken: string, config: AuthConfig): Promise<any> {
  if (!config.enabled || !config.provider) {
    throw new Error('Authentication not configured');
  }

  const providerConfig = getProviderConfig(config.provider);
  if (!providerConfig) {
    throw new Error(`Unsupported provider: ${config.provider}`);
  }

  const response = await fetch(providerConfig.userInfoEndpoint, {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Accept': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to get user info: ${response.statusText}`);
  }

  return response.json();
}
