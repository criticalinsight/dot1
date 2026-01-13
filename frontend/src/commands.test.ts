import { describe, it, expect, vi } from 'vitest';
import { executeCommand } from './commands';
import { CMSTask } from '../../shared/types';

describe('CLI Commands', () => {
    const mockTasks: CMSTask[] = [
        { id: '1', projectId: 'p1', title: 'Task 1', status: 'backlog', createdAt: '', updatedAt: '' },
        { id: '2', projectId: 'p1', title: 'Task 2', status: 'done', createdAt: '', updatedAt: '' }
    ];

    it('should print help command', async () => {
        const printer = { print: vi.fn(), lines: [] as any[] };

        await executeCommand('help', {
            print: (text, type) => printer.print(text, type),
            project: null,
            tasks: [],
            clearOutput: () => { }
        });

        expect(printer.print).toHaveBeenCalled();
        const calls = (printer.print as any).mock.calls;
        const hasHelp = calls.some((c: any) => c[0] && c[0].includes('Commands'));
        expect(hasHelp).toBe(true);
    });

    it('should list tasks with ls', async () => {
        const printer = { print: vi.fn() };

        await executeCommand('ls', {
            print: (text, type) => printer.print(text, type),
            project: { id: 'p1', name: 'Test', globalPrompt: '', knowledgeContext: '', scheduleInterval: '' } as any,
            tasks: mockTasks,
            clearOutput: () => { }
        });

        expect(printer.print).toHaveBeenCalledWith(expect.stringContaining('Task 1'), expect.anything());
    });

    it('should handle unknown commands', async () => {
        const printer = { print: vi.fn() };

        await executeCommand('xyz', {
            print: (text, type) => printer.print(text, type),
            project: null,
            tasks: [],
            clearOutput: () => { }
        });

        expect(printer.print).toHaveBeenCalledWith(expect.stringContaining('Unknown'), 'error');
    });
});
