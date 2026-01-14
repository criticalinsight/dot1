import { upsertTask } from './db/store';
import type { CMSProject, CMSTask } from '../../shared/types';

type PrintFn = (text: string, type?: 'command' | 'output' | 'error' | 'success') => void;

interface CommandContext {
    print: PrintFn;
    project: CMSProject | null;
    tasks: CMSTask[];
    clearOutput: () => void;
}

const HELP_TEXT = `Commands:
  ls              List all tasks
  add <title>     Create task
  mv <id> <status> Move task (backlog|researching|drafting|review|published)
  clear           Clear screen
  help            Show help`;

/**
 * Parses and executes a CLI command.
 * 
 * @param cmd - The raw command string
 * @param ctx - The execution context (print fn, state)
 */
export async function executeCommand(cmd: string, ctx: CommandContext): Promise<void> {
    ctx.print(`$ ${cmd}`, 'command');
    const parts = cmd.trim().split(/\s+/);
    const command = parts[0]?.toLowerCase();

    switch (command) {
        case 'ls':
        case 'list': {
            if (ctx.tasks.length === 0) {
                ctx.print('No tasks.', 'output');
            } else {
                ctx.print('ID       STATUS       TITLE', 'output');
                ctx.tasks.forEach((task) => {
                    ctx.print(`${task.id.slice(0, 8)} ${task.status.padEnd(12)} ${task.title}`, 'output');
                });
            }
            break;
        }

        case 'add':
        case 'new': {
            const title = parts.slice(1).join(' ');
            if (!title) { ctx.print('Usage: add <title>', 'error'); return; }
            if (!ctx.project) { ctx.print('No project.', 'error'); return; }

            const newTask: CMSTask = {
                id: crypto.randomUUID(),
                projectId: ctx.project.id,
                title,
                prompt: title, // Default prompt to title
                status: 'draft',
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
            };
            await upsertTask(newTask);
            ctx.print(`Created: ${newTask.id.slice(0, 8)}`, 'success');
            break;
        }

        case 'mv':
        case 'move': {
            const [, idPrefix, newStatus] = parts;
            if (!idPrefix || !newStatus) { ctx.print('Usage: mv <id> <status>', 'error'); return; }

            const valid = ['backlog', 'researching', 'drafting', 'review', 'published'];
            if (!valid.includes(newStatus)) { ctx.print(`Status: ${valid.join('|')}`, 'error'); return; }

            const task = ctx.tasks.find((t) => t.id.startsWith(idPrefix));
            if (!task) { ctx.print(`Not found: ${idPrefix}`, 'error'); return; }

            await upsertTask({
                ...task,
                status: newStatus as CMSTask['status'],
                updatedAt: new Date().toISOString()
            });
            ctx.print(`${idPrefix} → ${newStatus}`, 'success');
            break;
        }

        case 'clear':
        case 'cls':
            ctx.clearOutput();
            break;

        case 'help':
        case '?':
            HELP_TEXT.split('\n').forEach((l) => ctx.print(l));
            break;

        case '':
            break;

        default:
            ctx.print(`Unknown: ${command}. Type 'help'`, 'error');
    }
}
