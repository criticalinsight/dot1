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
        <div class="flex-shrink-0 w-72 flex flex-col gap-3">
            <div class="flex items-center justify-between px-1">
                <h3 class="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                    {STATUS_LABELS[props.status]}
                    <span class="bg-slate-800/80 text-slate-500 px-1.5 py-0.5 rounded text-[10px] tabular-nums">
                        {props.tasks.length}
                    </span>
                </h3>
                <div class="flex items-center gap-2">
                    <Show when={props.status === 'draft' && props.onAdd}>
                        <button
                            class="text-slate-500 hover:text-white transition-colors"
                            onClick={() => setIsAdding(true)}
                            title="Add Task"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                        </button>
                    </Show>
                    <Show when={props.status === 'draft' && props.tasks.length > 0}>
                        <button
                            class="text-[10px] font-bold text-blue-500 hover:text-blue-400 hover:bg-blue-900/30 px-2 py-0.5 rounded transition-colors uppercase tracking-tight"
                            onClick={props.onRunAll}
                        >
                            Run All
                        </button>
                    </Show>
                </div>
            </div>

            <div class="flex-1 flex flex-col gap-2 min-h-[400px] p-2 bg-slate-900/30 rounded-xl border border-slate-800/50">
                <Show when={isAdding()}>
                    <form onSubmit={handleSubmit} class="p-3 bg-slate-900 rounded-lg border border-blue-500/50 shadow-lg">
                        <input
                            ref={inputRef}
                            type="text"
                            value={newTitle()}
                            onInput={(e) => setNewTitle(e.currentTarget.value)}
                            onKeyDown={handleKeyDown}
                            placeholder="Enter prompt..."
                            class="w-full bg-transparent border-none text-sm text-white focus:outline-none placeholder:text-slate-600"
                        />
                        <div class="flex justify-end gap-2 mt-2">
                            <button type="button" onClick={() => setIsAdding(false)} class="text-[10px] uppercase font-bold text-slate-500 hover:text-slate-300">Cancel</button>
                            <button type="submit" class="text-[10px] uppercase font-bold text-blue-500 hover:text-blue-400">Add</button>
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
                    <div class="flex-1 flex items-center justify-center opacity-30">
                        <span class="text-[10px] font-bold uppercase tracking-tight">Empty</span>
                    </div>
                </Show>
            </div>
        </div>
    );
};
