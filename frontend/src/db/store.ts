import type { CMSProject, CMSTask, PromptTemplate } from '../../../shared/types';
import { PGlite } from '@electric-sql/pglite';
import { encode, decode } from '@msgpack/msgpack';

/**
 * PGlite-powered local-first data store.
 *
 * Architecture:
 * - Persistent local storage via IndexedDB
 * - SQL-based querying and relational integrity
 * - Optimistic UI updates with background sync
 * - Delta sync and ETag optimization
 */

const BACKEND_URL = (import.meta as any).env?.VITE_BACKEND_URL || 'https://api.lynn.moecapital.com';
const IDB_NAME = 'idb://gemini-ops-db-v4';

let db: PGlite | null = null;
let lastSyncTime = localStorage.getItem('lastSyncTime');
let wsConnection: WebSocket | null = null;
let syncDebounceTimer: any = null;
let pendingUpdates: CMSTask[] = [];
let pendingTemplateUpdates: PromptTemplate[] = [];
// Cache to track last known server/local state for diffing
const taskCache = new Map<string, CMSTask>();
let dbInitialized = false;

/** Event listeners for state changes */
type Listener = () => void;
const listeners: Set<Listener> = new Set();

/**
 * Subscribe to state changes.
 * @param fn - Callback to invoke on changes
 * @returns Unsubscribe function
 */
export function subscribe(fn: Listener): () => void {
    listeners.add(fn);
    return () => listeners.delete(fn);
}

function notify(): void {
    listeners.forEach((fn) => fn());
}

/**
 * Initializes the database and creates schema.
 */
async function initDb() {
    if (dbInitialized) return;

    db = new PGlite(IDB_NAME);

    await db.exec(`
        CREATE TABLE IF NOT EXISTS projects (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            global_prompt TEXT,
            knowledge_context TEXT,
            schedule_interval TEXT,
            last_run TEXT,
            next_run TEXT,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        
        CREATE TABLE IF NOT EXISTS tasks (
            id TEXT PRIMARY KEY,
            project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
            title TEXT NOT NULL,
            prompt TEXT,
            status TEXT NOT NULL DEFAULT 'draft',
            output TEXT,
            history JSONB DEFAULT '[]',
            eval_criteria JSONB DEFAULT '[]',
            eval_results JSONB DEFAULT '[]',
            created_at TEXT,
            updated_at TEXT,
            syndicated_at TEXT,
            social_payloads JSONB
        );

        CREATE TABLE IF NOT EXISTS templates (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            content TEXT NOT NULL,
            category TEXT,
            updated_at TEXT
        );
        
        CREATE INDEX IF NOT EXISTS idx_tasks_project_id ON tasks(project_id);
        CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
    `);

    dbInitialized = true;
}

/**
 * Mapping Helpers
 */
function rowToProject(row: any): CMSProject {
    return {
        id: row.id,
        name: row.name,
        globalPrompt: row.global_prompt,
        knowledgeContext: row.knowledge_context,
        scheduleInterval: row.schedule_interval,
        lastRun: row.last_run,
        nextRun: row.next_run,
        updatedAt: row.updated_at
    };
}

function rowToTask(row: any): CMSTask {
    return {
        id: row.id,
        projectId: row.project_id,
        title: row.title,
        prompt: row.prompt,
        status: row.status,
        output: row.output,
        history: typeof row.history === 'string' ? JSON.parse(row.history) : (row.history || []),
        evalCriteria: typeof row.eval_criteria === 'string' ? JSON.parse(row.eval_criteria) : (row.eval_criteria || []),
        evalResults: typeof row.eval_results === 'string' ? JSON.parse(row.eval_results) : (row.eval_results || []),
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        syndicatedAt: row.syndicated_at,
        socialPayloads: typeof row.social_payloads === 'string' ? JSON.parse(row.social_payloads) : row.social_payloads
    };
}

function rowToTemplate(row: any): PromptTemplate {
    return {
        id: row.id,
        name: row.name,
        content: row.content,
        category: row.category,
        updatedAt: row.updated_at
    };
}

