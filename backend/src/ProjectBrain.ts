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
  /**
   * Request handler for the Durable Object.
   */
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const method = request.method;

    if (request.headers.get('Upgrade') === 'websocket') {
      return this.handleWebSocket();
    }

    // GET /sync
    if (url.pathname === '/sync' && method === 'GET') {
      return this.handleSyncGet(request, url);
    }

    // POST /sync
    if (url.pathname === '/sync' && method === 'POST') {
      return this.handleSyncPost(request);
    }

    // POST /task
    if (url.pathname === '/task' && method === 'POST') {
      return this.handleTaskPost(request);
    }

    return new Response('Not Found', { status: 404 });
  }

  /**
   * Handles WebSocket upgrades.
   */
  private handleWebSocket(): Response {
    const pair = new WebSocketPair();
    this.state.acceptWebSocket(pair[1]);
    this.webSockets.add(pair[1]);
    return new Response(null, { status: 101, webSocket: pair[0] });
  }

  /**
   * Handles GET /sync requests with ETag and Delta Sync.
   */
  private handleSyncGet(request: Request, url: URL): Response {
    const since = url.searchParams.get('since');

    const projects = this.sql
      .exec('SELECT id, name FROM projects')
      .toArray();

    let tasksQuery = 'SELECT id, projectId, title, status, createdAt, updatedAt FROM tasks';
    let tasksParams: any[] = [];

    if (since) {
      tasksQuery += ' WHERE updatedAt > ?';
      tasksParams.push(since);
    }

    const tasks = this.sql.exec(tasksQuery, ...tasksParams).toArray();
    const body = JSON.stringify({ projects, tasks });

    // Generate weak ETag
    const eTag = `W/"${body.length}-${tasks.length}-${since || 'all'}"`;

    if (request.headers.get('If-None-Match') === eTag) {
      return new Response(null, { status: 304, headers: { ETag: eTag } });
    }

    return new Response(body, {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=5, stale-while-revalidate=30',
        'ETag': eTag,
      },
    });
  }

  /**
   * Handles POST /sync requests for bulk upserts.
   */
  private async handleSyncPost(request: Request): Promise<Response> {
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

  /**
   * Handles POST /task requests for single task upserts.
   */
  private async handleTaskPost(request: Request): Promise<Response> {
    const task = (await request.json()) as Partial<CMSTask>;

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
  /**
   * Broadcasts a message to all connected WebSocket clients.
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
