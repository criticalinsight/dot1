import { CMSTask, CMSProject, StyleProfile } from '../../shared/types';
import { VectorMemory } from './VectorMemory';
import { ResearchScraper } from './ResearchScraper';
import { Publisher } from './Publisher';
import { PluginManager, WordPressDriver, GhostDriver } from './PluginSystem';
import { ImageGen } from './ImageGen';
import { KnowledgeGraph } from './KnowledgeGraph';

/**
 * UserRole defines the authorization levels within the CMS.
 */
type UserRole = 'admin' | 'editor' | 'viewer';

/**
 * ProjectBrain is a Durable Object that manages the state and autonomous 
 * logic for a project or set of projects. It uses native SQLite for 
 * high-performance persistence.
 * 
 * Performance:
 * - Read/Write: O(log N) for most SQLite operations.
 * - Concurrency: Managed by Durable Objects single-threaded execution.
 */
export class ProjectBrain {
  private sql: SqlStorage;
  private memory: VectorMemory;
  private scraper: ResearchScraper;
  private publisher: Publisher;
  private plugins: PluginManager;
  private imageGen: ImageGen;
  private kg: KnowledgeGraph;

  /**
   * @param state - Durable Object state provider
   * @param env - Environment bindings
   */
  constructor(private state: DurableObjectState, private env: any) {
    this.sql = state.storage.sql;
    this.memory = new VectorMemory(env);
    this.scraper = new ResearchScraper();
    this.publisher = new Publisher();
    this.plugins = new PluginManager();
    this.imageGen = new ImageGen(env.GOOGLE_API_KEY);
    this.kg = new KnowledgeGraph(this.sql);

    // Auto-register default drivers
    this.plugins.registerDriver(new WordPressDriver());
    this.plugins.registerDriver(new GhostDriver());

    this.initializeSchema();
  }

  /**
   * Simple RBAC check.
   * Time Complexity: O(1)
   * 
   * @param role - Current user role
   * @param required - Required permission level
   */
  private checkAccess(role: UserRole, required: UserRole): boolean {
    const weights: Record<UserRole, number> = { admin: 10, editor: 5, viewer: 1 };
    return (weights[role] || 0) >= (weights[required] || 100);
  }

  /**
   * Initializes the SQLite schema for projects, tasks, analytics, and variations.
   * Stability: O(1) - runs once per DO instantiation.
   */
  private initializeSchema() {
    this.sql.exec(`
      CREATE TABLE IF NOT EXISTS projects(
        id TEXT PRIMARY KEY,
        name TEXT,
        globalPrompt TEXT,
        knowledgeContext TEXT,
        styleProfile TEXT, -- JSON blob of StyleProfile
        scheduleInterval TEXT,
        lastRun TEXT,
        nextRun TEXT
      );
      CREATE TABLE IF NOT EXISTS tasks(
        id TEXT PRIMARY KEY,
        projectId TEXT,
        title TEXT,
        status TEXT,
        researchData TEXT,
        contentDraft TEXT,
        imageUrl TEXT,
        imageAlt TEXT,
        publishedUrl TEXT,
        createdAt TEXT,
        updatedAt TEXT
      );
      CREATE TABLE IF NOT EXISTS knowledge_graph(
        projectId TEXT,
        entity TEXT,
        relationship TEXT,
        target TEXT,
        PRIMARY KEY (projectId, entity, target)
      );
      CREATE TABLE IF NOT EXISTS analytics(
        id TEXT PRIMARY KEY,
        taskId TEXT,
        eventType TEXT,
        timestamp TEXT,
        metadata TEXT
      );
      CREATE TABLE IF NOT EXISTS task_variations(
        id TEXT PRIMARY KEY,
        taskId TEXT,
        content TEXT,
        modelSource TEXT,
        isWinner BOOLEAN DEFAULT 0,
        createdAt TEXT
      );
    `);
  }

  /**
   * Main entry point for requests to the Durable Object.
   */
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const method = request.method;

    // Handle WebSocket synchronization requests (Phase 4)
    if (request.headers.get('Upgrade') === 'websocket') {
      const { 0: client, 1: server } = new WebSocketPair();
      await this.handleWebSocket(server);
      return new Response(null, { status: 101, webSocket: client });
    }

    // Handle data synchronization for the frontend (PGlite sync)
    if (url.pathname === '/sync' && method === 'GET') {
      const projects = this.sql.exec('SELECT * FROM projects').toArray();
      const tasks = this.sql.exec('SELECT * FROM tasks').toArray();
      return Response.json({ projects, tasks });
    }

    // Handle single task updates/inserts
    if (url.pathname === '/task' && method === 'POST') {
      const task: CMSTask = await request.json();
      this.upsertTask(task);
      return Response.json({ status: 'ok' });
    }

    // Trigger the autonomous orchestration loop
    if (url.pathname === '/trigger-autonomous-loop') {
      await this.runOrchestrationLoop();
      return Response.json({ status: 'loop_triggered' });
    }

    // Track analytics events (Phase 4)
    if (url.pathname === '/track-event' && method === 'POST') {
      const { taskId, eventType, metadata } = await request.json();
      this.sql.exec(
        'INSERT INTO analytics (id, taskId, eventType, timestamp, metadata) VALUES (?, ?, ?, ?, ?)',
        crypto.randomUUID(), taskId, eventType, new Date().toISOString(), JSON.stringify(metadata)
      );
      return Response.json({ status: 'tracked' });
    }

