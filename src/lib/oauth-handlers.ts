import { IncomingMessage, ServerResponse } from 'http';
import { URL } from 'url';
import { randomBytes } from 'crypto';
import { AuthConfig, generateAuthUrl, exchangeCodeForToken, getUserInfo, getProviderConfig } from './auth.js';

// Generate secure registration token using crypto
function generateSecureRegistrationToken(): string {
  // Use purely cryptographic entropy - no timestamp or predictable components
  const prefix = 'mcp-reg-';
  const entropy = randomBytes(32).toString('hex'); // 64-character hex string
  return `${prefix}${entropy}`;
}

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
    const errorDescription = url.searchParams.get('error_description') || error;
    console.error('OAuth error:', error, errorDescription);
    res.writeHead(400, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: `OAuth error: ${error}`, error_description: errorDescription }));
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
      token_type: tokenResponse.token_type || 'Bearer',
      expires_in: tokenResponse.expires_in,
      refresh_token: tokenResponse.refresh_token || null,
      scope: tokenResponse.scope || config.scope,
      user: userInfo,
    }));
  } catch (error: any) {
    console.error('OAuth callback error:', error);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ 
      error: 'Failed to exchange authorization code',
      error_description: error.message || 'Internal server error'
    }));
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

  const protocol = req.headers['x-forwarded-proto'] || (req.headers.host?.includes('localhost') ? 'http' : 'https');
  const baseUrl = `${protocol}://${req.headers.host || 'localhost'}`;
  
  const metadata = {
    issuer: baseUrl,
    authorization_endpoint: `${baseUrl}/auth`,
    token_endpoint: `${baseUrl}/auth/callback`,
    userinfo_endpoint: `${baseUrl}/userinfo`,
    registration_endpoint: `${baseUrl}/client-registration`,
    response_types_supported: ['code'],
    grant_types_supported: ['authorization_code', 'client_credentials'],
    scopes_supported: [getProviderConfig(config.provider!)?.scope || 'openid email profile'],
    token_endpoint_auth_methods_supported: ['client_secret_basic', 'client_secret_post'],
    code_challenge_methods_supported: ['S256'], // ForPKCE
    service_documentation: `${baseUrl}/.well-known/oauth-authorization-server`,
  };

  res.writeHead(200, { 
    'Content-Type': 'application/json',
    'Cache-Control': 'public, max-age=3600'
  });
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


// Dynamic Client Registration endpoint (RFC 7591)
export function handleClientRegistration(
  req: IncomingMessage,
  res: ServerResponse,
  config: AuthConfig
): void {
  if (req.method !== 'POST') {
    res.writeHead(405, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Method not allowed' }));
    return;
  }

  // Validate configuration
  if (!config.clientId || !config.clientSecret) {
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ 
      error: 'OAuth client credentials not configured',
      error_description: 'OAUTH_CLIENT_ID and OAUTH_CLIENT_SECRET must be set when AUTH_ENABLED=true'
    }));
    return;
  }

  const protocol = req.headers['x-forwarded-proto'] || (req.headers.host?.includes('localhost') ? 'http' : 'https');
  const baseUrl = `${protocol}://${req.headers.host || 'localhost'}`;
  
  // Generate client registration response using provided credentials
  const clientInfo = {
    client_id: config.clientId,
    client_secret: config.clientSecret,
    client_name: 'Obsidian MCP Client',
    client_type: 'confidential',
    redirect_uris: [`${baseUrl}/auth/callback`],
    grant_types: ['authorization_code'],
    response_types: ['code'],
    scope: getProviderConfig(config.provider!)?.scope || 'openid email profile',
    issuer: baseUrl,
    registration_client_uri: `${baseUrl}/client-registration`,
    registration_access_token: generateSecureRegistrationToken()
  };

  res.writeHead(201, { 
    'Content-Type': 'application/json',
    'Cache-Control': 'no-store',
    'Pragma': 'no-cache'
  });
  res.end(JSON.stringify(clientInfo));
}
