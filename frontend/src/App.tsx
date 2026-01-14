import type { Component } from 'solid-js';
import { createSignal, onMount, onCleanup, Show } from 'solid-js';
import type { CMSProject, CMSTask } from '../../shared/types';
import { sync, getTasks, subscribe, upsertTask } from './db/store';
import { KanbanBoard } from './components/Kanban/Board';
import { PromptModal } from './components/PromptModal';

/**
 * Main Gemini Ops Application Component.
 * Renders Kanban Board for prompt engineering workflow.
 */
const App: Component = () => {
  const [project, setProject] = createSignal<CMSProject | null>(null);
  const [tasks, setTasks] = createSignal<CMSTask[]>([]);

  // Modal State
  const [selectedTask, setSelectedTask] = createSignal<CMSTask | null>(null);
  const [isModalOpen, setIsModalOpen] = createSignal(false);

  /**
   * Syncs with backend and refreshes local task list.
   * Time Complexity: O(n) where n = number of tasks
   */
  const refreshTasks = async (): Promise<void> => {
    const data = await sync();
    if (data.projects.length > 0) {
      setProject(data.projects[0]);
      setTasks(getTasks(data.projects[0].id));
    }
  };

  /**
   * Opens the Playground Modal for a selected task.
   * @param task - The task to view/edit
   */
  const handleTaskClick = (task: CMSTask): void => {
    setSelectedTask(task);
    setIsModalOpen(true);
  };

  /**
   * Queues a task for AI generation.
   * @param taskOrId - Task object or task ID string
   * Time Complexity: O(n) for find if ID passed, O(1) if task passed
   */
  const handleTaskRun = async (taskOrId: string | CMSTask): Promise<void> => {
    let task: CMSTask | undefined;
    if (typeof taskOrId === 'string') {
      task = tasks().find(t => t.id === taskOrId);
    } else {
      task = taskOrId;
    }

    if (task) {
      const updated = { ...task, status: 'queued' as const };
      await upsertTask(updated);
    }
  };

  /**
   * Saves task changes to the store.
   * @param updatedTask - The modified task object
   */
  const handleTaskSave = async (updatedTask: CMSTask): Promise<void> => {
    await upsertTask(updatedTask);
  };

  /**
   * Batch queues all draft tasks for generation.
   * Time Complexity: O(n) where n = number of draft tasks
   */
  const handleRunAll = async (): Promise<void> => {
    const drafts = tasks().filter(t => t.status === 'draft');
    if (drafts.length === 0) return;

    const updates = drafts.map(t => ({ ...t, status: 'queued' as const }));
    await Promise.all(updates.map(t => upsertTask(t)));
  };

  /**
   * Creates a new draft task.
   * @param title - The initial title/prompt for the task
   * Time Complexity: O(1)
   */
  const handleTaskAdd = async (title: string): Promise<void> => {
    const proj = project();
    if (!proj) return;

    const newTask: CMSTask = {
      id: crypto.randomUUID(),
      projectId: proj.id,
      title: title,
      status: 'draft',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      prompt: title,
      history: []
    };

    await upsertTask(newTask);
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
          <KanbanBoard
            tasks={tasks()}
            onCardClick={handleTaskClick}
            onRun={handleTaskRun}
            onRunAll={handleRunAll}
            onAdd={handleTaskAdd}
          />
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
