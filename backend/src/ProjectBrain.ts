import { CMSTask, CMSProject } from '../../shared/types';
import { DeepResearchClient } from './deepResearch';
import { getPromptForTask } from './prompts';

interface Env {
  GEMINI_API_KEY?: string;
}

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

    // POST /internal/cron/daily
    if (url.pathname === '/internal/cron/daily' && method === 'POST') {
      return this.handleDailyCron();
    }

    // POST /internal/seed-special
    if (url.pathname === '/internal/seed-special' && method === 'POST') {
      return this.handleSeedSpecial();
    }

    return new Response('Not Found', { status: 404 });
  }

  /**
   * Handles daily cron: Generates recurring tasks, then researches backlog.
   */
  private async handleDailyCron(): Promise<Response> {
    const apiKey = (this.env as Env).GEMINI_API_KEY;
    if (!apiKey) return new Response('Missing API Key', { status: 500 });

    try {
      // 1. Generate recurring tasks
      await this.generateRecurringTasks();

      // 2. Perform Deep Research on backlog
      return this.performDeepResearch(apiKey);
    } catch (e) {
      console.error('Daily Cron Failed:', e);
      return new Response('Internal Error', { status: 500 });
    }
  }

  /**
   * Seeds special tasks requested by user and triggers research.
   */
  private async handleSeedSpecial(): Promise<Response> {
    const tasks = [
      "List of today's MoneyAcademyKE tweets ranked by number of views",
      "List of Rotary Club meetings happening tomorrow within 30km radius of Nairobi",
      "List of prediction market content today- strategies, social media posts, interviews, news $",
      "List of wikipedia current events related to business, finance and economy topics. $",
      "List of top crypto content today- strategies, trends, news (sort by importance) $",
      "List of ai content- sentiment analysis $"
    ];

    const now = new Date().toISOString();
    const createdIds: string[] = [];

    for (const title of tasks) {
      const id = crypto.randomUUID();
      // Use a fixed 'seed-project' ID or just put them in a general bucket.
      // For now using a placeholder project ID 'p-special'
      const projectId = 'p-special';

      // Ensure project exists so constraint doesn't fail
      this.sql.exec("INSERT OR IGNORE INTO projects (id, name) VALUES (?, ?)", projectId, "Special Research");

      this.sql.exec(
        "INSERT INTO tasks (id, projectId, title, status, createdAt, updatedAt) VALUES (?, ?, ?, 'backlog', ?, ?)",
        id, projectId, title, now, now
      );

      this.broadcast({
        type: 'task_updated',
        task: { id, projectId, title, status: 'backlog', createdAt: now, updatedAt: now }
      });

      createdIds.push(id);
    }

    // Trigger research immediately (background)
    const apiKey = (this.env as Env).GEMINI_API_KEY;
    if (apiKey) {
      this.performDeepResearch(apiKey, createdIds); // Pass specific IDs to prioritize
    }

    return Response.json({ status: 'ok', tasks: createdIds });
  }

  /**
   * Generates new tasks for projects with active schedules.
   */
  private async generateRecurringTasks(): Promise<void> {
    const now = new Date();
    // Select projects due for run
    const dueProjects = this.sql
      .exec("SELECT * FROM projects WHERE scheduleInterval = 'daily' AND (nextRun IS NULL OR nextRun <= ?)", now.toISOString())
      .toArray() as unknown as CMSProject[];

    for (const proj of dueProjects) {
      const taskId = crypto.randomUUID();
      const dateStr = now.toISOString().split('T')[0];
      const title = `${proj.name} - ${dateStr}`;

      // Create new task in backlog
      this.sql.exec(
        "INSERT INTO tasks (id, projectId, title, status, createdAt, updatedAt) VALUES (?, ?, ?, 'backlog', ?, ?)",
        taskId,
        proj.id,
        title,
        now.toISOString(),
        now.toISOString()
      );

      // Update Project next run time (24h later)
      const nextRun = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString();
      this.sql.exec(
        "UPDATE projects SET lastRun = ?, nextRun = ? WHERE id = ?",
        now.toISOString(),
        nextRun,
        proj.id
      );

      this.broadcast({
        type: 'task_updated',
        task: { id: taskId, projectId: proj.id, title, status: 'backlog', createdAt: now.toISOString(), updatedAt: now.toISOString() }
      });
    }
  }

  /**
   * Performs deep research on tasks.
   * @param taskIds - Optional list of specific task IDs to research. If provided, ignores the 'backlog' limit check for these.
   */
  private async performDeepResearch(apiKey: string, taskIds?: string[]): Promise<Response> {
    let candidates: CMSTask[] = [];

    if (taskIds && taskIds.length > 0) {
      // Fetch specific tasks requested
      const placeholders = taskIds.map(() => '?').join(',');
      candidates = this.sql.exec(`SELECT * FROM tasks WHERE id IN (${placeholders})`, ...taskIds).toArray() as unknown as CMSTask[];
    } else {
      // Default backlog fetch
      candidates = this.sql
        .exec("SELECT * FROM tasks WHERE status = 'backlog' AND (researchData IS NULL OR researchData = '') LIMIT 5")
        .toArray() as unknown as CMSTask[];
    }

    if (candidates.length === 0) {
      return Response.json({ status: 'ok', message: 'No tasks to research' });
    }

    const client = new DeepResearchClient(apiKey);

    // Process one by one or batch?
    // The prompts are very different now. Better to run them individually or grouped by prompt type.
    // Deep Research Agent can handle multiple questions, but mixing "Rotary" and "Crypto" in one prompt might confuse it or hit output limits.
    // Let's run them individually for reliability in this "Advanced" mode.

    for (const task of candidates) {
      const systemPrompt = getPromptForTask(task.title);
      const userMessage = `Task: ${task.title}`;
      const fullPrompt = `${systemPrompt}\n\n${userMessage}`;

      try {
        const opName = await client.startResearch(fullPrompt);

        // Polling asynchronously - we don't await the result here to avoid blocking other tasks if we were serial.
        // But since we're in a loop, we likely have to wait or spawn multiple promises.
        // Cloudflare DO can handle multiple async operations.

        // We'll wait for each to ensure we don't hit rate limits too hard.
        const result = await client.pollOperation(opName);

        if (result && result.text) {
          this.sql.exec(
            "UPDATE tasks SET researchData = ?, updatedAt = ? WHERE id = ?",
            result.text,
            new Date().toISOString(),
            task.id
          );

          // Broadcast
          const updated = this.sql.exec("SELECT * FROM tasks WHERE id = ?", task.id).one() as unknown as CMSTask;
          if (updated) this.broadcast({ type: 'task_updated', task: updated });
        }
      } catch (error) {
        console.error(`Research failed for task ${task.id}:`, error);
        // Continue to next task
      }
    }

    return Response.json({ status: 'ok', processed: candidates.length });
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
