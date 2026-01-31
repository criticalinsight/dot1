import { CMSTask, CMSProject, PromptTemplate } from '../../shared/types';
import { DeepResearchClient } from './deepResearch';
import { getPromptForTask } from './prompts';
import { VelocityGenerator } from './Generator';
import { Slug } from './Slug';
import { Deployer } from './Deployer';
import { encode, decode } from '@msgpack/msgpack';
import { Syndicator } from './Syndicator';
import { DurableObject } from 'cloudflare:workers';

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
        slug TEXT,
        tags TEXT,
        model TEXT,
        output TEXT,
        tokenUsage TEXT, 
        parameters TEXT,
        history TEXT,
        researchData TEXT,
        contentDraft TEXT,
        publishedUrl TEXT,
        syndicatedAt TEXT,
        socialPayloads TEXT,
        createdAt TEXT NOT NULL,
        updatedAt TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS system_settings(
        key TEXT PRIMARY KEY,
        value TEXT
      );
      CREATE TABLE IF NOT EXISTS templates(
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        content TEXT NOT NULL,
        category TEXT,
        updatedAt TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_tasks_projectId ON tasks(projectId);
      CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
    `);

    // Migration for existing tables: Add new columns if missing
    try {
      this.sql.exec("ALTER TABLE tasks ADD COLUMN slug TEXT");
      this.sql.exec("ALTER TABLE tasks ADD COLUMN tags TEXT");
      this.sql.exec("ALTER TABLE tasks ADD COLUMN prompt TEXT");
      this.sql.exec("ALTER TABLE tasks ADD COLUMN model TEXT");
      this.sql.exec("ALTER TABLE tasks ADD COLUMN output TEXT");
      this.sql.exec("ALTER TABLE tasks ADD COLUMN tokenUsage TEXT");
      this.sql.exec("ALTER TABLE tasks ADD COLUMN parameters TEXT");
      this.sql.exec("ALTER TABLE tasks ADD COLUMN history TEXT");
      this.sql.exec("ALTER TABLE tasks ADD COLUMN evalCriteria TEXT");
      this.sql.exec("ALTER TABLE tasks ADD COLUMN evalResults TEXT");
      this.sql.exec("ALTER TABLE tasks ADD COLUMN syndicatedAt TEXT");
      this.sql.exec("ALTER TABLE tasks ADD COLUMN socialPayloads TEXT");
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
      const pair = new WebSocketPair();
      this.state.acceptWebSocket(pair[1]);
      return new Response(null, { status: 101, webSocket: pair[0] });
    }

    // GET /sync
    if (url.pathname === '/sync' && method === 'GET') {
      return this.handleSyncGet(request, url);
    }

    // GET /public/insights
    if (url.pathname === '/public/insights' && method === 'GET') {
      return this.handlePublicInsights();
    }

    // POST /sync
    if (url.pathname === '/sync' && method === 'POST') {
      return this.handleSyncPost(request);
    }

    // POST /generate
    if (url.pathname === '/generate' && method === 'POST') {
      return this.handleGeneratePost(request);
    }

    // POST /deploy
    if (url.pathname === '/deploy' && method === 'POST') {
      return this.handleDeployPost(request);
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

    // POST /internal/reset-queue
    if (url.pathname === '/internal/reset-queue' && method === 'POST') {
      return this.handleResetQueue();
    }

    // POST /syndicate/:taskId
    if (url.pathname.startsWith('/syndicate/') && method === 'POST') {
      const taskId = url.pathname.split('/')[2];
      return this.handleSyndicatePost(request, taskId);
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
          await this.sendTelegramMessage(token, chatId, "✅ Subscribed! You will receive daily research reports here.\n\nType /help to see what I can do.");
        } else if (text === '/status') {
          const stats = this.sql.exec(`
            SELECT 
              COUNT(*) as total,
              SUM(CASE WHEN status = 'deployed' THEN 1 ELSE 0 END) as deployed,
              SUM(CASE WHEN status = 'generating' THEN 1 ELSE 0 END) as generating,
              SUM(CASE WHEN status = 'queued' THEN 1 ELSE 0 END) as queued
            FROM tasks
          `).one() as any;

          const msg = `📊 *Gemini Ops Status*\n\n` +
            `Total Tasks: ${stats.total}\n` +
            `✅ Deployed: ${stats.deployed}\n` +
            `⚡ Generating: ${stats.generating}\n` +
            `⏳ Queued: ${stats.queued}`;
          await this.sendTelegramMessage(token, chatId, msg);
        } else if (text === '/list') {
          const recent = this.sql.exec("SELECT title, status FROM tasks ORDER BY updatedAt DESC LIMIT 5").toArray() as any[];
          const list = recent.map(t => `${t.status === 'deployed' ? '✅' : '⏳'} ${t.title}`).join('\n');
          await this.sendTelegramMessage(token, chatId, `📜 *Recent Activity*\n\n${list || 'No tasks found.'}`);
        } else if (text === '/help') {
          const help = `🧙🏾‍♂️ *Gemini Ops Bot*\n\n` +
            `/status - Current research pipeline metrics\n` +
            `/list - View the 5 most recent tasks\n` +
            `/help - Display this command list`;
          await this.sendTelegramMessage(token, chatId, help);
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
  private async handleDebugResearch(request: Request): Promise<Response> {
    const apiKey = (this.env as Env).GEMINI_API_KEY;
    if (!apiKey) return Response.json({ error: 'Missing API Key' }, { status: 500 });

    let prompt = "What is the capital of Kenya?";
    try {
      const cloned = request.clone();
      const body = await cloned.json() as { prompt?: string };
      if (body.prompt) prompt = body.prompt;
    } catch {
      // Use default if no body
    }

    const client = new DeepResearchClient(apiKey);
    try {
      // Standard API is synchronous now
      const resultText = await client.startResearch(prompt);
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
      // Trigger multiple individual research tasks in parallel
      for (let i = 0; i < 5; i++) {
        this.state.waitUntil(this.performDeepResearch(apiKey));
      }
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
   * Resets generating and draft tasks back to queued.
   */
  private async handleResetQueue(): Promise<Response> {
    this.sql.exec("UPDATE tasks SET status = 'queued' WHERE status IN ('generating', 'draft')");
    return Response.json({ status: 'ok', message: 'Queue reset' });
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
   * Scans a prompt for {{taskId}} and replaces with actual task output.
   */
  private resolvePromptVariables(prompt: string, projectId: string): string {
    const regex = /\{\{([a-zA-Z0-9-]+)\}\}/g;
    return prompt.replace(regex, (match, taskId) => {
      const taskRow = this.sql.exec("SELECT output FROM tasks WHERE id = ? AND projectId = ?", taskId, projectId).one() as { output: string } | null;
      if (taskRow && taskRow.output) {
        return `[Context from Task ${taskId}]:\n${taskRow.output}\n`;
      }
      return match; // Keep as is if not found
    });
  }

  /**
   * Performs deep research on tasks.
   * @param taskIds - Optional list of specific task IDs to research. If provided, ignores the 'backlog' limit check for these.
   */
  private async performDeepResearch(apiKey: string, taskIds?: string[]): Promise<Response> {
    const telegramToken = (this.env as Env).TELEGRAM_BOT_TOKEN;
    let candidates: CMSTask[] = [];

    if (taskIds && taskIds.length > 0) {
      const placeholders = taskIds.map(() => '?').join(',');
      candidates = this.sql.exec(`SELECT * FROM tasks WHERE id IN (${placeholders})`, ...taskIds).toArray() as unknown as CMSTask[];
    } else {
      candidates = this.sql
        .exec("SELECT * FROM tasks WHERE status = 'queued' LIMIT 1")
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
      // Resolve variable injection for prompt chaining
      const userMessage = task.prompt ? `Task: ${task.prompt}` : `Task: ${task.title}`;
      const resolvedUserMessage = this.resolvePromptVariables(userMessage, task.projectId);
      const fullPrompt = `${systemPrompt}\n\n${resolvedUserMessage}`;

      try {
        // --- STREAMING RE-ARCH ---
        let fullResultText = '';
        const stream = client.streamResearch(fullPrompt);

        for await (const chunk of stream) {
          fullResultText += chunk;
          // Broadcast chunk to all clients for real-time UI
          this.broadcast({
            type: 'task_stream_chunk',
            taskId: task.id,
            chunk: chunk,
            accumulated: fullResultText
          });
        }

        // Update task with final result, status = deployed
        const now = new Date().toISOString();
        this.sql.exec(
          "UPDATE tasks SET output = ?, researchData = ?, status = 'deployed', updatedAt = ? WHERE id = ?",
          fullResultText,
          fullResultText,
          now,
          task.id
        );

        const updated = this.sql.exec("SELECT * FROM tasks WHERE id = ?", task.id).toArray()[0] as unknown as CMSTask;

        // --- GENERATOR INTEGRATION ---
        const project = this.sql.exec("SELECT * FROM projects WHERE id = ?", task.projectId).toArray()[0] as unknown as CMSProject;
        if (updated && project) {
          const formattedReport = VelocityGenerator.generateReport(updated, project);
          // Use formatted report for Telegram
          if (telegramToken && chatId) {
            await this.sendTelegramMessage(telegramToken, chatId, formattedReport);
          }
        }
        // -----------------------------

        if (updated) this.broadcast({ type: 'task_updated', task: updated });

        // --- AUTO-KNOWLEDGE UPDATE ---
        // Extract top-level insights and add to project meta-knowledge
        if (fullResultText.length > 500) {
          const knowledgeKey = `knowledge_${task.projectId}`;
          // Append brief snippet of new insight
          const newInsight = `\n- Insight from "${task.title}": ${fullResultText.substring(0, 200)}...`;
          this.sql.exec(
            "INSERT INTO system_settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = value || EXCLUDED.value",
            knowledgeKey,
            newInsight
          );
        }
        // -----------------------------
      } catch (error: any) {
        console.error(`Research failed for task ${task.id}:`, error);
        // Save error to history for debugging
        const errorMsg = error.message || String(error);
        this.sql.exec(
          "UPDATE tasks SET status = 'draft', history = ?, updatedAt = ? WHERE id = ?",
          JSON.stringify([{ type: 'error', message: errorMsg, timestamp: new Date().toISOString() }]),
          new Date().toISOString(),
          task.id
        );
        this.broadcast({ type: 'task_updated', task: { ...task, status: 'draft' } });
      }
    }

    return Response.json({ status: 'ok', processed: candidates.length });
  }

  /**
   * Cloudflare Durable Object WebSocket Message Handler
   */
  async webSocketMessage(ws: WebSocket, message: string | ArrayBuffer): Promise<void> {
    try {
      const data = decode(message as ArrayBuffer) as any;

      if (data.type === 'SYNC_REQ') {
        await this.handleWsSyncReq(ws, data);
      } else if (data.type === 'UPSERT_TASK') {
        await this.handleWsUpsertTask(ws, data.task);
      } else if (data.type === 'PATCH_TASK') {
        await this.handleWsPatchTask(ws, data.taskId, data.delta, data.updatedAt);
      } else if (data.type === 'UPSERT_PROJECT') {
        await this.handleWsUpsertProject(ws, data.project);
      } else if (data.type === 'UPSERT_TEMPLATE') {
        await this.handleWsUpsertTemplate(ws, data.template);
      }
    } catch (e) {
      console.error('WS Message Error:', e);
    }
  }

  private async handleWsSyncReq(ws: WebSocket, data: { since?: string }): Promise<void> {
    const since = data.since || '1970-01-01T00:00:00.000Z';

    const projects = this.sql.exec('SELECT * FROM projects').toArray();
    const tasksRaw = this.sql.exec('SELECT * FROM tasks WHERE updatedAt > ?', since).toArray();

    const tasks = tasksRaw.map((t: any) => ({
      ...t,
      tags: t.tags ? JSON.parse(t.tags) : undefined,
      tokenUsage: t.tokenUsage ? JSON.parse(t.tokenUsage) : undefined,
      parameters: t.parameters ? JSON.parse(t.parameters) : undefined,
      history: t.history ? JSON.parse(t.history) : undefined,
      evalCriteria: t.evalCriteria ? JSON.parse(t.evalCriteria) : undefined,
      evalResults: t.evalResults ? JSON.parse(t.evalResults) : undefined,
      socialPayloads: t.socialPayloads ? JSON.parse(t.socialPayloads) : undefined,
    }));

    const templates = this.sql.exec('SELECT * FROM templates').toArray();

    ws.send(encode({
      type: 'SYNC_RES',
      projects,
      tasks,
      templates
    }));
  }

  private async handleWsUpsertTask(ws: WebSocket, task: Partial<CMSTask>): Promise<void> {
    if (!task.id || !task.updatedAt) return;

    // LWW: Only update if incoming is newer
    const existing = this.sql.exec("SELECT updatedAt FROM tasks WHERE id = ?", task.id).one() as { updatedAt: string } | null;
    if (existing && existing.updatedAt >= task.updatedAt) {
      return; // Ignore older update
    }

    const projectId = task.projectId || 'default';
    const now = new Date().toISOString();

    this.sql.exec(
      `INSERT OR REPLACE INTO tasks (
        id, projectId, title, prompt, status, slug, tags, model, output, tokenUsage, parameters, history, 
        evalCriteria, evalResults,
        researchData, contentDraft, publishedUrl, createdAt, updatedAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      task.id, projectId, task.title || 'Untitled', task.prompt || null, task.status || 'draft',
      task.slug || Slug.slugify(task.title || 'Untitled'),
      task.tags ? JSON.stringify(task.tags) : null,
      task.model || null, task.output || null,
      task.tokenUsage ? JSON.stringify(task.tokenUsage) : null,
      task.parameters ? JSON.stringify(task.parameters) : null,
      JSON.stringify(task.history || []),
      JSON.stringify(task.evalCriteria || []),
      JSON.stringify(task.evalResults || []),
      task.researchData || null, task.contentDraft || null, task.publishedUrl || null,
      task.createdAt || now, task.updatedAt
    );

    // Broadcast to ALL OTHER clients
    this.broadcast({ type: 'task_updated', task }, ws);
  }

  private async handleWsPatchTask(ws: WebSocket, taskId: string, delta: any, updatedAt: string): Promise<void> {
    if (!taskId || !updatedAt) return;

    // LWW: Only update if incoming is newer
    const existing = this.sql.exec("SELECT updatedAt FROM tasks WHERE id = ?", taskId).one() as { updatedAt: string } | null;
    if (existing && existing.updatedAt >= updatedAt) {
      return;
    }

    // Decomplecting: Map delta keys to SQL columns
    // We only support patching a subset of simple fields for now
    const allowedFields = ['title', 'prompt', 'status', 'output', 'model', 'slug', 'researchData', 'contentDraft', 'publishedUrl'];
    for (const key of Object.keys(delta)) {
      if (allowedFields.includes(key)) {
        this.sql.exec(`UPDATE tasks SET ${key} = ?, updatedAt = ? WHERE id = ?`, delta[key], updatedAt, taskId);
      } else if (['tags', 'tokenUsage', 'parameters', 'history', 'evalCriteria', 'evalResults'].includes(key)) {
        // JSON fields
        this.sql.exec(`UPDATE tasks SET ${key} = ?, updatedAt = ? WHERE id = ?`, JSON.stringify(delta[key]), updatedAt, taskId);
      }
    }

    this.broadcast({ type: 'task_updated', task: { id: taskId, ...delta, updatedAt } }, ws);
  }

  private async handleWsUpsertProject(ws: WebSocket, proj: Partial<CMSProject>): Promise<void> {
    if (!proj.id) return;

    this.sql.exec(
      'INSERT OR REPLACE INTO projects (id, name, globalPrompt, knowledgeContext, scheduleInterval) VALUES (?, ?, ?, ?, ?)',
      String(proj.id), String(proj.name), proj.globalPrompt || null, proj.knowledgeContext || null, proj.scheduleInterval || null
    );

    this.broadcast({ type: 'project_updated', project: proj }, ws);
  }

  private async handleWsUpsertTemplate(ws: WebSocket, template: Partial<PromptTemplate>): Promise<void> {
    if (!template.id || !template.updatedAt) return;

    // LWW: Only update if incoming is newer
    const existing = this.sql.exec("SELECT updatedAt FROM templates WHERE id = ?", template.id).one() as { updatedAt: string } | null;
    if (existing && existing.updatedAt >= template.updatedAt) {
      return;
    }

    this.sql.exec(
      'INSERT OR REPLACE INTO templates (id, name, content, category, updatedAt) VALUES (?, ?, ?, ?, ?)',
      template.id, template.name || 'Untitled', template.content || '', template.category || null, template.updatedAt
    );

    this.broadcast({ type: 'template_updated', template }, ws);
  }

  webSocketClose(ws: WebSocket, code: number, reason: string, wasClean: boolean): void {
    const session = this.state.getWebSockets().find(s => s === ws);
    if (session) ws.close(code, reason);
  }

  /**
   * Broadcasts a message to all connected WebSocket clients.
   * @param msg - Object to broadcast
   * @param excludeWs - Optional WebSocket to exclude from broadcast
   */
  private broadcast(msg: any, excludeWs?: WebSocket): void {
    const data = encode(msg);
    for (const ws of this.state.getWebSockets()) {
      if (ws === excludeWs) continue;
      try {
        ws.send(data);
      } catch (e) {
        // ws.close() or error
      }
    }
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
      tags: t.tags ? JSON.parse(t.tags) : undefined,
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
        id, projectId, title, prompt, status, slug, tags, model, output, tokenUsage, parameters, history, 
        researchData, contentDraft, publishedUrl, createdAt, updatedAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      task.id,
      projectId,
      task.title,
      task.prompt || null,
      status,
      task.slug || Slug.slugify(task.title),
      task.tags ? JSON.stringify(Slug.normalizeTags(task.tags)) : null,
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
   * Handles POST /generate for manual re-generation of reports.
   */
  private async handleGeneratePost(request: Request): Promise<Response> {
    const data = await request.json() as { taskId: string };
    if (!data.taskId) return new Response('Missing taskId', { status: 400 });

    const task = this.sql.exec("SELECT * FROM tasks WHERE id = ?", data.taskId).one() as unknown as CMSTask;
    const project = this.sql.exec("SELECT * FROM projects WHERE id = ?", task?.projectId).one() as unknown as CMSProject;

    if (!task || !project) return new Response('Task or Project not found', { status: 404 });

    const report = VelocityGenerator.generateReport(task, project);
    return Response.json({ status: 'ok', report });
  }

  /**
   * Handles POST /deploy for artifact transport.
   */
  private async handleDeployPost(request: Request): Promise<Response> {
    const data = await request.json() as { taskId?: string, projectId?: string };

    // Default config (ideally from DB or Env)
    const config = {
      deploy_method: 'github',
      github_token: (this.env as any).GITHUB_TOKEN,
      github_repo: (this.env as any).GITHUB_REPO,
      github_branch: 'gh-pages'
    };

    if (!config.github_token) return new Response('Missing GITHUB_TOKEN', { status: 500 });

    let files: Record<string, string> = {};

    if (data.taskId) {
      const task = this.sql.exec("SELECT * FROM tasks WHERE id = ?", data.taskId).one() as unknown as CMSTask;
      const project = this.sql.exec("SELECT * FROM projects WHERE id = ?", task?.projectId).one() as unknown as CMSProject;
      if (task && project) {
        const report = VelocityGenerator.generateReport(task, project);
        files[`${Slug.generatePath(task.title, task.id)}.md`] = report;
      }
    } else if (data.projectId) {
      const tasks = this.sql.exec("SELECT * FROM tasks WHERE projectId = ? AND status = 'deployed'", data.projectId).toArray() as unknown as CMSTask[];
      const project = this.sql.exec("SELECT * FROM projects WHERE id = ?", data.projectId).one() as unknown as CMSProject;
      for (const t of tasks) {
        if (project) {
          files[`${Slug.generatePath(t.title, t.id)}.md`] = VelocityGenerator.generateReport(t, project);
        }
      }
    }

    if (Object.keys(files).length === 0) return new Response('No files to deploy', { status: 400 });

    const result = await Deployer.deploy(config, files);
    return Response.json(result);
  }

  /**
   * Handles POST /syndicate/:taskId for social distribution.
   */
  private async handleSyndicatePost(request: Request, taskId: string): Promise<Response> {
    const apiKey = (this.env as Env).GEMINI_API_KEY;
    if (!apiKey) return new Response('Missing API Key', { status: 500 });

    const task = this.sql.exec("SELECT * FROM tasks WHERE id = ?", taskId).one() as unknown as CMSTask;
    if (!task) return new Response('Task Not Found', { status: 404 });

    try {
      const syndicator = new Syndicator(apiKey);
      const payloads = await syndicator.synthesize(task);

      const now = new Date().toISOString();
      this.sql.exec(
        "UPDATE tasks SET syndicatedAt = ?, socialPayloads = ?, updatedAt = ? WHERE id = ?",
        now, JSON.stringify(payloads), now, taskId
      );

      // (Simulated) Dispatch
      await syndicator.dispatch(taskId, payloads, true);

      this.broadcast({
        type: 'task_updated',
        task: { ...task, syndicatedAt: now, socialPayloads: payloads, updatedAt: now }
      });

      return Response.json({ status: 'ok', payloads });
    } catch (e: any) {
      console.error('Syndication Failed:', e);
      return new Response(e.message, { status: 500 });
    }
  }

  /**
   * Handles GET /public/insights for public consumption.
   */
  private handlePublicInsights(): Response {
    // Fetch all deployed tasks
    const tasks = this.sql
      .exec("SELECT id, title, output, updatedAt FROM tasks WHERE status = 'deployed' ORDER BY updatedAt DESC LIMIT 20")
      .toArray() as any[];

    return Response.json({ status: 'ok', insights: tasks }, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, max-age=60'
      }
    });
  }
}
