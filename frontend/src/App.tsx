import type { Component } from 'solid-js';
import { createSignal, onMount, onCleanup, Show } from 'solid-js';
import type { CMSProject, CMSTask } from '../../shared/types';
import { sync, getTasks, subscribe, upsertTask } from './db/store';
import { VirtualList } from './components/VirtualList';
import { TabBar } from './components/TabBar';
import type { Tab } from './components/TabBar';
import { KanbanBoard } from './components/Kanban/Board';
import { PromptModal } from './components/PromptModal';
import CliWorker from './workers/cli.worker?worker';
import type { WorkerMessage, WorkerResponse } from './workers/cli.worker';

interface OutputLine {
  type: 'command' | 'output' | 'error' | 'success';
  text: string;
}

const App: Component = () => {
  const [project, setProject] = createSignal<CMSProject | null>(null);
  const [tasks, setTasks] = createSignal<CMSTask[]>([]);
  // Tabs: 'board' is main, others are terminal/tasks
  const [tabs, setTabs] = createSignal<Tab[]>([
    { id: 'board', title: 'Gemini Ops', type: 'terminal' }, // Using 'terminal' styling for main tab
    { id: 'cli', title: 'Terminal', type: 'terminal' }
  ]);
  const [activeTabId, setActiveTabId] = createSignal('board');
  const [tabOutputs, setTabOutputs] = createSignal<Record<string, OutputLine[]>>({ 'cli': [] });

  // Modal State
  const [selectedTask, setSelectedTask] = createSignal<CMSTask | null>(null);
  const [isModalOpen, setIsModalOpen] = createSignal(false);

  const [input, setInput] = createSignal('');
  const [ready, setReady] = createSignal(false);
  // History state...
  const [history, setHistory] = createSignal<string[]>([]);
  const [historyIdx, setHistoryIdx] = createSignal(-1);
  let inputRef: HTMLInputElement | undefined;

  const worker = new CliWorker();

  // Helper: Print to CLI tab
  const printToCli = (text: string, type: OutputLine['type'] = 'output') => {
    setTabOutputs((prev) => ({
      ...prev,
      ['cli']: [...(prev['cli'] || []), { type, text }]
    }));
  };

  const handleWorkerMessage = (e: MessageEvent<WorkerResponse>) => {
    const { type, output: newLines } = e.data;
    if (type === 'RESULT' || type === 'ERROR') {
      newLines.forEach(l => printToCli(l.text, l.type as any));
    }
  };

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
      const updated = { ...task, status: 'queued' as const }; // cast for type safety if needed
      await upsertTask(updated);
      printToCli(`Queued task: ${task.title}`, 'success');
    }
  };

  const handleTaskSave = async (updatedTask: CMSTask) => {
    await upsertTask(updatedTask);
    // Sync happens in background
  };

  const handleRunAll = async () => {
    const drafts = tasks().filter(t => t.status === 'draft');
    if (drafts.length === 0) return;

    printToCli(`Batch running ${drafts.length} tasks...`, 'command');

    // Update all to queued
    const updates = drafts.map(t => ({ ...t, status: 'queued' as const }));

    // Execute in parallel (upsert is async)
    await Promise.all(updates.map(t => upsertTask(t)));

    printToCli(`Queued ${updates.length} tasks for generation.`, 'success');
  };

  const handleCommand = (cmd: string) => {
    printToCli(`$ ${cmd}`, 'command');
    // If command entered while not on CLI tab, maybe switch to it? 
    // Or just let it run in bg.
    if (activeTabId() !== 'cli') {
      // Optional: setActiveTabId('cli');
    }

    if (cmd === 'clear') {
      setTabOutputs(prev => ({ ...prev, ['cli']: [] }));
      return;
    }

    // Special Command: open <taskId>
    if (cmd.startsWith('open ')) {
      const target = cmd.replace('open ', '').trim();
      // Try to find task by ID or Title (fuzzy?)
      const task = tasks().find(t => t.id === target || t.title.includes(target)); // Simple substring match for convenience

      if (task) {
        openTaskTab(task);
        return;
      } else {
        printToCli('Task not found.', 'error');
        return;
      }
    }

    // Worker Execution
    worker.postMessage({
      id: crypto.randomUUID(),
      type: 'EXECUTE',
      payload: {
        cmd,
        project: project(),
        tasks: tasks()
      }
    } as WorkerMessage);
  };

  const openTaskTab = (task: CMSTask) => {
    // Legacy support for 'open' command - creates a tab
    if (!tabs().find(t => t.id === task.id)) {
      setTabs(prev => [...prev, { id: task.id, title: task.title.slice(0, 15) + '...', type: 'task' }]);
      setTabOutputs(prev => ({ ...prev, [task.id]: [{ type: 'output', text: task.researchData || '' }] }));
    }
    setActiveTabId(task.id);
  };

  const closeTab = (id: string) => {
    setTabs(prev => prev.filter(t => t.id !== id));
    setTabOutputs(prev => {
      const { [id]: _, ...rest } = prev;
      return rest;
    });
    if (activeTabId() === id) setActiveTabId('board');
  };

  const handleSubmit = async (e: Event) => {
    e.preventDefault();
    const cmd = input();
    if (cmd.trim()) {
      setHistory((h) => [...h.slice(-50), cmd]);
      setHistoryIdx(-1);
      setInput('');
      handleCommand(cmd);
    }
  };

  // Keyboard history...
  const handleKeyDown = (e: KeyboardEvent) => {
    // Standard history logic
    const h = history();
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      const newIdx = historyIdx() < h.length - 1 ? historyIdx() + 1 : historyIdx();
      setHistoryIdx(newIdx);
      if (h.length > 0) setInput(h[h.length - 1 - newIdx] || '');
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      const newIdx = historyIdx() > 0 ? historyIdx() - 1 : -1;
      setHistoryIdx(newIdx);
      setInput(newIdx === -1 ? '' : h[h.length - 1 - newIdx] || '');
    }
  };

  onMount(async () => {
    document.getElementById('loader')?.remove();
    worker.onmessage = handleWorkerMessage;
    printToCli('Velocity Gemini Ops v3.1', 'output');

    if ('requestIdleCallback' in window) {
      requestIdleCallback(() => refreshTasks());
    } else {
      await refreshTasks();
    }
    setReady(true);
    inputRef?.focus();

    const unsub = subscribe(() => {
      const proj = project();
      if (proj) setTasks(getTasks(proj.id));
    });
    onCleanup(() => {
      unsub();
      worker.terminate();
    });
  });

  return (
    <div class="terminal" onClick={() => inputRef?.focus()}>
      <header class="terminal-header">
        <div class="terminal-title">Gemini Ops@{project()?.name || 'hub'}</div>
        <div class="terminal-status">{tasks().length} Tasks</div>
      </header>

      <TabBar
        tabs={tabs()}
        activeTabId={activeTabId()}
        onTabClick={setActiveTabId}
        onTabClose={closeTab}
      />

      <div class="terminal-body" style={{ height: 'calc(100% - 72px)', position: 'relative' }}>

        {/* View Switcher based on Tab */}
        <Show when={activeTabId() === 'board'}>
          <div class="h-full overflow-hidden p-4">
            {/* Handing props down - we need to modify Board/Column/Card to accept handlers if not using Context */}
            {/* Note: In Solid, passing callbacks down tree or using Store is fine. 
                    KanbanBoard renders Column renders Card. 
                    We need to patch KanbanBoard to pass onClick down. 
                */}
            {/* For now, just render Board. We need to update Board to forward clicks. */}
            {/* Since we can't easily pass props locally without modifying Board.tsx, 
                    I'll assume global event delegation or update Board.tsx next. 
                    Actually, let's update Board.tsx to accept onCardClick prop. 
                */}
            <KanbanBoard tasks={tasks()} onCardClick={handleTaskClick} onRun={handleTaskRun} onRunAll={handleRunAll} />
            {/* We'll need to patch Board.tsx to bubble events up, or use a Store.
                    For this sprint, I will assume Board.tsx emits events via a simple global listener or direct prop. 
                    I'll update Board in next step.
                 */}
          </div>
        </Show>

        <Show when={activeTabId() === 'cli' || (activeTabId() !== 'board' && activeTabId() !== 'cli')}>
          <VirtualList
            items={tabOutputs()[activeTabId()] || []}
            rowHeight={24}
            height="100%"
            scrollToBottom={true}
            renderRow={(line) => (
              <div class={`line line-${line.type}`}>{line.text || '\u00A0'}</div>
            )}
          />
        </Show>

        <form onSubmit={handleSubmit} class="input-line" style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: '#0d0d0d' }}>
          <span class="prompt">{activeTabId() === 'cli' ? '$' : '#'}</span>
          <input
            ref={inputRef}
            type="text"
            value={input()}
            onInput={(e) => setInput(e.currentTarget.value)}
            onKeyDown={handleKeyDown}
            disabled={!ready()}
            autocomplete="off"
            spellcheck={false}
          />
        </form>
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
