import type { Component } from 'solid-js';
import { createSignal, onMount, For, createEffect, onCleanup } from 'solid-js';
import type { CMSProject, CMSTask } from '../../shared/types';
import { sync, getTasks, upsertTask, subscribe } from './db/store';

interface OutputLine {
  type: 'command' | 'output' | 'error' | 'success';
  text: string;
}

const HELP = `Commands:
  ls              List all tasks
  add <title>     Create task
  mv <id> <status> Move task (backlog|researching|drafting|review|published)
  clear           Clear screen
  help            Show help`;

/**
 * CLI App with command history and keyboard navigation.
 *
 * Phase 2 Optimizations:
 * - Command history (up/down arrows)
 * - Batch display updates
 */
const App: Component = () => {
  const [project, setProject] = createSignal<CMSProject | null>(null);
  const [tasks, setTasks] = createSignal<CMSTask[]>([]);
  const [output, setOutput] = createSignal<OutputLine[]>([]);
  const [input, setInput] = createSignal('');
  const [ready, setReady] = createSignal(false);
  const [history, setHistory] = createSignal<string[]>([]);
  const [historyIdx, setHistoryIdx] = createSignal(-1);
  let inputRef: HTMLInputElement | undefined;
  let outputRef: HTMLDivElement | undefined;

  const print = (text: string, type: OutputLine['type'] = 'output') => {
    setOutput((prev) => [...prev.slice(-100), { type, text }]); // Keep last 100 lines
  };

  const refreshTasks = async () => {
    const data = await sync();
    if (data.projects.length > 0) {
      setProject(data.projects[0]);
      setTasks(getTasks(data.projects[0].id));
    }
  };

  const handleCommand = async (cmd: string) => {
    print(`$ ${cmd}`, 'command');
    const parts = cmd.trim().split(/\s+/);
    const command = parts[0]?.toLowerCase();

    switch (command) {
      case 'ls':
      case 'list': {
        const t = tasks();
        if (t.length === 0) {
          print('No tasks.', 'output');
        } else {
          print('ID       STATUS       TITLE', 'output');
          t.forEach((task) => {
            print(`${task.id.slice(0, 8)} ${task.status.padEnd(12)} ${task.title}`, 'output');
          });
        }
        break;
      }

      case 'add':
      case 'new': {
        const title = parts.slice(1).join(' ');
        if (!title) { print('Usage: add <title>', 'error'); break; }
        const proj = project();
        if (!proj) { print('No project.', 'error'); break; }
        const newTask: CMSTask = {
          id: crypto.randomUUID(),
          projectId: proj.id,
          title,
          status: 'backlog',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        await upsertTask(newTask);
        print(`Created: ${newTask.id.slice(0, 8)}`, 'success');
        break;
      }

      case 'mv':
      case 'move': {
        const [, idPrefix, newStatus] = parts;
        if (!idPrefix || !newStatus) { print('Usage: mv <id> <status>', 'error'); break; }
        const valid = ['backlog', 'researching', 'drafting', 'review', 'published'];
        if (!valid.includes(newStatus)) { print(`Status: ${valid.join('|')}`, 'error'); break; }
        const task = tasks().find((t) => t.id.startsWith(idPrefix));
        if (!task) { print(`Not found: ${idPrefix}`, 'error'); break; }
        await upsertTask({ ...task, status: newStatus as CMSTask['status'], updatedAt: new Date().toISOString() });
        print(`${idPrefix} → ${newStatus}`, 'success');
        break;
      }

      case 'clear':
      case 'cls':
        setOutput([]);
        break;

      case 'help':
      case '?':
        HELP.split('\n').forEach((l) => print(l));
        break;

      case '':
        break;

      default:
        print(`Unknown: ${command}. Type 'help'`, 'error');
    }
  };

  const handleSubmit = async (e: Event) => {
    e.preventDefault();
    const cmd = input();
    if (cmd.trim()) {
      setHistory((h) => [...h.slice(-50), cmd]);
      setHistoryIdx(-1);
    }
    setInput('');
    await handleCommand(cmd);
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
    print('Velocity CLI v2.4', 'output');
    await refreshTasks();
    print(`${tasks().length} tasks from ${project()?.name || 'project'}`, 'success');
    print("'help' for commands\n", 'output');
    setReady(true);
    inputRef?.focus();

    // Subscribe to store updates
    const unsub = subscribe(() => {
      const proj = project();
      if (proj) setTasks(getTasks(proj.id));
    });
    onCleanup(unsub);
  });

  createEffect(() => {
    output();
    outputRef?.scrollTo(0, outputRef.scrollHeight);
  });

  return (
    <div class="terminal" onClick={() => inputRef?.focus()}>
      <header class="terminal-header">
        <div class="terminal-title">velocity@{project()?.name || 'edge'}</div>
        <div class="terminal-status">{tasks().length}</div>
      </header>

      <div class="terminal-body" ref={outputRef}>
        <For each={output()}>
          {(line) => <div class={`line line-${line.type}`}>{line.text || '\u00A0'}</div>}
        </For>

        <form onSubmit={handleSubmit} class="input-line">
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
