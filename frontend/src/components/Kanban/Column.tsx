import type { Component } from 'solid-js';
import { For, Show, createSignal, createEffect } from 'solid-js';
import { KanbanCard } from './Card';
import type { CMSTask, ContentStatus } from '../../../../shared/types';

interface Props {
    status: ContentStatus;
    tasks: CMSTask[];
}

/** Human-readable status labels */
const STATUS_LABELS: Record<ContentStatus, string> = {
    draft: 'Draft Prompts',
    queued: 'Queued',
    generating: 'Generating',
    deployed: 'Deployed',
};

/**
 * KanbanColumn renders a single status column with its tasks.
 *
 * Time Complexity: O(m) where m = tasks in this column
 * Space Complexity: O(1) - no additional allocations
 *
 * @param props.status - The status this column represents
 * @param props.tasks - Array of tasks with this status
 */
export const KanbanColumn: Component<Props & { onCardClick?: (t: CMSTask) => void, onRun?: (id: string) => void, onRunAll?: () => void, onAdd?: (title: string) => void }> = (props) => {
    const [isAdding, setIsAdding] = createSignal(false);
    const [newTitle, setNewTitle] = createSignal('');
    let inputRef: HTMLInputElement | undefined;

    const handleSubmit = (e: Event) => {
        e.preventDefault();
        const title = newTitle().trim();
        if (title && props.onAdd) {
            props.onAdd(title);
            setNewTitle('');
            setIsAdding(false);
        }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
            setIsAdding(false);
            setNewTitle('');
        }
    };

    // Auto-focus input when opening
    createEffect(() => {
        if (isAdding()) {
            inputRef?.focus();
        }
    });

    return (
        <div class="kanban-column h-full flex flex-col">
            <div class="flex items-center justify-between mb-4">
                <h3 class="text-xs font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
                    {STATUS_LABELS[props.status]}
                    <span class="bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 px-2 py-0.5 rounded text-[10px] blur-sm hover:blur-none transition-all tabular-nums">
                        {props.tasks.length}
                    </span>
                </h3>
                <div class="flex items-center gap-2">
                    <Show when={props.status === 'draft' && props.onAdd}>
                        <button
                            class="text-slate-500 hover:text-white transition-all bg-white/5 hover:bg-white/10 p-1.5 rounded-full"
                            onClick={() => setIsAdding(true)}
                            title="Add Task"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                        </button>
                    </Show>
                    <Show when={props.status === 'draft' && props.tasks.length > 0}>
                        <button
                            class="text-[10px] font-black text-indigo-400 hover:text-white bg-indigo-500/10 hover:bg-indigo-500 border border-indigo-500/20 px-3 py-1 rounded-full transition-all uppercase tracking-tight"
                            onClick={props.onRunAll}
                        >
                            Run All
                        </button>
                    </Show>
                </div>
            </div>

            <div class="flex-1 overflow-y-auto pr-1 space-y-4">
                <Show when={isAdding()}>
                    <form onSubmit={handleSubmit} class="glass p-4 rounded-xl border-indigo-500/30 shadow-2xl animate-spring mb-6">
                        <input
                            ref={inputRef}
                            type="text"
                            value={newTitle()}
                            onInput={(e) => setNewTitle(e.currentTarget.value)}
                            onKeyDown={handleKeyDown}
                            placeholder="Prompt instructions..."
                            class="w-full bg-transparent border-none text-sm text-white focus:outline-none placeholder:text-slate-600 font-mono"
                        />
                        <div class="flex justify-end gap-3 mt-4 pt-4 border-t border-slate-800/50">
                            <button type="button" onClick={() => setIsAdding(false)} class="text-[10px] uppercase font-black text-slate-500 hover:text-slate-300 tracking-widest">Cancel</button>
                            <button type="submit" class="text-[10px] uppercase font-black text-indigo-400 hover:text-indigo-300 tracking-widest">Add Task</button>
                        </div>
                    </form>
                </Show>

                <For each={props.tasks}>{(task) =>
                    <KanbanCard
                        task={task}
                        onClick={props.onCardClick}
                        onRun={props.onRun}
                    />
                }</For>

                <Show when={props.tasks.length === 0 && !isAdding()}>
                    <div class="flex-1 flex flex-col items-center justify-center opacity-10 py-20 pointer-events-none">
                        <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line></svg>
                        <span class="text-[10px] font-black uppercase tracking-[0.3em] mt-2">No signals</span>
                    </div>
                </Show>
            </div>
        </div>
    );
};