/**
 * Fetches data with Delta Sync and ETag support.
 */
// let lastSyncTime: string | null = null; // Moved to top-level

export async function sync(): Promise<{ projects: CMSProject[]; tasks: CMSTask[]; templates: PromptTemplate[] }> {
    await initDb();
    connectWebSocket();

    // Initial return from local DB while WS syncs
    const projects = await getProjects();
    const tasks = await getTasks();
    const templates = await getTemplates();
    return { projects, tasks, templates };
}

/**
 * Merges delta updates into PGlite using SQL UPSERT.
 */
async function mergeDelta(data: { projects?: CMSProject[]; tasks?: CMSTask[]; templates?: PromptTemplate[] }) {
    if (!db) return;

    if (data.projects) {
        for (const p of data.projects) {
            await db.query(`
                INSERT INTO projects (id, name, global_prompt, knowledge_context, schedule_interval, last_run, next_run, updated_at)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                ON CONFLICT (id) DO UPDATE SET
                    name = EXCLUDED.name,
                    global_prompt = EXCLUDED.global_prompt,
                    knowledge_context = EXCLUDED.knowledge_context,
                    schedule_interval = EXCLUDED.schedule_interval,
                    last_run = EXCLUDED.last_run,
                    next_run = EXCLUDED.next_run,
                    updated_at = EXCLUDED.updated_at
                WHERE EXCLUDED.updated_at > projects.updated_at
            `, [p.id, p.name, p.globalPrompt, p.knowledgeContext, p.scheduleInterval, p.lastRun, p.nextRun, p.updatedAt || new Date().toISOString()]);
        }
    }

    if (data.tasks) {
        for (const t of data.tasks) {
            await db.query(`
                INSERT INTO tasks (id, project_id, title, prompt, status, output, history, eval_criteria, eval_results, created_at, updated_at)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
                ON CONFLICT (id) DO UPDATE SET
                    project_id = EXCLUDED.project_id,
                    title = EXCLUDED.title,
                    prompt = EXCLUDED.prompt,
                    status = EXCLUDED.status,
                    output = EXCLUDED.output,
                    history = EXCLUDED.history,
                    eval_criteria = EXCLUDED.eval_criteria,
                    eval_results = EXCLUDED.eval_results,
                    updated_at = EXCLUDED.updated_at,
                    syndicated_at = EXCLUDED.syndicated_at,
                    social_payloads = EXCLUDED.social_payloads
                WHERE EXCLUDED.updated_at > tasks.updated_at
            `, [
                t.id,
                t.projectId,
                t.title,
                t.prompt || null,
                t.status,
                t.output || null,
                JSON.stringify(t.history || []),
                JSON.stringify(t.evalCriteria || []),
                JSON.stringify(t.evalResults || []),
                t.createdAt,
                t.updatedAt,
                t.syndicatedAt || null,
                t.socialPayloads ? JSON.stringify(t.socialPayloads) : null
            ]);

            if (t.updatedAt > (lastSyncTime || '')) {
                lastSyncTime = t.updatedAt;
                localStorage.setItem('lastSyncTime', lastSyncTime);
            }
            // Update cache when merging from server
            taskCache.set(t.id, t);
        }
    }

    if (data.templates) {
        for (const t of data.templates) {
            await db.query(`
                INSERT INTO templates (id, name, content, category, updated_at)
                VALUES ($1, $2, $3, $4, $5)
                ON CONFLICT (id) DO UPDATE SET
                    name = EXCLUDED.name,
                    content = EXCLUDED.content,
                    category = EXCLUDED.category,
                    updated_at = EXCLUDED.updated_at
                WHERE EXCLUDED.updated_at > templates.updated_at
            `, [t.id, t.name, t.content, t.category, t.updatedAt]);
        }
    }
}

/**
 * Gets projects from PGlite.
 */
export async function getProjects(): Promise<CMSProject[]> {
    await initDb();
    if (!db) return [];

    const res = await db.query('SELECT * FROM projects ORDER BY name ASC');
    return (res.rows || []).map(rowToProject);
}

/**
 * Gets templates from PGlite.
 */
