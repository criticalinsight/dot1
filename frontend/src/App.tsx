import type { Component } from 'solid-js';
import { createSignal, onMount, Show } from 'solid-js';
import { KanbanBoard } from './components/Kanban/Board';
import type { CMSProject, CMSTask, StyleProfile } from '../../shared/types';
import { db } from './db/client';
import { seedDemoData } from './db/seed';
import { AIBand } from './components/AIBand';
import { VoiceInput } from './components/VoiceInput';
import { StyleDesigner } from './components/StyleDesigner';

const App: Component = () => {
  const [activeProject, setActiveProject] = createSignal<CMSProject | null>(null);
  const [tasks, setTasks] = createSignal<CMSTask[]>([]);
  const [showStyleDesigner, setShowStyleDesigner] = createSignal(false);

  // Simulated AI Ensemble state
  const ensembleModels = [
    { name: 'Gemini 3 Pro', weight: 0.6, status: 'active' as const },
    { name: 'Gemini 2.5 Flash', weight: 0.3, status: 'active' as const },
    { name: 'Gemini 2.0 Flash', weight: 0.1, status: 'idle' as const },
  ];

  onMount(async () => {
    const projects = await db.query('SELECT * FROM projects LIMIT 1');
    if (projects.rows.length > 0) {
      setActiveProject(projects.rows[0] as unknown as CMSProject);
      refreshTasks();
    } else {
      await seedDemoData();
      const p = await db.query('SELECT * FROM projects LIMIT 1');
      if (p.rows.length > 0) {
        setActiveProject(p.rows[0] as unknown as CMSProject);
        refreshTasks();
      }
    }
  });

  const refreshTasks = async () => {
    const proj = activeProject();
    if (proj) {
      const res = await db.query('SELECT * FROM tasks WHERE projectId = $1', [proj.id]);
      setTasks(res.rows as unknown as CMSTask[]);
    }
  };

  const handleVoiceTask = async (title: string) => {
    const proj = activeProject();
    if (!proj) return;

    const newTask: CMSTask = {
      id: crypto.randomUUID(),
      projectId: proj.id,
      title,
      status: 'backlog',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    await db.query('INSERT INTO tasks (id, projectId, title, status, createdAt, updatedAt) VALUES ($1, $2, $3, $4, $5, $6)',
      [newTask.id, newTask.projectId, newTask.title, newTask.status, newTask.createdAt, newTask.updatedAt]);

    refreshTasks();
    console.log(`[Velocity] Created task via voice: ${title}`);
  };

  const saveStyleProfile = async (profile: StyleProfile) => {
    const proj = activeProject();
    if (!proj) return;

    const updated = { ...proj, styleProfile: profile };
    setActiveProject(updated);

    await db.query('UPDATE projects SET styleProfile = $1 WHERE id = $2', [JSON.stringify(profile), proj.id]);
    setShowStyleDesigner(false);
    console.log('[Velocity] Style Profile calibrated.');
  };

  return (
    <div class="min-h-screen bg-slate-950 text-slate-200 font-sans selection:bg-blue-500/30">
      <header class="p-8 border-b border-slate-900 bg-slate-950/50 backdrop-blur-xl sticky top-0 z-50">
        <div class="max-w-7xl mx-auto flex items-center justify-between">
          <div class="flex items-center gap-4">
            <div class="w-10 h-10 bg-gradient-to-tr from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20">
              <span class="text-white font-black text-xl">V</span>
            </div>
            <div>
              <h1 class="text-2xl font-black tracking-tight text-white">Velocity</h1>
              <p class="text-xs font-bold text-slate-500 uppercase tracking-widest">AI-Driven CMS</p>
            </div>
          </div>

          <div class="flex items-center gap-6">
            <AIBand models={ensembleModels} />
            <button
              onClick={() => setShowStyleDesigner(!showStyleDesigner())}
              class="px-4 py-2 bg-slate-900 border border-slate-800 rounded-lg text-sm font-semibold hover:bg-slate-800 transition-colors"
            >
              {showStyleDesigner() ? 'Close Designer' : 'Brand Style'}
            </button>
            <div class="px-4 py-2 bg-slate-900 border border-slate-800 rounded-lg text-sm font-semibold">
              Project: <span class="text-blue-400">{activeProject()?.name || 'Loading...'}</span>
            </div>
          </div>
        </div>
      </header>

      <main class="max-w-7xl mx-auto p-8 pb-32">
        <Show when={showStyleDesigner()}>
          <div class="mb-8">
            <StyleDesigner onSave={saveStyleProfile} />
          </div>
        </Show>

        <Show when={activeProject()} fallback={<div class="flex items-center justify-center h-48 text-slate-500">Loading project context...</div>}>
          <KanbanBoard tasks={tasks()} />
        </Show>
      </main>

      <VoiceInput onTaskCreated={handleVoiceTask} />
    </div>
  );
};

export default App;
