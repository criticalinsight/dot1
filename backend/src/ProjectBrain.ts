import { CMSTask } from '../../shared/types';

/**
 * ProjectBrain - Durable Object for project and task state management.
 *
 * Architecture: Single-threaded execution with SQLite persistence.
 * All operations are atomic within the Durable Object context.
 *
 * Performance Characteristics:
 * - Read: O(log n) via B-tree index
 * - Write: O(log n) for B-tree insertion
 * - Sync: O(n) for full state export
 */
export class ProjectBrain {
  private sql: SqlStorage;
  private webSockets = new Set<WebSocket>();

  /**
   * Initializes the Durable Object with SQLite storage.
   *
   * @param state - Durable Object state provider
   * @param env - Environment bindings
   */
  constructor(private state: DurableObjectState, private env: unknown) {
    this.sql = state.storage.sql;
    this.initializeSchema();
  }

  /**
   * Creates database schema with optimized indexes.
   *
   * Time Complexity: O(1) - fixed schema
   * Space Complexity: O(1) - metadata only
   *
   * Indexes:
   * - idx_tasks_projectId: Fast project filtering
   * - idx_tasks_status: Fast status grouping
   */
  private initializeSchema(): void {
    this.sql.exec(`
      CREATE TABLE IF NOT EXISTS projects(
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        globalPrompt TEXT,
        knowledgeContext TEXT,
        scheduleInterval TEXT,
        lastRun TEXT,
        nextRun TEXT
      );
      CREATE TABLE IF NOT EXISTS tasks(
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
   * Request handler for the Durable Object.
   *
   * Routes:
   * - GET /sync: Returns all projects and tasks
   * - POST /sync: Bulk upserts projects
   * - POST /task: Single task upsert
   * - WebSocket upgrade: Real-time sync
   *
   * @param request - Incoming HTTP request
   * @returns HTTP response
   */
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const method = request.method;

    // WebSocket upgrade for real-time sync
    if (request.headers.get('Upgrade') === 'websocket') {
      const pair = new WebSocketPair();
      this.state.acceptWebSocket(pair[1]);
      this.webSockets.add(pair[1]);
      return new Response(null, { status: 101, webSocket: pair[0] });
    }

    // GET /sync - Fetch all data with caching
    // Time: O(n), Space: O(n)
    if (url.pathname === '/sync' && method === 'GET') {
      const projects = this.sql
        .exec('SELECT id, name FROM projects')
        .toArray();
      const tasks = this.sql
        .exec('SELECT id, projectId, title, status, createdAt, updatedAt FROM tasks')
        .toArray();

      return new Response(JSON.stringify({ projects, tasks }), {
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'public, max-age=5, stale-while-revalidate=30',
        },
      });
    }

    // POST /sync - Bulk project upsert
    // Time: O(p), Space: O(1) per insert
    if (url.pathname === '/sync' && method === 'POST') {
      const data = (await request.json()) as { projects?: unknown[] };

      if (Array.isArray(data.projects)) {
        for (const p of data.projects) {
          if (typeof p === 'object' && p !== null && 'id' in p && 'name' in p) {
            const proj = p as Record<string, unknown>;
            this.sql.exec(
              'INSERT OR REPLACE INTO projects (id, name, globalPrompt, knowledgeContext, scheduleInterval) VALUES (?, ?, ?, ?, ?)',
              String(proj.id),
              String(proj.name),
              proj.globalPrompt ? String(proj.globalPrompt) : null,
              proj.knowledgeContext ? String(proj.knowledgeContext) : null,
              proj.scheduleInterval ? String(proj.scheduleInterval) : null
            );
          }
        }
      }
      return Response.json({ status: 'ok' });
    }

    // POST /task - Single task upsert with validation
    // Time: O(log n), Space: O(1)
    if (url.pathname === '/task' && method === 'POST') {
      const task = (await request.json()) as Partial<CMSTask>;

      // Input validation - security check
      if (!task.id || typeof task.id !== 'string' || task.id.length > 100) {
        return new Response('Invalid task id', { status: 400 });
      }
      if (!task.title || typeof task.title !== 'string' || task.title.length > 500) {
        return new Response('Invalid task title', { status: 400 });
      }
      if (!task.projectId || typeof task.projectId !== 'string') {
        return new Response('Invalid projectId', { status: 400 });
      }

      const now = new Date().toISOString();
      const status = task.status || 'backlog';
      const createdAt = task.createdAt || now;
      const updatedAt = task.updatedAt || now;

      this.sql.exec(
        'INSERT OR REPLACE INTO tasks (id, projectId, title, status, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?)',
        task.id,
        task.projectId,
        task.title,
        status,
        createdAt,
        updatedAt
      );

      this.broadcast({
        type: 'task_updated',
        task: { id: task.id, projectId: task.projectId, title: task.title, status, createdAt, updatedAt },
      });

      return Response.json({ status: 'ok' });
    }

    return new Response('Not Found', { status: 404 });
  }

  /**
   * Broadcasts a message to all connected WebSocket clients.
   *
   * Time Complexity: O(c) where c = connected clients
   * Space Complexity: O(1)
   *
   * @param message - Object to broadcast as JSON
   */
  private broadcast(message: object): void {
    const data = JSON.stringify(message);
    for (const ws of this.webSockets) {
      try {
        ws.send(data);
      } catch {
        this.webSockets.delete(ws);
      }
    }
  }
}