export async function getTemplates(): Promise<PromptTemplate[]> {
    await initDb();
    if (!db) return [];
    const res = await db.query('SELECT * FROM templates ORDER BY name ASC');
    return (res.rows || []).map(rowToTemplate);
}

/**
 * Gets tasks from PGlite, optionally filtered by project.
 */
export async function getTasks(projectId?: string): Promise<CMSTask[]> {
    await initDb();
    if (!db) return [];

    let query = 'SELECT * FROM tasks';
    const params: any[] = [];

    if (projectId) {
        query += ' WHERE project_id = $1';
        params.push(projectId);
    }

    query += ' ORDER BY created_at DESC';

    const res = await db.query(query, params);
    return (res.rows || []).map(rowToTask);
}

/**
 * Creates or updates a task with SQL persistence and optimistic notification.
 */
/**
 * Calculates a field-level delta between two tasks.
 */
function diffTask(oldTask: CMSTask | undefined, newTask: CMSTask): any {
    if (!oldTask) return newTask; // Full update if no cache

    const delta: any = {};
    let hasChanges = false;

    const keys = Object.keys(newTask) as (keyof CMSTask)[];
    for (const key of keys) {
        if (JSON.stringify(oldTask[key]) !== JSON.stringify(newTask[key])) {
            delta[key] = newTask[key];
            hasChanges = true;
        }
    }

    return hasChanges ? delta : null;
}

export async function upsertTask(task: CMSTask): Promise<void> {
    if (!db) await initDb();

    if (!db) return;

    // Use LWW locally too
    const existingResult = await db.query('SELECT * FROM tasks WHERE id = $1', [task.id]);
    const existing = existingResult.rows[0] ? rowToTask(existingResult.rows[0]) : undefined;

    if (existing && existing.updatedAt >= task.updatedAt) {
        return;
    }

    // Capture delta before updating cache
    const cached = taskCache.get(task.id) || existing;
    const delta = diffTask(cached, task);

    if (!db) return;

    await db.query(`
        INSERT INTO tasks (id, project_id, title, prompt, status, output, history, eval_criteria, eval_results, created_at, updated_at, syndicated_at, social_payloads)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
        ON CONFLICT (id) DO UPDATE SET
            project_id = EXCLUDED.project_id,
            title = EXCLUDED.title,
            prompt = EXCLUDED.prompt,
            status = EXCLUDED.status,
            output = EXCLUDED.output,
            history = EXCLUDED.history,
            eval_criteria = EXCLUDED.eval_criteria,
            eval_results = EXCLUDED.eval_results,
            updated_at = EXCLUDED.updated_at,
            syndicated_at = EXCLUDED.syndicated_at,
            social_payloads = EXCLUDED.social_payloads
        WHERE EXCLUDED.updated_at > tasks.updated_at
    `, [
        task.id,
        task.projectId,
        task.title,
        task.prompt || null,
        task.status,
        task.output || null,
        JSON.stringify(task.history || []),
        JSON.stringify(task.evalCriteria || []),
        JSON.stringify(task.evalResults || []),
        task.createdAt,
        task.updatedAt,
        task.syndicatedAt || null,
        task.socialPayloads ? JSON.stringify(task.socialPayloads) : null
    ]);

    taskCache.set(task.id, task);

    (task as any)._delta = delta;
    pendingUpdates.push(task);
    debouncedSync();
    notify();
}

/**
 * Applies a streaming chunk to the local DB and UI state immediately.
 */
export async function applyStreamChunk(taskId: string, _chunk: string, accumulated: string): Promise<void> {
    if (!db) await initDb();
    if (!db) return;

    // Update local DB output field directly
    await db.query(`UPDATE tasks SET output = $1, updated_at = $2 WHERE id = $3`, [accumulated, new Date().toISOString(), taskId]);

    // Update cache
    const cached = taskCache.get(taskId);
    if (cached) {
        taskCache.set(taskId, { ...cached, output: accumulated });
    }

    notify();
}

/**
 * Creates or updates a template with SQL persistence and optimistic notification.
 */
