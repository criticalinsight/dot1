import type { Component } from 'solid-js';
import { Show, For } from 'solid-js';
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
            class="kanban-card group relative overflow-hidden"
            onClick={() => props.onClick?.(props.task)}
        >
            {/* Glossy Overlay for Hover */}
            <div class="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />

            {/* Header: ID + Model */}
            <div class="flex items-center justify-between mb-3">
                <span class="text-[9px] font-black tracking-widest text-slate-500 uppercase">
                    SIG-{props.task.id.slice(0, 6)}
                </span>
                <Show when={props.task.model}>
                    <span class="text-[9px] font-bold bg-white/5 text-indigo-300 px-2 py-0.5 rounded-full border border-white/10">
                        {props.task.model}
                    </span>
                </Show>
            </div>

            {/* Prompt Body */}
            <h4 class="text-sm font-bold text-slate-200 leading-relaxed mb-3 group-hover:text-white transition-colors">
                {truncate(props.task.prompt || props.task.title, 120)}
            </h4>

            {/* Taxonomy Tags */}
            <Show when={props.task.tags && props.task.tags.length > 0}>
                <div class="flex flex-wrap gap-1.5 mb-3">
                    <For each={props.task.tags}>{(tag) => (
                        <span class="text-[8px] font-black uppercase tracking-wider bg-indigo-500/10 text-indigo-400 px-1.5 py-0.5 rounded shadow-sm">
                            #{tag}
                        </span>
                    )}</For>
                </div>
            </Show>

            {/* Output Snippet (if deployed) */}
            <Show when={isGenerated && props.task.output}>
                <div class="mb-3 p-3 bg-black/20 rounded-lg border border-white/5 text-[11px] text-slate-400 font-mono leading-relaxed">
                    {truncate(props.task.output!, 80)}
                </div>
            </Show>

            {/* Footer: Metrics & Actions */}
            <div class="flex items-center justify-between mt-4 pt-4 border-t border-white/5">
                <div class="flex gap-4">
                    <Show when={tokens}>
                        <div class="flex flex-col">
                            <span class="text-[8px] font-black text-slate-600 uppercase tracking-tighter">Inbound</span>
                            <span class="text-[10px] tabular-nums font-bold text-slate-400">{tokens?.input || 0}</span>
                        </div>
                        <div class="flex flex-col">
                            <span class="text-[8px] font-black text-slate-600 uppercase tracking-tighter">Outbound</span>
                            <span class="text-[10px] tabular-nums font-bold text-slate-400">{tokens?.output || 0}</span>
                        </div>
                    </Show>
                </div>

                {/* Status Indicator or Run Button */}
                <div class="flex gap-2">
                    <Show when={props.task.status === 'draft'}>
                        <button
                            class="text-[10px] font-black bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-1.5 rounded-full shadow-lg shadow-indigo-500/20 active:scale-95 transition-all uppercase tracking-widest"
                            onClick={(e) => { e.stopPropagation(); props.onRun?.(props.task.id); }}
                        >
                            Execute
                        </button>
                    </Show>
                    <Show when={props.task.status === 'deployed'}>
                        <div class="size-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)] animate-pulse" />
                    </Show>
                </div>
            </div>
        </div>
    );
};
