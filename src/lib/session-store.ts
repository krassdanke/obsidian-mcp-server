import Database from 'better-sqlite3';
import { promises as fs } from 'fs';
import path from 'path';

export interface SessionData {
  sessionId: string;
  createdAt: number;
  lastAccessedAt: number;
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
          mcpServerData TEXT
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
      INSERT OR REPLACE INTO sessions (sessionId, createdAt, lastAccessedAt, mcpServerData)
      VALUES (?, ?, ?, ?)
    `);
    
    stmt.run(sessionId, sessionData.createdAt, sessionData.lastAccessedAt, null);
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
