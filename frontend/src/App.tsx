import type { Component } from 'solid-js';
import { createSignal, onMount, onCleanup } from 'solid-js';
import type { CMSProject, CMSTask } from '../../shared/types';
import { sync, getTasks, subscribe } from './db/store';
// import { executeCommand } from './commands'; // Moved to worker
import { VirtualList } from './components/VirtualList';
import CliWorker from './workers/cli.worker?worker'; // Vite worker import
import type { WorkerMessage, WorkerResponse } from './workers/cli.worker';

interface OutputLine {
  type: 'command' | 'output' | 'error' | 'success';
  text: string;
}

const App: Component = () => {
  const [project, setProject] = createSignal<CMSProject | null>(null);
  const [tasks, setTasks] = createSignal<CMSTask[]>([]);
  const [output, setOutput] = createSignal<OutputLine[]>([]);
  const [input, setInput] = createSignal('');
  const [ready, setReady] = createSignal(false);
  const [history, setHistory] = createSignal<string[]>([]);
  const [historyIdx, setHistoryIdx] = createSignal(-1);
  let inputRef: HTMLInputElement | undefined;

  // Phase 8: Worker Instance
  const worker = new CliWorker();

  const print = (text: string, type: OutputLine['type'] = 'output') => {
    // Phase 7: Removing 100 line limit because VirtualList handles it
    setOutput((prev) => [...prev, { type, text }]);
  };

  const handleWorkerMessage = (e: MessageEvent<WorkerResponse>) => {
    const { type, output: newLines } = e.data;
    if (type === 'RESULT' || type === 'ERROR') {
      newLines.forEach(l => print(l.text, l.type as any));
    }
  };

  const refreshTasks = async () => {
    const data = await sync();
    if (data.projects.length > 0) {
      setProject(data.projects[0]);
      setTasks(getTasks(data.projects[0].id));
    }
  };

  const handleCommand = (cmd: string) => {
    print(`$ ${cmd}`, 'command');
    if (cmd === 'clear') {
      setOutput([]);
      return;
    }

    // Phase 8: Off-main-thread execution
    worker.postMessage({
      id: crypto.randomUUID(),
      type: 'EXECUTE',
      payload: {
        cmd,
        project: project(),
        tasks: tasks() // Structured clone of tasks array
      }
    } as WorkerMessage);
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

  const handleKeyDown = (e: KeyboardEvent) => {
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
    worker.onmessage = handleWorkerMessage; // Bind worker listener

    print('Velocity CLI v3.0 (Phase 8: Extreme)', 'output');

    // Phase 7: Idle Callback for initial sync
    if ('requestIdleCallback' in window) {
      requestIdleCallback(() => refreshTasks());
    } else {
      await refreshTasks();
    }

    // print(`${tasks().length} tasks loaded`, 'success');
    // Warning: tasks() might be empty initially if idle callback hasn't run.

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
        <div class="terminal-title">velocity@{project()?.name || 'edge'} [Worker: ON]</div>
        <div class="terminal-status">{tasks().length}</div>
      </header>

      <div class="terminal-body">
        {/* Phase 7: Virtual Rendering of Output */}
        <VirtualList
          items={output()}
          rowHeight={24} // Approximate line height for monospace font
          height="calc(100% - 40px)" // Leave room for input line
          scrollToBottom={true}
          renderRow={(line) => (
            <div class={`line line-${line.type}`}>{line.text || '\u00A0'}</div>
          )}
        />

        <form onSubmit={handleSubmit} class="input-line" style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: '#0d0d0d' }}>
          <span class="prompt">$</span>
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
    </div>
  );
};

export default App;
