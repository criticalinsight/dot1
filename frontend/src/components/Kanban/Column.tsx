import type { Component } from 'solid-js';
import { For, Show } from 'solid-js';
import { KanbanCard } from './Card';
import type { CMSTask, ContentStatus } from '../../../../shared/types';

interface Props {
    status: ContentStatus;
    tasks: CMSTask[];
}

/** Human-readable status labels */
const STATUS_LABELS: Record<ContentStatus, string> = {
    backlog: 'Backlog',
    researching: 'Researching',
    drafting: 'Drafting',
    review: 'Review',
    published: 'Published',
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
export const KanbanColumn: Component<Props> = (props) => {
    return (
        <div class="flex-shrink-0 w-72 flex flex-col gap-3">
            <div class="flex items-center justify-between px-1">
                <h3 class="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                    {STATUS_LABELS[props.status]}
                    <span class="bg-slate-800/80 text-slate-500 px-1.5 py-0.5 rounded text-[10px] tabular-nums">
                        {props.tasks.length}
                    </span>
                </h3>
            </div>

            <div class="flex-1 flex flex-col gap-2 min-h-[400px] p-2 bg-slate-900/30 rounded-xl border border-slate-800/50">
                <For each={props.tasks}>{(task) => <KanbanCard task={task} />}</For>

                <Show when={props.tasks.length === 0}>
                    <div class="flex-1 flex items-center justify-center opacity-30">
                        <span class="text-[10px] font-bold uppercase tracking-tight">Empty</span>
                    </div>
                </Show>
            </div>
        </div>
    );
};
