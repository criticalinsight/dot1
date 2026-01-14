import { CMSTask, CMSProject } from '../../shared/types';
import { DeepResearchClient } from './deepResearch';
import { getPromptForTask } from './prompts';

interface Env {
  GEMINI_API_KEY?: string;
  TELEGRAM_BOT_TOKEN?: string;
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
        prompt TEXT,
        status TEXT NOT NULL DEFAULT 'backlog',
        model TEXT,
        output TEXT,
        tokenUsage TEXT, 
        parameters TEXT,
        history TEXT,
        researchData TEXT,
        contentDraft TEXT,
        publishedUrl TEXT,
        createdAt TEXT NOT NULL,
        updatedAt TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS system_settings(
        key TEXT PRIMARY KEY,
        value TEXT
      );
      CREATE INDEX IF NOT EXISTS idx_tasks_projectId ON tasks(projectId);
      CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
    `);

    // Migration for existing tables: Add new columns if missing
    try {
      this.sql.exec("ALTER TABLE tasks ADD COLUMN prompt TEXT");
      this.sql.exec("ALTER TABLE tasks ADD COLUMN model TEXT");
      this.sql.exec("ALTER TABLE tasks ADD COLUMN output TEXT");
      this.sql.exec("ALTER TABLE tasks ADD COLUMN tokenUsage TEXT");
      this.sql.exec("ALTER TABLE tasks ADD COLUMN parameters TEXT");
      this.sql.exec("ALTER TABLE tasks ADD COLUMN history TEXT");
    } catch (e) {
      // Ignored: Columns likely exist
    }
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

    // POST /telegram/webhook
    if (url.pathname === '/telegram/webhook' && method === 'POST') {
      return this.handleTelegramWebhook(request);
    }

    // POST /internal/debug-research
    if (url.pathname === '/internal/debug-research' && method === 'POST') {
      return this.handleDebugResearch();
    }

    return new Response('Not Found', { status: 404 });
  }

  /**
   * Handles Telegram Webhook updates.
   */
  private async handleTelegramWebhook(request: Request): Promise<Response> {
    const token = (this.env as Env).TELEGRAM_BOT_TOKEN;
    if (!token) return new Response('Missing Token', { status: 500 });

    try {
      const update = await request.json() as any;
      if (update.message && update.message.text && update.message.chat) {
        const chatId = String(update.message.chat.id);
        const text = update.message.text;

        if (text === '/start') {
          // Save Chat ID
          this.sql.exec("INSERT OR REPLACE INTO system_settings (key, value) VALUES ('telegram_chat_id', ?)", chatId);
          await this.sendTelegramMessage(token, chatId, "✅ Subscribed! You will receive daily research reports here.");
        }
      }
      return new Response('OK');
    } catch (e) {
      console.error('Telegram Webhook Error:', e);
      return new Response('Error', { status: 500 });
    }
  }

  private async sendTelegramMessage(token: string, chatId: string, text: string): Promise<void> {
    const MAX_LENGTH = 4000; // Leave buffer for Telegram's 4096 limit
    for (let i = 0; i < text.length; i += MAX_LENGTH) {
      const chunk = text.slice(i, i + MAX_LENGTH);
      // Try/catch per chunk to avoid failing entire loop if one fails
      try {
        await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ chat_id: chatId, text: chunk }) // Removed parse_mode 'Markdown' to avoid breaking on unescaped characters in raw output
        });
      } catch (e) {
        console.error('Failed to send Telegram chunk:', e);
      }
    }
  }

  // Debug endpoint implementation
  private async handleDebugResearch(): Promise<Response> {
    const apiKey = (this.env as Env).GEMINI_API_KEY;
    if (!apiKey) return Response.json({ error: 'Missing API Key' }, { status: 500 });

    const client = new DeepResearchClient(apiKey);
    try {
      // Standard API is synchronous now
      const resultText = await client.startResearch("What is the capital of Kenya?");
      return Response.json({ status: 'success', result: { text: resultText } });
    } catch (e: any) {
      return Response.json({
        status: 'error',
        message: e.message,
        stack: e.stack
      }, { status: 500 });
    }
  }

  /**
   * Handles daily cron: Generates recurring tasks, then researches backlog.
   */
  private async handleDailyCron(): Promise<Response> {
    const apiKey = (this.env as Env).GEMINI_API_KEY;
    if (!apiKey) return new Response('Missing API Key', { status: 500 });

    try {
      await this.generateRecurringTasks();
      // Fire and forget research (or await if simple worker)
      // DO context allows async background work
      this.performDeepResearch(apiKey);
      return new Response('Cron Triggered');
    } catch (e) {
      console.error('Daily Cron Failed:', e);
      return new Response('Internal Error', { status: 500 });
    }
  }

  /**
   * Seeds special tasks as RECURRING DAILY PROJECTS.
   */
  private async handleSeedSpecial(): Promise<Response> {
    const definitions = [
      { name: "MoneyAcademy Analysis", title: "List of today's MoneyAcademyKE tweets ranked by number of views" },
      { name: "Rotary Club Scanner", title: "List of Rotary Club meetings happening tomorrow within 30km radius of Nairobi" },
      { name: "Prediction Markets Report", title: "List of prediction market content today- strategies, social media posts, interviews, news $" },
      { name: "Global Business Events", title: "List of wikipedia current events related to business, finance and economy topics. $" },
      { name: "Crypto Trends Analysis", title: "List of top crypto content today- strategies, trends, news (sort by importance) $" },
      { name: "AI Sentiment Daily", title: "List of ai content- sentiment analysis $" }
    ];

    const now = new Date().toISOString();
    const createdIds: string[] = [];

    for (const def of definitions) {
      // Deterministic ID based on name to prevent duplicates if seeded multiple times
      // Simple hash-like ID (not crypto secure but fine for this DB keyspace)
      const projectId = 'proj-' + def.name.replace(/\s+/g, '-').toLowerCase();

      // 1. Create/Update Project with DAILY schedule
      this.sql.exec(
        `INSERT OR REPLACE INTO projects (id, name, scheduleInterval, lastRun, nextRun)
         VALUES (?, ?, 'daily', ?, ?)`,
        projectId, def.name, now, new Date(Date.now() + 86400000).toISOString()
      );

      // 2. Create TODAY's task immediately (so user doesn't wait 24h)
      const taskId = crypto.randomUUID();
      this.sql.exec(
        "INSERT INTO tasks (id, projectId, title, status, createdAt, updatedAt) VALUES (?, ?, ?, 'draft', ?, ?)",
        taskId, projectId, def.title, now, now
      );

      this.broadcast({
        type: 'task_updated',
        task: { id: taskId, projectId, title: def.title, status: 'draft', createdAt: now, updatedAt: now }
      });

      createdIds.push(taskId);
    }

    // Trigger research immediately for these new tasks
    // const apiKey = (this.env as Env).GEMINI_API_KEY;
    // if (apiKey) {
    //   this.performDeepResearch(apiKey, createdIds);
    // }

    return Response.json({ status: 'ok', tasks: createdIds, message: "Projects set to daily" });
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

      // Create new task in draft
      this.sql.exec(
        "INSERT INTO tasks (id, projectId, title, status, createdAt, updatedAt) VALUES (?, ?, ?, 'draft', ?, ?)",
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
        task: { id: taskId, projectId: proj.id, title, status: 'draft', createdAt: now.toISOString(), updatedAt: now.toISOString() }
      });
    }
  }

  /**
   * Performs deep research on tasks.
   * @param taskIds - Optional list of specific task IDs to research. If provided, ignores the 'backlog' limit check for these.
   */
  private async performDeepResearch(apiKey: string, taskIds?: string[]): Promise<Response> {
    const telegramToken = (this.env as Env).TELEGRAM_BOT_TOKEN;
    let candidates: CMSTask[] = [];

    // Prioritize 'queued' status for processing
    // Legacy support: also check 'backlog' (now 'draft' effectively, but we use 'queued' for active processing)

    if (taskIds && taskIds.length > 0) {
      const placeholders = taskIds.map(() => '?').join(',');
      candidates = this.sql.exec(`SELECT * FROM tasks WHERE id IN (${placeholders})`, ...taskIds).toArray() as unknown as CMSTask[];
    } else {
      candidates = this.sql
        .exec("SELECT * FROM tasks WHERE status = 'queued' LIMIT 5")
        .toArray() as unknown as CMSTask[];
    }

    if (candidates.length === 0) {
      return Response.json({ status: 'ok', message: 'No queued tasks' });
    }

    const client = new DeepResearchClient(apiKey);

    const chatIdRow = this.sql.exec("SELECT value FROM system_settings WHERE key = 'telegram_chat_id'").one() as { value: string } | null;
    const chatId = chatIdRow?.value;

    for (const task of candidates) {
      // Switch to generating
      this.sql.exec("UPDATE tasks SET status = 'generating', updatedAt = ? WHERE id = ?", new Date().toISOString(), task.id);
      this.broadcast({ type: 'task_updated', task: { ...task, status: 'generating' } });

      const systemPrompt = getPromptForTask(task.title);
      // Use task.prompt if available, else fallback to title
      const userMessage = task.prompt ? `Task: ${task.prompt}` : `Task: ${task.title}`;
      const fullPrompt = `${systemPrompt}\n\n${userMessage}`;

      try {
        // Synchronous call to Gemini 3.0 Pro
        const resultText = await client.startResearch(fullPrompt);

        // Update task with result, status = deployed
        this.sql.exec(
          "UPDATE tasks SET output = ?, researchData = ?, status = 'deployed', updatedAt = ? WHERE id = ?",
          resultText, // New field
          resultText, // Legacy field
          new Date().toISOString(),
          task.id
        );

        const updated = this.sql.exec("SELECT * FROM tasks WHERE id = ?", task.id).one() as unknown as CMSTask;
        // Deserialize JSON fields for broadcast if we were doing that (but we send raw DB rows basically)
        // Note: Our DB has 'output' column now.
        if (updated) this.broadcast({ type: 'task_updated', task: updated });

        if (telegramToken && chatId) {
          const header = `📊 *Gemini Ops Complete*\n**${task.title}**\n\n`;
          await this.sendTelegramMessage(telegramToken, chatId, header + resultText);
        }
      } catch (error) {
        console.error(`Research failed for task ${task.id}:`, error);
        // Revert to draft or queued? Let's say draft on error
        this.sql.exec("UPDATE tasks SET status = 'draft' WHERE id = ?", task.id);
        this.broadcast({ type: 'task_updated', task: { ...task, status: 'draft' } });
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

    let tasksQuery = 'SELECT * FROM tasks'; // Select * to get new columns
    let tasksParams: any[] = [];

    if (since) {
      tasksQuery += ' WHERE updatedAt > ?';
      tasksParams.push(since);
    }

    const tasksRaw = this.sql.exec(tasksQuery, ...tasksParams).toArray();
    // Parse JSON fields
    const tasks = tasksRaw.map((t: any) => ({
      ...t,
      tokenUsage: t.tokenUsage ? JSON.parse(t.tokenUsage) : undefined,
      parameters: t.parameters ? JSON.parse(t.parameters) : undefined,
      history: t.history ? JSON.parse(t.history) : undefined,
    }));

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

    // Default projectId to 'default' if missing (migration safety)
    const projectId = task.projectId || 'default';

    const now = new Date().toISOString();
    const status = task.status || 'draft';
    const createdAt = task.createdAt || now;
    const updatedAt = task.updatedAt || now;

    this.sql.exec(
      `INSERT OR REPLACE INTO tasks (
        id, projectId, title, prompt, status, model, output, tokenUsage, parameters, history, 
        researchData, contentDraft, publishedUrl, createdAt, updatedAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      task.id,
      projectId,
      task.title,
      task.prompt || null,
      status,
      task.model || null,
      task.output || null,
      task.tokenUsage ? JSON.stringify(task.tokenUsage) : null,
      task.parameters ? JSON.stringify(task.parameters) : null,
      task.history ? JSON.stringify(task.history) : null,
      task.researchData || null,
      task.contentDraft || null,
      task.publishedUrl || null,
      createdAt,
      updatedAt
    );

    this.broadcast({
      type: 'task_updated',
      task: {
        id: task.id, projectId, title: task.title, prompt: task.prompt, status,
        model: task.model, output: task.output, tokenUsage: task.tokenUsage, parameters: task.parameters, history: task.history,
        createdAt, updatedAt
      },
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
