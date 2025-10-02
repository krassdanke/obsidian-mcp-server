import { IncomingMessage, ServerResponse } from 'http';
import { URL } from 'url';
import { randomBytes } from 'crypto';
import { AuthConfig, generateAuthUrl, generateAuthUrlForClient, exchangeCodeForToken, getUserInfo, getProviderConfig } from './auth.js';
import { SQLiteSessionStore, OAuthTokenData, OAuthAuthRequestData } from './session-store.js';

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
  config: AuthConfig,
  sessionStore: SQLiteSessionStore
): Promise<void> {
  const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const error = url.searchParams.get('error');

  if (error) {
    const errorDescription = url.searchParams.get('error_description') || error;
    console.error('OAuth error:', error, errorDescription);
    
    // Send HTML error page
    res.writeHead(400, { 'Content-Type': 'text/html' });
    res.end(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Authentication Error</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; text-align: center; }
            .error { color: #d32f2f; }
            .success { color: #2e7d32; }
          </style>
        </head>
        <body>
          <div class="error">
            <h1>Authentication Error</h1>
            <p>${error}: ${errorDescription}</p>
            <p>This window can be closed.</p>
          </div>
        </body>
      </html>
    `);
    return;
  }

  if (!code) {
    // Send HTML error page
    res.writeHead(400, { 'Content-Type': 'text/html' });
    res.end(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Authentication Error</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; text-align: center; }
            .error { color: #d32f2f; }
          </style>
        </head>
        <body>
          <div class="error">
            <h1>Authentication Error</h1>
            <p>Authorization code not provided</p>
            <p>This window can be closed.</p>
          </div>
        </body>
      </html>
    `);
    return;
  }

  try {
    // Exchange code for access token
    const tokenResponse = await exchangeCodeForToken(code, config);
    
    // Get user information
    const userInfo = await getUserInfo(tokenResponse.access_token, config);

    // Store token and user info for retrieval via JSON endpoint
    const tokenData: OAuthTokenData = {
      access_token: tokenResponse.access_token,
      token_type: tokenResponse.token_type || 'Bearer',
      expires_in: tokenResponse.expires_in,
      refresh_token: tokenResponse.refresh_token || null,
      scope: tokenResponse.scope || config.scope,
      user: userInfo,
      timestamp: Date.now(),
      expires_at: tokenResponse.expires_in ? Date.now() + (tokenResponse.expires_in * 1000) : undefined
    };

    // Store the token data in SQLite session store
    if (state) {
      sessionStore.setOAuthToken(state, tokenData);
      console.log(`OAuth token stored for state: ${state} (expires: ${new Date(tokenData.expires_at || 0).toISOString()})`);
    }

    // Get the original authorization request to retrieve the redirect_uri
    const authRequest = state ? sessionStore.getOAuthAuthRequest(state) : null;
    
    if (authRequest && authRequest.redirect_uri && code && state) {
      // Redirect back to the original client's redirect_uri with the authorization code
      console.log(`✅ Redirecting to original redirect_uri: ${authRequest.redirect_uri}`);
      
      // Handle custom schemes like cursor:// by constructing the full URL manually
      const redirectParams = new URLSearchParams({ code, state });
      const redirectUrl = `${authRequest.redirect_uri}?${redirectParams.toString()}`;
      
      res.writeHead(302, { 'Location': redirectUrl });
      res.end();
    } else {
      // Debug why redirect failed
      console.log(`❌ Redirect failed:`, {
        state: state ? `${state.substring(0, 8)}...` : 'none',
        code: code ? `${code.substring(0, 8)}...` : 'none', 
        authRequest: authRequest ? 'found' : 'missing',
        redirect_uri: authRequest?.redirect_uri || 'none'
      });
      
      // Fallback: Show HTML success page if no redirect_uri found
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Authentication Successful</title>
            <style>
              body { font-family: Arial, sans-serif; padding: 20px; text-align: center; }
              .success { color: #2e7d32; }
              .info { color: #1976d2; margin-top: 20px; }
              .close-btn {
                background: #2e7d32;
                color: white;
                border: none;
                padding: 10px 20px;
                border-radius: 4px;
                cursor: pointer;
                font-size: 16px;
                margin-top: 20px;
              }
              .close-btn:hover { background: #1b5e20; }
            </style>
            <script>
              // Close window after 3 seconds
              setTimeout(() => {
                window.close();
              }, 3000);
            </script>
          </head>
          <body>
            <div class="success">
              <h1>✅ Authentication Successful</h1>
              <p>Welcome ${userInfo.name} (${userInfo.email})</p>
              <div class="info">
                <p><strong>State:</strong> ${state}</p>
                <p><strong>Provider:</strong> ${config.provider}</p>
                <p><strong>Token:</strong> ${tokenResponse.access_token.substring(0, 20)}...</p>
              </div>
              <p><em>This window will close automatically in 3 seconds</em></p>
              <button class="close-btn" onclick="window.close()">Close Window</button>
            </div>
          </body>
        </html>
      `);
    }

    // Also store the token data for Cursor to retrieve via a dedicated endpoint
    console.log(`OAuth successful for user: ${userInfo.email || userInfo.name} (state: ${state})`);
    
  } catch (error: any) {
    console.error('OAuth callback error:', error);
    
    // Send HTML error page
    res.writeHead(500, { 'Content-Type': 'text/html' });
    res.end(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Authentication Error</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; text-align: center; }
            .error { color: #d32f2f; }
          </style>
        </head>
        <body>
          <div class="error">
            <h1>Authentication Error</h1>
            <p>Failed to exchange authorization code</p>
            <p><strong>Error:</strong> ${error.message || 'Internal server error'}</p>
            <p>This window can be closed.</p>
          </div>
        </body>
      </html>
    `);
  }
}

// OAuth authorization handler
export function handleOAuthAuth(
  req: IncomingMessage,
  res: ServerResponse,
  config: AuthConfig,
  sessionStore: SQLiteSessionStore
): void {
  try {
    const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
    
    // Extract OAuth parameters from the request
    const clientId = url.searchParams.get('client_id');
    const redirectUri = url.searchParams.get('redirect_uri');
    const responseType = url.searchParams.get('response_type');
    const scope = url.searchParams.get('scope');
    const state = url.searchParams.get('state') || randomBytes(16).toString('hex');
    const codeChallenge = url.searchParams.get('code_challenge');
    const codeChallengeMethod = url.searchParams.get('code_challenge_method');
    
    // Validate required parameters
    if (!clientId || !redirectUri || !responseType) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ 
        error: 'invalid_request',
        error_description: 'Missing required parameters: client_id, redirect_uri, or response_type'
      }));
      return;
    }
    
    // Validate response_type (we only support 'code')
    if (responseType !== 'code') {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ 
        error: 'unsupported_response_type',
        error_description: 'Only response_type=code is supported'
      }));
      return;
    }
    
    // Validate client_id matches our configuration
    if (clientId !== config.clientId) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ 
        error: 'invalid_client',
        error_description: 'Invalid client_id'
      }));
      return;
    }
    
    // Store authorization request data for later retrieval in callback
    const authRequestData: OAuthAuthRequestData = {
      redirect_uri: redirectUri,
      client_id: clientId,
      scope: scope || undefined,
      code_challenge: codeChallenge || undefined,
      code_challenge_method: codeChallengeMethod || undefined,
      timestamp: Date.now()
    };
    
    sessionStore.setOAuthAuthRequest(state, authRequestData);
    console.log(`OAuth auth request stored for state: ${state} (redirect_uri: ${redirectUri})`);
    
    // Generate authorization URL using extracted parameters (server's redirect_uri will be used)
    const authUrl = generateAuthUrlForClient(
      config, 
      state, 
      codeChallenge, 
      codeChallengeMethod
    );
    
    // Redirect to OAuth provider
    res.writeHead(302, { 'Location': authUrl });
    res.end();
  } catch (error: any) {
    console.error('OAuth auth error:', error);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'server_error', error_description: 'Internal server error' }));
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
    token_retrieval_endpoint: `${baseUrl}/auth/token`,
    userinfo_endpoint: `${baseUrl}/userinfo`,
    registration_endpoint: `${baseUrl}/client-registration`,
    response_types_supported: ['code'],
    grant_types_supported: ['authorization_code', 'client_credentials'],
    scopes_supported: [getProviderConfig(config.provider!)?.scope || 'openid email profile'],
    token_endpoint_auth_methods_supported: ['client_secret_basic', 'client_secret_post'],
    code_challenge_methods_supported: ['S256'], // ForPKCE
    service_documentation: `${baseUrl}/.well-known/oauth-authorization-server`,
    custom_endpoints: {
      token_retrieval: `${baseUrl}/auth/token?state={state}`,
      callback_success_page: `${baseUrl}/auth/callback`
    }
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


// Token retrieval endpoint for programmatic access
export function handleTokenRetrieval(
  req: IncomingMessage,
  res: ServerResponse,
  config: AuthConfig,
  sessionStore: SQLiteSessionStore
): void {
  if (req.method !== 'GET') {
    res.writeHead(405, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Method not allowed' }));
    return;
  }

  const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
  const state = url.searchParams.get('state');

  if (!state) {
    res.writeHead(400, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'State parameter required' }));
    return;
  }

  // Retrieve token data from session store
  const tokenData = sessionStore.getOAuthToken(state);
  if (!tokenData) {
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Token not found or expired' }));
    return;
  }

  // Clean up the token after retrieval (one-time use)
  sessionStore.deleteOAuthToken(state);

  // Return the token data with success flag for compatibility
  const responseData = {
    success: true,
    ...tokenData
  };

  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(responseData));
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
