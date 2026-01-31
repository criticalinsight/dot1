import type { Component } from 'solid-js';
import { createSignal, onMount, onCleanup, Show, createMemo } from 'solid-js';
import { ExternalLink } from 'lucide-solid';
import type { CMSProject, CMSTask } from '../../shared/types';
import { sync, getTasks, subscribe, upsertTask } from './db/store';
import { KanbanBoard } from './components/Kanban/Board';
import { PromptModal } from './components/PromptModal';
import { ToastContainer, showToast } from './components/Toast';
import { TemplateLibrary } from './components/TemplateLibrary';
import { EvalDashboard } from './components/EvalDashboard';
import { CmsDashboard } from './components/CmsDashboard';
import { Book, BarChart3, Layout, FileText } from 'lucide-solid';
import { Atmosphere } from './components/Atmosphere';
import Lenis from 'lenis';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

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
  const [isTemplateLibOpen, setIsTemplateLibOpen] = createSignal(false);
  const [isEvalDashboardOpen, setIsEvalDashboardOpen] = createSignal(false);
  // View State
  const [currentView, setCurrentView] = createSignal<'kanban' | 'cms'>('kanban');

  // Search/Filter State
  const [searchQuery, setSearchQuery] = createSignal('');

  /**
   * Syncs with backend and refreshes local task list.
   * Time Complexity: O(n) where n = number of tasks
   */
  const refreshTasks = async (): Promise<void> => {
    const data = await sync();
    if (data.projects.length > 0) {
      setProject(data.projects[0]);
      const projTasks = await getTasks(data.projects[0].id);
      setTasks(projTasks);
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
      const updated = { ...task, status: 'queued' as const, updatedAt: new Date().toISOString() };
      await upsertTask(updated);
    }
  };

  /**
   * Saves task changes to the store.
   * @param updatedTask - The modified task object
   */
  const handleTaskSave = async (updatedTask: CMSTask): Promise<void> => {
    await upsertTask({ ...updatedTask, updatedAt: new Date().toISOString() });
  };

  /**
   * Batch queues all draft tasks for generation.
   * Time Complexity: O(n) where n = number of draft tasks
   */
  const handleRunAll = async (): Promise<void> => {
    const drafts = tasks().filter(t => t.status === 'draft');
    if (drafts.length === 0) return;

    const updates = drafts.map(t => ({ ...t, status: 'queued' as const, updatedAt: new Date().toISOString() }));
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

  /**
   * Triggers project-wide deployment of all 'deployed' tasks.
   */
  const handleDeployAll = async (): Promise<void> => {
    const proj = project();
    if (!proj) return;

    try {
      const res = await fetch('/deploy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId: proj.id })
      });
      const result = await res.json() as any;
      if (result.status === 'ok') {
        showToast(`Deployment successful: ${result.message}`, 'success');
      } else {
        showToast(`Deployment failed: ${result.message}`, 'error');
      }
    } catch (e: any) {
      showToast(`Deployment error: ${e.message}`, 'error');
    }
  };

  /**
   * Filters tasks based on search query.
   */
  const filteredTasks = createMemo(() => {
    const query = searchQuery().toLowerCase().trim();
    const all = tasks();
    if (!query) return all;

    return all.filter(t =>
      t.title.toLowerCase().includes(query) ||
      t.prompt?.toLowerCase().includes(query) ||
      t.output?.toLowerCase().includes(query) ||
      t.tags?.some(tag => tag.toLowerCase().includes(query))
    );
  });

  onMount(async () => {
    document.getElementById('loader')?.remove();

    // --- Lenis Initialization ---
    const lenis = new Lenis({
      duration: 1.2,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      orientation: 'vertical',
      gestureOrientation: 'vertical',
      smoothWheel: true,
      wheelMultiplier: 1,
      infinite: false,
    });

    function raf(time: number) {
      lenis.raf(time);
      requestAnimationFrame(raf);
    }
    requestAnimationFrame(raf);

    // --- GSAP Global Reveals ---
    gsap.from("header", {
      y: -100,
      opacity: 0,
      duration: 1,
      ease: "power4.out",
      delay: 0.5
    });

    if ('requestIdleCallback' in window) {
      requestIdleCallback(() => refreshTasks());
    } else {
      await refreshTasks();
    }

    const unsub = subscribe(async () => {
      const proj = project();
      if (proj) {
        const projTasks = await getTasks(proj.id);
        setTasks(projTasks);
      }
    });
    onCleanup(() => {
      unsub();
      lenis.destroy();
    });
  });

  return (
    <div class="h-screen w-screen bg-slate-950 text-slate-300 flex flex-col font-mono selection:bg-blue-500/30 overflow-hidden relative">
      <div class="grain"></div>
      <Atmosphere />
      {/* Header */}
      <header class="h-14 border-b border-slate-800 flex items-center justify-between px-6 bg-slate-950/20 backdrop-blur-xl sticky top-0 z-50 transition-all duration-500">
        <div class="flex items-center gap-3">
          <div class="overflow-hidden">
            <h1 class="font-black text-xl tracking-tighter text-white uppercase italic transform transition-transform duration-700 hover:skew-x-12 cursor-default">
              Gemini Ops
            </h1>
          </div>
          <span class="text-slate-600 text-sm">@ {project()?.name || 'loading...'}</span>
          <a
            href="https://lynn.moecapital.com"
            target="_blank"
            class="ml-4 flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest bg-emerald-500/10 text-emerald-400 px-2.5 py-1 rounded border border-emerald-500/20 hover:bg-emerald-500/20 transition-all"
          >
            View Production <ExternalLink size={10} />
          </a>
          <button
            onClick={() => setIsTemplateLibOpen(true)}
            class="ml-2 flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest bg-slate-800 text-slate-400 px-3 py-1 rounded border border-slate-700 hover:text-white hover:border-slate-600 transition-all"
          >
            <Book size={10} /> Templates
          </button>
          <button
            onClick={() => setIsEvalDashboardOpen(true)}
            class="ml-2 flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest bg-slate-800 text-slate-400 px-3 py-1 rounded border border-slate-700 hover:text-white hover:border-slate-600 transition-all"
          >
            <BarChart3 size={10} /> Analytics
          </button>
          <div class="ml-4 h-6 w-[1px] bg-slate-800"></div>
          <div class="flex items-center gap-1 bg-slate-900 p-1 rounded-lg border border-slate-800 ml-2">
            <button
              onClick={() => setCurrentView('kanban')}
              class={`flex items-center gap-1 px-2 py-1 rounded text-[9px] font-black uppercase tracking-widest transition-all ${currentView() === 'kanban' ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/40' : 'text-slate-500 hover:text-slate-300'}`}
            >
              <Layout size={10} /> Board
            </button>
            <button
              onClick={() => setCurrentView('cms')}
              class={`flex items-center gap-1 px-2 py-1 rounded text-[9px] font-black uppercase tracking-widest transition-all ${currentView() === 'cms' ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-900/40' : 'text-slate-500 hover:text-slate-300'}`}
            >
              <FileText size={10} /> CMS
            </button>
          </div>
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

      {/* Main Content Area */}
      <div class="flex-1 overflow-hidden p-6 relative">
        <Show
          when={currentView() === 'kanban'}
          fallback={
            <CmsDashboard
              tasks={filteredTasks()}
              onTaskClick={handleTaskClick}
            />
          }
        >
          <div class="h-full w-full">
            <KanbanBoard
              tasks={filteredTasks()}
              onCardClick={handleTaskClick}
              onRun={handleTaskRun}
              onRunAll={handleRunAll}
              onAdd={handleTaskAdd}
              onSearchChange={setSearchQuery}
              onDeployAll={handleDeployAll}
            />
          </div>
        </Show>
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

      <TemplateLibrary
        isOpen={isTemplateLibOpen()}
        onClose={() => setIsTemplateLibOpen(false)}
      />

      <EvalDashboard
        tasks={tasks()}
        isOpen={isEvalDashboardOpen()}
        onClose={() => setIsEvalDashboardOpen(false)}
      />

      <ToastContainer />
    </div>
  );
};

export default App;
