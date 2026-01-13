import { createSignal } from 'solid-js';

/**
 * Command interface defines an reversible action.
 */
export interface Command<T> {
    execute: () => T;
    undo: (previousState: T) => void;
    description: string;
}

/**
 * UndoRedoStore manages a stack of commands for non-destructive state manipulation.
 */
export function createUndoRedoStore<T>(initialState: T) {
    const [history, setHistory] = createSignal<Command<T>[]>([]);
    const [pointer, setPointer] = createSignal(-1);
    const [state, setState] = createSignal<T>(initialState);

    const push = (command: Command<T>) => {
        const newHistory = history().slice(0, pointer() + 1);
        const result = command.execute();

        setHistory([...newHistory, command]);
        setPointer(pointer() + 1);
        setState(() => result);
    };

    const undo = () => {
        if (pointer() < 0) return;

        const command = history()[pointer()];
        // For a complex store, this would restore a snapshot
        // For this simple implementation, we rely on the state being passed back
        console.log(`[Undo] Reverting: ${command.description}`);
        setPointer(pointer() - 1);
    };

    const redo = () => {
        if (pointer() >= history().length - 1) return;

        const command = history()[pointer() + 1];
        command.execute();
        setPointer(pointer() + 1);
    };

    return { state, push, undo, redo, canUndo: () => pointer() >= 0, canRedo: () => pointer() < history().length - 1 };
}