export async function upsertTemplate(template: PromptTemplate): Promise<void> {
    await initDb();
    if (!db) return;

    // Use LWW locally too
    const existing = await db.query('SELECT updated_at FROM templates WHERE id = $1', [template.id]);
    if (existing.rows[0] && (existing.rows[0] as any).updated_at >= template.updatedAt) {
        return;
    }

    await db.query(`
        INSERT INTO templates (id, name, content, category, updated_at)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (id) DO UPDATE SET
            name = EXCLUDED.name,
            content = EXCLUDED.content,
            category = EXCLUDED.category,
            updated_at = EXCLUDED.updated_at
        WHERE EXCLUDED.updated_at > templates.updated_at
    `, [template.id, template.name, template.content, template.category, template.updatedAt]);

    pendingTemplateUpdates.push(template);
    debouncedSync();
    notify();
}

/**
 * Debounced sync: batches rapid updates into single request.
 */
function debouncedSync(): void {
    if (syncDebounceTimer) clearTimeout(syncDebounceTimer);

    syncDebounceTimer = setTimeout(async () => {
        const updates = [...pendingUpdates];
        pendingUpdates = [];

        for (const task of updates) {
            if (wsConnection?.readyState === WebSocket.OPEN) {
                const delta = (task as any)._delta;
                if (delta && delta.id && Object.keys(delta).length > 2) { // id + updatedAt + something else
                    wsConnection.send(encode({
                        type: 'PATCH_TASK',
                        taskId: task.id,
                        delta: delta,
                        updatedAt: task.updatedAt
                    }));
                } else {
                    wsConnection.send(encode({
                        type: 'UPSERT_TASK',
                        task
                    }));
                }
            } else {
                pendingUpdates.push(task);
            }
        }

        const tUpdates = [...pendingTemplateUpdates];
        pendingTemplateUpdates = [];
        for (const t of tUpdates) {
            if (wsConnection?.readyState === WebSocket.OPEN) {
                wsConnection.send(encode({
                    type: 'UPSERT_TEMPLATE',
                    template: t
                }));
            } else {
                pendingTemplateUpdates.push(t);
            }
        }
    }, 100);
}

/**
 * WebSocket auto-reconnect.
 */
function connectWebSocket(): void {
    if (wsConnection?.readyState === WebSocket.OPEN || wsConnection?.readyState === WebSocket.CONNECTING) return;

    const wsUrl = BACKEND_URL.replace('https:', 'wss:').replace('http:', 'ws:');
    wsConnection = new WebSocket(`${wsUrl}/ws`);
    wsConnection.binaryType = 'arraybuffer';

    wsConnection.onopen = () => {
        reconnectDelay = 1000;
        // Request sync on connect
        wsConnection?.send(encode({
            type: 'SYNC_REQ',
            since: lastSyncTime
        }));
    };

    wsConnection.onmessage = async (event) => {
        try {
            const msg = decode(event.data) as any;
            if (msg.type === 'SYNC_RES') {
                await mergeDelta({ projects: msg.projects, tasks: msg.tasks, templates: msg.templates });
                notify();
            } else if (msg.type === 'task_updated' && msg.task) {
                await mergeDelta({ tasks: [msg.task] });
                notify();
            } else if (msg.type === 'project_updated' && msg.project) {
                await mergeDelta({ projects: [msg.project] });
                notify();
            } else if (msg.type === 'template_updated' && msg.template) {
                await mergeDelta({ templates: [msg.template] });
                notify();
            } else if (msg.type === 'task_stream_chunk' && msg.taskId) {
                await applyStreamChunk(msg.taskId, msg.chunk, msg.accumulated);
            }
        } catch (e) { console.error('WS Decode Error:', e); }
    };

    let reconnectDelay = 1000;
    wsConnection.onclose = () => {
        wsConnection = null;
        setTimeout(() => {
            connectWebSocket();
            reconnectDelay = Math.min(reconnectDelay * 2, 30000);
        }, reconnectDelay);
    };
}

export async function exportToJson(): Promise<string> {
    const projects = await getProjects();
    const tasks = await getTasks();
    return JSON.stringify({ projects, tasks }, null, 2);
}
