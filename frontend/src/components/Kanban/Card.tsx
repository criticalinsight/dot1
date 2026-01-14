import type { Component } from 'solid-js';
import { Show } from 'solid-js';
import type { CMSTask } from '../../../../shared/types';

interface Props {
    task: CMSTask;
    onRun?: (id: string) => void;
    onClick?: (task: CMSTask) => void;
}

export const KanbanCard: Component<Props> = (props) => {
    // Helper to truncate text
    const truncate = (str: string, len: number) => str.length > len ? str.slice(0, len) + '...' : str;

    // Parse metadata if they are strings (from initial DB fetch they might be strings before store parses them? 
    // Store.ts parses them, so they should be objects if typed correctly. 
    // But safely handling them is good practice if types are loose).
    const tokens = props.task.tokenUsage;
    const isGenerated = props.task.status === 'deployed';

    return (
        <div
            class="group bg-slate-900 border border-slate-800 rounded-lg p-3 hover:border-blue-500/40 transition-colors cursor-pointer relative"
            onClick={() => props.onClick?.(props.task)}
        >
            {/* Header: ID + Model */}
            <div class="flex items-center justify-between mb-2">
                <span class="text-[9px] font-mono text-slate-600 block">
                    {props.task.id.slice(0, 8)}
                </span>
                <Show when={props.task.model}>
                    <span class="text-[9px] bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded border border-slate-700">
                        {props.task.model}
                    </span>
                </Show>
            </div>

            {/* Prompt Body */}
            <h4 class="text-xs font-medium text-slate-300 leading-snug mb-2 font-mono">
                {truncate(props.task.prompt || props.task.title, 80)}
            </h4>

            {/* Output Snippet (if deployed) */}
            <Show when={isGenerated && props.task.output}>
                <div class="mb-2 p-2 bg-slate-950/50 rounded border border-slate-800/50 text-[10px] text-slate-500 font-mono italic">
                    {truncate(props.task.output!, 50)}
                </div>
            </Show>

            {/* Footer: Metrics & Actions */}
            <div class="flex items-center justify-between mt-2 pt-2 border-t border-slate-800/50">
                <div class="flex gap-2">
                    <Show when={tokens}>
                        <span class="text-[9px] text-slate-500" title="Input Tokens">
                            In: {tokens?.input || 0}
                        </span>
                        <span class="text-[9px] text-slate-500" title="Output Tokens">
                            Out: {tokens?.output || 0}
                        </span>
                    </Show>
                </div>

                {/* Status Indicator or Run Button */}
                <div class="flex gap-2">
                    <Show when={props.task.status === 'draft'}>
                        <button
                            class="text-[10px] bg-blue-600 hover:bg-blue-500 text-white px-2 py-0.5 rounded"
                            onClick={(e) => { e.stopPropagation(); props.onRun?.(props.task.id); }}
                        >
                            Run
                        </button>
                    </Show>
                </div>
            </div>
        </div>
    );
};
