import Database from 'better-sqlite3';
import { promises as fs } from 'fs';
import path from 'path';

export interface SessionData {
  sessionId: string;
  createdAt: number;
  lastAccessedAt: number;
  mcpServerData?: string | null;
  oauthTokens?: string | null;
}

export interface OAuthTokenData {
  access_token: string;
  token_type: string;
  expires_in?: number;
  refresh_token?: string | null;
  scope?: string;
  user?: any;
  timestamp: number;
  expires_at?: number;
}

export interface OAuthAuthRequestData {
  redirect_uri: string;
  client_id: string;
  scope?: string;
  code_challenge?: string;
  code_challenge_method?: string;
  timestamp: number;
}

export class SQLiteSessionStore {
  private db: Database.Database;
  private sessions: Map<string, SessionData> = new Map();

  constructor(dbPath: string) {
    // Ensure the directory exists
    const dir = path.dirname(dbPath);
    fs.mkdir(dir, { recursive: true }).catch(() => {
      // Directory might already exist, ignore error
    });

    try {
      this.db = new Database(dbPath);
      this.initializeDatabase();
      console.log(`[SessionStore] SQLite database initialized at ${dbPath}`);
    } catch (error) {
      console.error(`[SessionStore] Failed to initialize database at ${dbPath}:`, error);
      throw error;
    }
  }


  private initializeDatabase(): void {
    try {
      // Create sessions table
      this.db.exec(`
        CREATE TABLE IF NOT EXISTS sessions (
          sessionId TEXT PRIMARY KEY,
          createdAt INTEGER NOT NULL,
          lastAccessedAt INTEGER NOT NULL,
          mcpServerData TEXT,
          oauthTokens TEXT
        )
      `);

      // Create index for cleanup queries
      this.db.exec(`
        CREATE INDEX IF NOT EXISTS idx_sessions_lastAccessed 
        ON sessions(lastAccessedAt)
      `);

      console.log(`[SessionStore] Database schema initialized successfully`);
      
      // Load existing sessions into memory
      this.loadSessionsFromDatabase();
    } catch (error) {
      console.error(`[SessionStore] Failed to initialize database schema:`, error);
      throw error;
    }
  }

  private loadSessionsFromDatabase(): void {
    try {
      const stmt = this.db.prepare('SELECT * FROM sessions');
      const rows = stmt.all() as SessionData[];
      
      console.log(`[SessionStore] Found ${rows.length} sessions in database`);
      
      for (const row of rows) {
        try {
          this.sessions.set(row.sessionId, row);
          console.log(`[SessionStore] Loaded session ${row.sessionId}`);
        } catch (error) {
          console.warn(`[SessionStore] Failed to load session ${row.sessionId}:`, error);
          // Remove corrupted session
          this.deleteFromDatabase(row.sessionId);
        }
      }
    } catch (error) {
      console.error('[SessionStore] Failed to load sessions from database:', error);
    }
  }