    // Manage task variations for A/B testing (Phase 4)
    if (url.pathname === '/variation' && method === 'POST') {
      const { taskId, content, modelSource } = await request.json();
      this.sql.exec(
        'INSERT INTO task_variations (id, taskId, content, modelSource, createdAt) VALUES (?, ?, ?, ?, ?)',
        crypto.randomUUID(), taskId, content, modelSource, new Date().toISOString()
      );
      return Response.json({ status: 'variation_added' });
    }

    return new Response('Not Found', { status: 404 });
  }

  /**
   * Refines the project's global prompt based on feedback.
   * This is a "Custom Training Loop" that improves agent quality over time.
   */
  private async refineProjectPrompt(projectId: string, feedback: string) {
    console.log(`[Training] Refining prompt for project ${projectId} based on feedback: ${feedback} `);

    // In production, this would call Gemini with the current prompt + feedback 
    // to generate a "better" version of the prompt.
    const project = this.sql.exec('SELECT * FROM projects WHERE id = ?', projectId).toArray()[0] as CMSProject;

    if (project) {
      const newPrompt = `${project.globalPrompt} \nNote for future: ${feedback} `;
      this.sql.exec(
        'UPDATE projects SET globalPrompt = ? WHERE id = ?',
        newPrompt, projectId
      );
    }
  }

  /**
   * Inserts or updates a task in the SQLite store and broadcasts the change.
   * Time Complexity: O(log N) for B-tree index insertion.
   * Space Complexity: O(1) beyond input storage.
   * 
   * @param task - The CMS task object to persist
   */
  private upsertTask(task: CMSTask) {
    if (!task.id || !task.title) throw new Error('Invalid task data');

    this.sql.exec(
      'INSERT OR REPLACE INTO tasks (id, projectId, title, status, researchData, contentDraft, imageUrl, imageAlt, publishedUrl, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      task.id, task.projectId, task.title, task.status, task.researchData, task.contentDraft, task.imageUrl, task.imageAlt, task.publishedUrl, task.createdAt, task.updatedAt
    );
    this.broadcast({ type: 'task_updated', task });
  }

  /**
   * Orchestrates the autonomous content pipeline.
   * Iterates through pending tasks and moves them through life-cycle stages.
   */
  private async runOrchestrationLoop() {
    console.log('[Orchestrator] Starting cycle...');

    // 1. Find the next 'backlog' task to start researching
    const backlogTasks = this.sql.exec('SELECT * FROM tasks WHERE status = "backlog" LIMIT 1').toArray();

    if (backlogTasks.length > 0) {
      const task = backlogTasks[0] as unknown as CMSTask;
      console.log(`[Orchestrator] Starting research for task: ${task.title} `);

      // Update status to 'researching'
      task.status = 'researching';
      task.updatedAt = new Date().toISOString();
      this.upsertTask(task);

      // In a real implementation, this would trigger an async call to an AI agent
      // For now, we simulate progress
      await this.processTask(task);
    } else {
      console.log('[Orchestrator] No backlog tasks found.');
    }
  }

  /**
   * Full AI processing pipeline for a task.
   * Orchestrates Researching -> Drafting -> Review -> Published.
   */
  private async processTask(task: CMSTask) {
    // 1. Research & KG Ingestion Stage
    console.log(`[Pipe] Researching & Mapping Graph: ${task.title}`);
    const researchBits = await this.scraper.researchTopic(task.title);
    task.researchData = researchBits.join('\n\n');

    for (const bit of researchBits) {
      await this.memory.storeFact(task.projectId, bit);
      await this.kg.ingestResearch(task.projectId, bit);
    }

    task.status = 'drafting';
    task.updatedAt = new Date().toISOString();
    this.upsertTask(task);

    // 2. Drafting Stage (Adaptive Style)
    console.log(`[Pipe] Generating draft with brand voice: ${task.title}`);
    const context = await this.kg.getRelationalContext(task.projectId, task.title);

    // Fetch project for style profile
    const query = this.sql.exec('SELECT * FROM projects WHERE id = ?', task.projectId).toArray();
    const project = query.length > 0 ? query[0] as any : null;
    const style: StyleProfile | undefined = project?.styleProfile ? JSON.parse(project.styleProfile) : undefined;

    const styleInstructions = style ? `
      Tone: ${style.tone}
      Target Audience: ${style.targetAudience}
      Avoid: ${style.vocabularyConstraints.join(', ')}
    ` : '';

    const prompt = `Write a tech article about "${task.title}".\nStyle Instructions: ${styleInstructions}\nRelational Context: ${context}\nResearch: ${task.researchData}`;

    // In production, this would call proxyAI(prompt)
    task.contentDraft = `This is a styled AI draft for "${task.title}".\n\n${task.researchData}`;

    // 3. Image Generation Stage (New in Phase 5)
    console.log(`[Pipe] Generating multimodal assets for: ${task.title}`);
    const imageData = await this.imageGen.generateTaskImage(task.title, task.contentDraft.slice(0, 500));
    task.imageUrl = imageData.url;
    task.imageAlt = imageData.alt;

    task.status = 'review';
    task.updatedAt = new Date().toISOString();
    this.upsertTask(task);

    // 4. Publishing Stage
    console.log(`[Pipe] Finalizing multi-publish: ${task.title}`);
    const meta = { title: task.title, slug: task.title.toLowerCase().replace(/ /g, '-').replace(/[^\w-]/g, '') };
    await this.plugins.publishToAll(task.contentDraft!, meta);

    const url = await this.publisher.publish(task.projectId, task.title, task.contentDraft!);
    task.publishedUrl = url;
    task.status = 'published';
    task.updatedAt = new Date().toISOString();
    this.upsertTask(task);
  }
}
