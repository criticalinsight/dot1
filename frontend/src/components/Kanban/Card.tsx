import type { Component } from 'solid-js';
import type { CMSTask } from '../../../../shared/types';

interface Props {
    task: CMSTask;
}

/**
 * KanbanCard renders a single task card.
 * Optimized for minimal DOM and fast paint.
 *
 * Time Complexity: O(1)
 * Space Complexity: O(1)
 *
 * @param props.task - The CMSTask to render
 */
export const KanbanCard: Component<Props> = (props) => {
    return (
        <div class="group bg-slate-900 border border-slate-800 rounded-lg p-3 hover:border-blue-500/40 transition-colors cursor-pointer">
            <span class="text-[9px] font-mono text-slate-600 block mb-1">
                {props.task.id.slice(0, 8)}
            </span>
            <h4 class="text-sm font-semibold text-slate-200 leading-snug group-hover:text-white">
                {props.task.title}
            </h4>
        </div>
    );
};
