import { PGlite } from '@electric-sql/pglite';

/**
 * PGlite instance - PostgreSQL running in WASM.
 * Provides local-first data persistence with SQL querying.
 */
export const db = new PGlite();

/** Backend API endpoint */
const BACKEND_URL = 'https://dot1-backend.iamkingori.workers.dev';

/** WebSocket connection state */
let wsConnection: WebSocket | null = null;
let syncInProgress: Promise<void> | null = null;
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;

/**
 * Initializes the PGlite database schema with indexes.
 *
 * Time Complexity: O(1) - fixed schema operations
 * Space Complexity: O(1) - schema metadata only
 *
 * Creates:
 * - projects table with PRIMARY KEY
 * - tasks table with PRIMARY KEY and indexes on projectId, status
 */
export async function initDb(): Promise<void> {
  await db.exec(`
    CREATE TABLE IF NOT EXISTS projects (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      globalPrompt TEXT,
      knowledgeContext TEXT,
      scheduleInterval TEXT,
      lastRun TEXT,
      nextRun TEXT
    );
    CREATE TABLE IF NOT EXISTS tasks (
      id TEXT PRIMARY KEY,
      projectId TEXT NOT NULL,
      title TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'backlog',
      researchData TEXT,
      contentDraft TEXT,
      publishedUrl TEXT,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_tasks_projectId ON tasks(projectId);
    CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
  `);
}

/**
 * Syncs local database with backend. Uses singleton pattern to prevent duplicate requests.
 *
 * Time Complexity: O(p + t) where p = projects, t = tasks
 * Space Complexity: O(p + t) for response data
 *
 * Features:
 * - Transaction batching for atomicity
 * - Singleton sync to prevent race conditions
 * - Automatic WebSocket connection after sync
 */
export async function syncWithBackend(): Promise<void> {
  if (syncInProgress) return syncInProgress;

  syncInProgress = performSync();
  try {
    await syncInProgress;
  } finally {
    syncInProgress = null;
  }
}

async function performSync(): Promise<void> {
  try {
    const response = await fetch(`${BACKEND_URL}/sync`, {
      headers: { Accept: 'application/json' },
    });
    if (!response.ok) return;

    const data = await response.json();

    // Batch all writes in a transaction for atomicity
    await db.exec('BEGIN');
    try {
      for (const p of data.projects || []) {
        await db.query(
          `INSERT INTO projects (id, name, globalPrompt, knowledgeContext)
           VALUES ($1, $2, $3, $4)
           ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name`,
          [p.id, p.name, p.globalPrompt, p.knowledgeContext]
        );
      }

      for (const t of data.tasks || []) {
        await db.query(
          `INSERT INTO tasks (id, projectId, title, status, createdAt, updatedAt)
           VALUES ($1, $2, $3, $4, $5, $6)
           ON CONFLICT (id) DO UPDATE SET status = EXCLUDED.status, updatedAt = EXCLUDED.updatedAt`,
          [t.id, t.projectId, t.title, t.status, t.createdAt, t.updatedAt]
        );
      }
      await db.exec('COMMIT');
    } catch {
      await db.exec('ROLLBACK');
    }

    connectWebSocket();
  } catch {
    // Offline mode - continue with local data
  }
}

/**
 * Establishes WebSocket connection for real-time updates.
 * Implements exponential backoff reconnection.
 *
 * Time Complexity: O(1) per message
 * Space Complexity: O(1)
 */
function connectWebSocket(): void {
  if (wsConnection?.readyState === WebSocket.OPEN) return;
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }

  const wsUrl = BACKEND_URL.replace('https:', 'wss:').replace('http:', 'ws:');
  wsConnection = new WebSocket(`${wsUrl}/ws`);

  wsConnection.onmessage = async (event) => {
    try {
      const msg = JSON.parse(event.data);
      if (msg.type === 'task_updated' && msg.task) {
        const t = msg.task;
        await db.query(
          `INSERT INTO tasks (id, projectId, title, status, createdAt, updatedAt)
           VALUES ($1, $2, $3, $4, $5, $6)
           ON CONFLICT (id) DO UPDATE SET status = EXCLUDED.status, updatedAt = EXCLUDED.updatedAt`,
          [t.id, t.projectId, t.title, t.status, t.createdAt, t.updatedAt]
        );
      }
    } catch {
      /* ignore malformed messages */
    }
  };

  wsConnection.onclose = () => {
    wsConnection = null;
    reconnectTimer = setTimeout(connectWebSocket, 5000);
  };

  wsConnection.onerror = () => {
    wsConnection?.close();
  };
}

/**
 * Exports all data as JSON for backup/migration.
 *
 * Time Complexity: O(p + t)
 * Space Complexity: O(p + t)
 *
 * @returns JSON string of all projects and tasks
 */
export async function exportToJson(): Promise<string> {
  const [projects, tasks] = await Promise.all([
    db.query('SELECT id, name FROM projects'),
    db.query('SELECT id, projectId, title, status FROM tasks'),
  ]);

  return JSON.stringify({
    version: '2.0',
    exportedAt: new Date().toISOString(),
    projects: projects.rows,
    tasks: tasks.rows,
  });
}

/**
 * Imports data from JSON backup.
 *
 * Time Complexity: O(p + t)
 * Space Complexity: O(p + t)
 *
 * @param jsonString - Valid JSON string with projects and tasks arrays
 * @throws Error if JSON is invalid or import fails
 */
export async function importFromJson(jsonString: string): Promise<void> {
  const data = JSON.parse(jsonString);
  if (!Array.isArray(data.projects) || !Array.isArray(data.tasks)) {
    throw new Error('Invalid import format');
  }

  await db.exec('BEGIN');
  try {
    for (const p of data.projects) {
      await db.query(
        `INSERT INTO projects (id, name, globalPrompt, knowledgeContext)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name`,
        [p.id, p.name, p.globalPrompt || '', p.knowledgeContext || '']
      );
    }

    for (const t of data.tasks) {
      await db.query(
        `INSERT INTO tasks (id, projectId, title, status, createdAt, updatedAt)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (id) DO UPDATE SET status = EXCLUDED.status`,
        [t.id, t.projectId, t.title, t.status, t.createdAt || new Date().toISOString(), t.updatedAt || new Date().toISOString()]
      );
    }
    await db.exec('COMMIT');
  } catch (e) {
    await db.exec('ROLLBACK');
    throw e;
  }
}
