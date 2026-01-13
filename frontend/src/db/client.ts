import { PGlite } from '@electric-sql/pglite';

/**
 * PGlite instance running in WASM.
 */
export const db = new PGlite();

const BACKEND_URL = 'https://backend.iamkingori.workers.dev';

/**
 * Initializes the local PGlite schema.
 */
export async function initDb() {
  await db.exec(`
    CREATE TABLE IF NOT EXISTS projects (
      id TEXT PRIMARY KEY,
      name TEXT,
      globalPrompt TEXT,
      knowledgeContext TEXT,
      styleProfile TEXT,
      scheduleInterval TEXT,
      lastRun TEXT,
      nextRun TEXT
    );
    CREATE TABLE IF NOT EXISTS tasks (
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
    CREATE TABLE IF NOT EXISTS knowledge_graph (
      projectId TEXT,
      entity TEXT,
      relationship TEXT,
      target TEXT,
      PRIMARY KEY (projectId, entity, target)
    );
  `);
}

/**
 * Syncs the local PGlite database with the remote Cloudflare Durable Object.
 */
export async function syncWithBackend() {
  console.log('[DB] Synchronizing with Cloudflare (Multimodal Engine)...');

  try {
    const response = await fetch(`${BACKEND_URL}/sync`);
    if (!response.ok) throw new Error('Sync endpoint unavailable');

    const data = await response.json();

    for (const project of data.projects) {
      await db.query(`
        INSERT INTO projects (id, name, globalPrompt, knowledgeContext, styleProfile) 
        VALUES ($1, $2, $3, $4, $5) 
        ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, globalPrompt = EXCLUDED.globalPrompt, styleProfile = EXCLUDED.styleProfile`,
        [project.id, project.name, project.globalPrompt, project.knowledgeContext, project.styleProfile]);
    }

    for (const task of data.tasks) {
      await db.query(`
        INSERT INTO tasks (id, projectId, title, status, researchData, contentDraft, imageUrl, imageAlt, publishedUrl, createdAt, updatedAt) 
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) 
        ON CONFLICT (id) DO UPDATE SET status = EXCLUDED.status, contentDraft = EXCLUDED.contentDraft, imageUrl = EXCLUDED.imageUrl, updatedAt = EXCLUDED.updatedAt`,
        [task.id, task.projectId, task.title, task.status, task.researchData, task.contentDraft, task.imageUrl, task.imageAlt, task.publishedUrl, task.createdAt, task.updatedAt]);
    }
  } catch (e) {
    console.warn('[DB] Initial sync failed:', e);
  }

  const wsUrl = BACKEND_URL.replace('https:', 'wss:').replace('http:', 'ws:');
  const ws = new WebSocket(`${wsUrl}/ws`);

  ws.onmessage = async (event) => {
    try {
      const message = JSON.parse(event.data);
      if (message.type === 'task_updated') {
        const t = message.task;
        await db.query(`
          INSERT INTO tasks (id, projectId, title, status, researchData, contentDraft, imageUrl, imageAlt, createdAt, updatedAt) 
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) 
          ON CONFLICT (id) DO UPDATE SET status = EXCLUDED.status, imageUrl = EXCLUDED.imageUrl, updatedAt = EXCLUDED.updatedAt`,
          [t.id, t.projectId, t.title, t.status, t.researchData, t.contentDraft, t.imageUrl, t.imageAlt, t.createdAt, t.updatedAt]);
      }
    } catch (e) {
      console.error('[Realtime] Sync failed', e);
    }
  };
}

export async function exportToJson(): Promise<string> {
  const projects = await db.query('SELECT * FROM projects');
  const tasks = await db.query('SELECT * FROM tasks');
  const kg = await db.query('SELECT * FROM knowledge_graph');

  return JSON.stringify({
    version: '1.5',
    timestamp: new Date().toISOString(),
    projects: projects.rows,
    tasks: tasks.rows,
    knowledge_graph: kg.rows
  }, null, 2);
}

export async function importFromJson(jsonString: string) {
  const data = JSON.parse(jsonString);

  for (const project of data.projects) {
    await db.query(`
      INSERT INTO projects (id, name, globalPrompt, knowledgeContext, styleProfile) 
      VALUES ($1, $2, $3, $4, $5) ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, styleProfile = EXCLUDED.styleProfile`,
      [project.id, project.name, project.globalPrompt, project.knowledgeContext, project.styleProfile]);
  }

  for (const task of data.tasks) {
    await db.query(`
      INSERT INTO tasks (id, projectId, title, status, researchData, contentDraft, imageUrl, imageAlt, createdAt, updatedAt) 
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) 
      ON CONFLICT (id) DO UPDATE SET status = EXCLUDED.status, imageUrl = EXCLUDED.imageUrl`,
      [task.id, task.projectId, task.title, task.status, task.researchData, task.contentDraft, task.imageUrl, task.imageAlt, task.createdAt, task.updatedAt]);
  }

  if (data.knowledge_graph) {
    for (const fact of data.knowledge_graph) {
      await db.query(`
        INSERT INTO knowledge_graph (projectId, entity, relationship, target) 
        VALUES ($1, $2, $3, $4) ON CONFLICT DO NOTHING`,
        [fact.projectId, fact.entity, fact.relationship, fact.target]);
    }
  }
}
