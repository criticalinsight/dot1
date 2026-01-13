import { executeCommand } from '../commands';
import type { CMSProject, CMSTask } from '../../../shared/types';

// Types for Worker Messages
export type WorkerMessage = {
    id: string;
    type: 'EXECUTE';
    payload: {
        cmd: string;
        project: CMSProject | null;
        tasks: CMSTask[];
    };
};

export type WorkerResponse = {
    id: string;
    type: 'RESULT' | 'ERROR';
    output: Array<{ type: 'command' | 'output' | 'error' | 'success'; text: string }>;
};

// Fake print function to capture output in worker
const createPrinter = () => {
    const lines: Array<{ type: 'command' | 'output' | 'error' | 'success'; text: string }> = [];
    return {
        lines,
        print: (text: string, type: 'command' | 'output' | 'error' | 'success' = 'output') => {
            lines.push({ type, text });
        }
    };
};

/**
 * Phase 8: Off-main-thread processing.
 * 
 * Handles CPU-intensive command parsing, filtering, and sorting.
 * 
 * Complexity:
 * - Parsing: O(C) where C is command length
 * - Execution: Depends on command (e.g. 'ls' is O(N log N) for sort)
 * - Overhead: Serialization cost O(N) for message passing (until SharedArrayBuffer)
 */
self.onmessage = async (e: MessageEvent<WorkerMessage>) => {
    const { id, type, payload } = e.data;

    if (type === 'EXECUTE') {
        const printer = createPrinter();

        try {
            // Execute command in worker thread
            // Note: We are passing COPIES of data here (structured clone). 
            // For "Extreme" Phase 8+, we would use SharedArrayBuffer, but 
            // simple structured clone is already a huge win for keeping UI responsive.
            await executeCommand(payload.cmd, {
                print: printer.print,
                project: payload.project,
                tasks: payload.tasks,
                clearOutput: () => { }, // No-op in worker, managed by UI state replacement
            });

            self.postMessage({
                id,
                type: 'RESULT',
                output: printer.lines
            } as WorkerResponse);

        } catch (err: any) {
            self.postMessage({
                id,
                type: 'ERROR',
                output: [{ type: 'error', text: err.message || 'Worker Error' }]
            } as WorkerResponse);
        }
    }
};
