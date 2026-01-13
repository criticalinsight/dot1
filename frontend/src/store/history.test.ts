import { describe, test, expect } from 'bun:test';
import { createUndoRedoStore, Command } from './history';

describe('UndoRedoStore', () => {
    test('manages state transitions', () => {
        const store = createUndoRedoStore(0);

        const addCommand: Command<number> = {
            execute: () => 1,
            undo: () => { },
            description: 'Add 1'
        };

        store.push(addCommand);
        expect(store.state()).toBe(1);
        expect(store.canUndo()).toBe(true);

        store.undo();
        // In this basic mock, undo just moves the pointer
        expect(store.canUndo()).toBe(false);
    });

    test('supports redo', () => {
        const store = createUndoRedoStore('init');
        const updateCommand: Command<string> = {
            execute: () => 'updated',
            undo: () => { },
            description: 'Update'
        };

        store.push(updateCommand);
        store.undo();
        expect(store.canRedo()).toBe(true);

        store.redo();
        expect(store.state()).toBe('updated');
    });
});