  set(sessionId: string, sessionData: SessionData): void {
    // Store in memory
    this.sessions.set(sessionId, sessionData);
    
    // Store in database
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO sessions (sessionId, createdAt, lastAccessedAt, mcpServerData, oauthTokens)
      VALUES (?, ?, ?, ?, ?)
    `);
    
    stmt.run(sessionId, sessionData.createdAt, sessionData.lastAccessedAt, 
              sessionData.mcpServerData || null, 
              sessionData.oauthTokens || null);
  }

  get(sessionId: string): SessionData | undefined {
    const session = this.sessions.get(sessionId);
    
    if (session) {
      // Update last accessed time
      this.updateLastAccessed(sessionId);
      return session;
    }
    
    return undefined;
  }

  has(sessionId: string): boolean {
    return this.sessions.has(sessionId);
  }

  delete(sessionId: string): boolean {
    const deleted = this.sessions.delete(sessionId);
    if (deleted) {
      this.deleteFromDatabase(sessionId);
    }
    return deleted;
  }

  private updateLastAccessed(sessionId: string): void {
    const stmt = this.db.prepare('UPDATE sessions SET lastAccessedAt = ? WHERE sessionId = ?');
    stmt.run(Date.now(), sessionId);
  }

  // Add method to handle MCP server data
  setMcpServerData(sessionId: string, data: string): void {
    const stmt = this.db.prepare('UPDATE sessions SET mcpServerData = ? WHERE sessionId = ?');
    stmt.run(data, sessionId);
  }

  getMcpServerData(sessionId: string): string | null {
    const stmt = this.db.prepare('SELECT mcpServerData FROM sessions WHERE sessionId = ?');
    const result = stmt.get(sessionId) as { mcpServerData: string | null } | undefined;
    return result?.mcpServerData || null;
  }

  // OAuth token management methods
  setOAuthToken(state: string, tokenData: OAuthTokenData): void {
    const tokenDataString = JSON.stringify(tokenData);
    
    // Preserve existing authorization request data if it exists
    const existingSession = this.sessions.get(state);
    
    // Store in database - preserve existing mcpServerData
    const stmt = this.db.prepare(`
      UPDATE sessions SET 
        lastAccessedAt = ?, 
        oauthTokens = ? 
      WHERE sessionId = ?
    `);
    
    stmt.run(Date.now(), tokenDataString, state);
    
    // Store in memory - preserve existing mcpServerData
    this.sessions.set(state, {
      sessionId: state,
      createdAt: existingSession?.createdAt || Date.now(),
      lastAccessedAt: Date.now(),
      mcpServerData: existingSession?.mcpServerData || null,
      oauthTokens: tokenDataString
    });
  }

  getOAuthToken(state: string): OAuthTokenData | null {
    try {
      // First check memory
      let session = this.sessions.get(state);
      
      if (!session || !session.oauthTokens) {
        // Check database
        const stmt = this.db.prepare('SELECT oauthTokens FROM sessions WHERE sessionId = ?');
        const result = stmt.get(state) as { oauthTokens: string | null } | undefined;
        
        if (!result?.oauthTokens) {
          return null;
        }
        
        // Load from database into memory
        session = this.sessions.get(state) || {
          sessionId: state,
          createdAt: Date.now(),
          lastAccessedAt: Date.now(),
          oauthTokens: result.oauthTokens
        };
        this.sessions.set(state, session);
      }
      
      const tokenData = JSON.parse(session.oauthTokens!) as OAuthTokenData;
      
      // Check if token is expired
      if (tokenData.expires_at && Date.now() > tokenData.expires_at) {
        this.deleteOAuthToken(state);
        return null;
      }
      
      // Update last accessed time
      this.updateLastAccessed(state);
      
      return tokenData;
    } catch (error) {
      console.error(`[SessionStore] Failed to parse OAuth token for state ${state}:`, error);
      this.deleteOAuthToken(state);
      return null;
    }
  }

  deleteOAuthToken(state: string): boolean {
    const deleted = this.sessions.delete(state);
    if (deleted) {
      this.deleteFromDatabase(state);
    }
    return deleted;
  }

  // OAuth authorization request data management
  setOAuthAuthRequest(state: string, authRequestData: OAuthAuthRequestData): void {
    const authRequestString = JSON.stringify(authRequestData);
    
    // Store in database 
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO sessions (sessionId, createdAt, lastAccessedAt, mcpServerData, oauthTokens)
      VALUES (?, ?, ?, ?, ?)
    `);
    
    stmt.run(state, Date.now(), Date.now(), authRequestString, null);
    
    // Store in memory
    this.sessions.set(state, {
      sessionId: state,
      createdAt: Date.now(),
      lastAccessedAt: Date.now(),
      mcpServerData: authRequestString
    });
  }

  getOAuthAuthRequest(state: string): OAuthAuthRequestData | null {
    try {
      // First check memory
      let session = this.sessions.get(state);
      
      if (!session || !session.mcpServerData) {
        // Check database
        const stmt = this.db.prepare('SELECT mcpServerData FROM sessions WHERE sessionId = ?');
        const result = stmt.get(state) as { mcpServerData: string | null } | undefined;
        
        if (!result?.mcpServerData) {
          return null;
        }
        
        // Load from database into memory
        session = this.sessions.get(state) || {
          sessionId: state,
          createdAt: Date.now(),
          lastAccessedAt: Date.now(),
          mcpServerData: result.mcpServerData
        };
        this.sessions.set(state, session);
      }
      
      return JSON.parse(session.mcpServerData!) as OAuthAuthRequestData;
    } catch (error) {
      console.error(`[SessionStore] Failed to parse OAuth auth request for state ${state}:`, error);
      return null;
    }
  }

  deleteOAuthAuthRequest(state: string): boolean {
    const deleted = this.sessions.delete(state);
    if (deleted) {
      this.deleteFromDatabase(state);
    }
    return deleted;
  }

  private deleteFromDatabase(sessionId: string): void {
    const stmt = this.db.prepare('DELETE FROM sessions WHERE sessionId = ?');
    stmt.run(sessionId);
  }

  // Cleanup old sessions (older than 24 hours)
  cleanup(): void {
    const cutoff = Date.now() - (24 * 60 * 60 * 1000); // 24 hours ago
    const stmt = this.db.prepare('DELETE FROM sessions WHERE lastAccessedAt < ?');
    const result = stmt.run(cutoff);
    
    if (result.changes > 0) {
      console.log(`[SessionStore] Cleaned up ${result.changes} old sessions`);
    }
  }

  // Get session count
  getSessionCount(): number {
    return this.sessions.size;
  }

  // Close database connection
  close(): void {
    this.db.close();
  }
}
