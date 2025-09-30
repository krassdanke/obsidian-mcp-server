import { IncomingMessage, ServerResponse } from 'http';
import { URL } from 'url';
import { AuthConfig, generateAuthUrl, exchangeCodeForToken, getUserInfo } from './auth.js';

// OAuth callback handler
export async function handleOAuthCallback(
  req: IncomingMessage,
  res: ServerResponse,
  config: AuthConfig
): Promise<void> {
  const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const error = url.searchParams.get('error');

  if (error) {
    res.writeHead(400, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: `OAuth error: ${error}` }));
    return;
  }

  if (!code) {
    res.writeHead(400, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Authorization code not provided' }));
    return;
  }

  try {
    // Exchange code for access token
    const tokenResponse = await exchangeCodeForToken(code, config);
    
    // Get user information
    const userInfo = await getUserInfo(tokenResponse.access_token, config);

    // Return success response with token
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      success: true,
      access_token: tokenResponse.access_token,
      token_type: tokenResponse.token_type,
      expires_in: tokenResponse.expires_in,
      user: userInfo,
    }));
  } catch (error: any) {
    console.error('OAuth callback error:', error);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Failed to exchange authorization code' }));
  }
}

// OAuth authorization handler
export function handleOAuthAuth(
  req: IncomingMessage,
  res: ServerResponse,
  config: AuthConfig
): void {
  try {
    // Generate state parameter for CSRF protection
    const state = Math.random().toString(36).substring(2, 15);
    
    // Generate authorization URL
    const authUrl = generateAuthUrl(config, state);
    
    // Redirect to OAuth provider
    res.writeHead(302, { 'Location': authUrl });
    res.end();
  } catch (error: any) {
    console.error('OAuth auth error:', error);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Failed to generate authorization URL' }));
  }
}

// OAuth metadata discovery handler (RFC 8414)
export function handleOAuthMetadata(
  req: IncomingMessage,
  res: ServerResponse,
  config: AuthConfig
): void {
  if (!config.enabled) {
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'OAuth not enabled' }));
    return;
  }

  const baseUrl = `http://${req.headers.host || 'localhost'}`;
  
  const metadata = {
    issuer: baseUrl,
    authorization_endpoint: `${baseUrl}/auth`,
    token_endpoint: `${baseUrl}/auth/callback`,
    userinfo_endpoint: `${baseUrl}/userinfo`,
    jwks_uri: `${baseUrl}/.well-known/jwks.json`,
    response_types_supported: ['code'],
    grant_types_supported: ['authorization_code', 'client_credentials'],
    subject_types_supported: ['public'],
    id_token_signing_alg_values_supported: ['RS256'],
    scopes_supported: [config.scope],
    token_endpoint_auth_methods_supported: ['client_secret_basic', 'client_secret_post'],
    claims_supported: ['sub', 'email', 'name', 'preferred_username'],
  };

  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(metadata));
}

// User info endpoint
export async function handleUserInfo(
  req: IncomingMessage,
  res: ServerResponse,
  config: AuthConfig
): Promise<void> {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.writeHead(401, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Authorization header required' }));
    return;
  }

  const token = authHeader.substring(7);
  
  try {
    const userInfo = await getUserInfo(token, config);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(userInfo));
  } catch (error: any) {
    console.error('User info error:', error);
    res.writeHead(401, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Invalid token' }));
  }
}

// JWKS endpoint (for JWT validation)
export function handleJWKS(
  req: IncomingMessage,
  res: ServerResponse,
  config: AuthConfig
): void {
  // For now, return an empty JWKS
  // In a real implementation, you would return your public keys
  const jwks = {
    keys: []
  };

  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(jwks));
}
