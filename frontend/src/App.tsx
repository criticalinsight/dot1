import type { Component } from 'solid-js';
import { createSignal, onMount, onCleanup, Show } from 'solid-js';
import type { CMSProject, CMSTask } from '../../shared/types';
import { sync, getTasks, subscribe, upsertTask } from './db/store';
import { KanbanBoard } from './components/Kanban/Board';
import { PromptModal } from './components/PromptModal';

const App: Component = () => {
  const [project, setProject] = createSignal<CMSProject | null>(null);
  const [tasks, setTasks] = createSignal<CMSTask[]>([]);

  // Modal State
  const [selectedTask, setSelectedTask] = createSignal<CMSTask | null>(null);
  const [isModalOpen, setIsModalOpen] = createSignal(false);

  const refreshTasks = async () => {
    const data = await sync();
    if (data.projects.length > 0) {
      setProject(data.projects[0]);
      setTasks(getTasks(data.projects[0].id));
    }
  };

  // Card Interactions
  const handleTaskClick = (task: CMSTask) => {
    setSelectedTask(task);
    setIsModalOpen(true);
  };

  const handleTaskRun = async (taskOrId: string | CMSTask) => {
    let task: CMSTask | undefined;
    if (typeof taskOrId === 'string') {
      task = tasks().find(t => t.id === taskOrId);
    } else {
      task = taskOrId;
    }

    if (task) {
      // Optimistic update to 'queued'
      const updated = { ...task, status: 'queued' as const };
      await upsertTask(updated);
      // NOTE: Processing happens in backend or via manual trigger for now
      // In future, PGlite/Queue will pick this up
    }
  };

  const handleTaskSave = async (updatedTask: CMSTask) => {
    await upsertTask(updatedTask);
  };

  const handleRunAll = async () => {
    const drafts = tasks().filter(t => t.status === 'draft');
    if (drafts.length === 0) return;

    // Update all to queued
    const updates = drafts.map(t => ({ ...t, status: 'queued' as const }));

    // Execute in parallel (upsert is async)
    await Promise.all(updates.map(t => upsertTask(t)));
  };

  onMount(async () => {
    document.getElementById('loader')?.remove();

    if ('requestIdleCallback' in window) {
      requestIdleCallback(() => refreshTasks());
    } else {
      await refreshTasks();
    }

    const unsub = subscribe(() => {
      const proj = project();
      if (proj) setTasks(getTasks(proj.id));
    });
    onCleanup(() => {
      unsub();
    });
  });

  return (
    <div class="h-screen w-screen bg-slate-950 text-slate-300 flex flex-col font-mono selection:bg-blue-500/30">
      {/* Header */}
      <header class="h-14 border-b border-slate-800 flex items-center justify-between px-6 bg-slate-950/50 backdrop-blur-md sticky top-0 z-10">
        <div class="flex items-center gap-3">
          <h1 class="font-bold text-lg tracking-tight text-white">Gemini Ops</h1>
          <span class="text-slate-600 text-sm">@ {project()?.name || 'loading...'}</span>
        </div>
        <div class="flex items-center gap-4 text-xs font-bold text-slate-500 uppercase tracking-widest">
          <div class="flex items-center gap-2">
            <div class="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></div>
            <span>Socket Connected</span>
          </div>
          <div class="bg-slate-900 px-3 py-1.5 rounded border border-slate-800 tabular-nums text-slate-400">
            {tasks().length} Tasks
          </div>
        </div>
      </header>

      {/* Main Board Area */}
      <div class="flex-1 overflow-hidden p-6 relative">
        <div class="h-full w-full">
          <KanbanBoard tasks={tasks()} onCardClick={handleTaskClick} onRun={handleTaskRun} onRunAll={handleRunAll} />
        </div>
      </div>

      {/* Modal Portal */}
      <Show when={selectedTask()}>
        <PromptModal
          task={selectedTask()!}
          isOpen={isModalOpen()}
          onClose={() => setIsModalOpen(false)}
          onRun={handleTaskRun}
          onSave={handleTaskSave}
        />
      </Show>
    </div>
  );
};

export default App;
