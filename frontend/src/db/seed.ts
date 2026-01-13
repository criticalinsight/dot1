import { db } from './client';

export async function seedDemoData() {
  const projectId = 'demo-project-1';

  await db.query(`
    INSERT INTO projects (id, name, globalPrompt, knowledgeContext, scheduleInterval)
    VALUES ($1, $2, $3, $4, $5)
    ON CONFLICT (id) DO NOTHING
  `, [projectId, 'Tech Blog: AI & Edge', 'Write concise, professional tech articles.', 'Focus on Cloudflare, SolidJS, and WASM.']);

  const demoTasks = [
    { id: '1', title: 'The Future of PGlite in WASM', status: 'published' },
    { id: '2', title: 'Routing Gemini Models for Efficiency', status: 'review' },
    { id: '3', title: 'Building Kanban Boards with SolidJS', status: 'drafting' },
    { id: '4', title: 'Why Edge Computing is Speed First', status: 'researching' },
    { id: '5', title: 'The Role of Durable Objects in State', status: 'backlog' },
  ];

  for (const task of demoTasks) {
    await db.query(`
      INSERT INTO tasks (id, projectId, title, status, createdAt, updatedAt)
      VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      ON CONFLICT (id) DO NOTHING
    `, [task.id, projectId, task.title, task.status]);
  }
}
