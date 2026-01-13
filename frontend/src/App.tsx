import type { Component } from 'solid-js';
import { createSignal, onMount, Show } from 'solid-js';
import { KanbanBoard } from './components/Kanban/Board';
import type { CMSProject, CMSTask } from '../../shared/types';
import { db, initDb } from './db/client';
import { seedDemoData } from './db/seed';

/**
 * Root application component for Velocity CMS.
 * Manages project loading, task state, and renders the Kanban board.
 *
 * Time Complexity: O(n) where n = number of tasks
 * Space Complexity: O(n) for task array storage
 *
 * @returns SolidJS component
 */
const App: Component = () => {
  const [activeProject, setActiveProject] = createSignal<CMSProject | null>(null);
  const [tasks, setTasks] = createSignal<CMSTask[]>([]);
  const [isLoading, setIsLoading] = createSignal(true);

  /**
   * Initialize database and load project on mount.
   * Uses early return pattern for fast path optimization.
   */
  onMount(async () => {
    await initDb();

    const projects = await db.query('SELECT id, name FROM projects LIMIT 1');
    if (projects.rows.length > 0) {
      setActiveProject(projects.rows[0] as unknown as CMSProject);
      await refreshTasks();
    } else {
      await seedDemoData();
      const p = await db.query('SELECT id, name FROM projects LIMIT 1');
      if (p.rows.length > 0) {
        setActiveProject(p.rows[0] as unknown as CMSProject);
        await refreshTasks();
      }
    }
    setIsLoading(false);
  });

  /**
   * Refreshes task list from local PGlite database.
   *
   * Time Complexity: O(log n) for indexed query + O(n) for result processing
   * Space Complexity: O(n) for result array
   */
  const refreshTasks = async (): Promise<void> => {
    const proj = activeProject();
    if (!proj) return;

    const res = await db.query(
      'SELECT id, projectId, title, status, createdAt, updatedAt FROM tasks WHERE projectId = $1 ORDER BY createdAt DESC',
      [proj.id]
    );
    setTasks(res.rows as unknown as CMSTask[]);
  };

  return (
    <div class="min-h-screen bg-slate-950 text-slate-200 font-sans selection:bg-blue-500/30">
      <header class="p-6 border-b border-slate-900 bg-slate-950/80 backdrop-blur-lg sticky top-0 z-50">
        <div class="max-w-7xl mx-auto flex items-center justify-between">
          <div class="flex items-center gap-3">
            <div class="w-9 h-9 bg-gradient-to-tr from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center shadow-lg shadow-blue-500/20">
              <span class="text-white font-black text-lg">V</span>
            </div>
            <div>
              <h1 class="text-xl font-black tracking-tight text-white">Velocity</h1>
              <p class="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Task Board</p>
            </div>
          </div>

          <div class="px-3 py-1.5 bg-slate-900/80 border border-slate-800 rounded-md text-xs font-semibold">
            {activeProject()?.name || 'Loading...'}
          </div>
        </div>
      </header>

      <main class="max-w-7xl mx-auto p-6">
        <Show
          when={!isLoading() && activeProject()}
          fallback={
            <div class="flex items-center justify-center h-48 text-slate-500 text-sm">
              Loading...
            </div>
          }
        >
          <KanbanBoard tasks={tasks()} />
        </Show>
      </main>
    </div>
  );
};

export default App;
