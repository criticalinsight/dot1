import { Show } from 'solid-js';
import type { Component } from 'solid-js';
import type { CMSTask } from '../../../../shared/types';

interface Props {
    task: CMSTask;
}

export const KanbanCard: Component<Props> = (props) => {
    return (
        <div class="group relative overflow-hidden bg-slate-900 border border-slate-800 rounded-xl p-4 hover:border-blue-500/50 transition-all shadow-sm hover:shadow-blue-500/5 cursor-grab active:cursor-grabbing">
            <div class="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-blue-600 to-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity"></div>

            <Show when={props.task.imageUrl}>
                <div class="mb-3 rounded-lg overflow-hidden h-32 bg-slate-800 relative group-hover:shadow-lg transition-shadow">
                    <img
                        src={props.task.imageUrl}
                        alt={props.task.imageAlt}
                        class="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity"
                    />
                    <div class="absolute inset-0 bg-gradient-to-t from-slate-950/60 to-transparent"></div>
                </div>
            </Show>

            <div class="flex flex-col gap-2">
                <span class="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{props.task.id.slice(0, 8)}</span>
                <h4 class="font-bold text-slate-200 leading-tight group-hover:text-white transition-colors">
                    {props.task.title}
                </h4>
                <div class="flex items-center gap-2 mt-2">
                    <div class="w-1.5 h-1.5 rounded-full bg-blue-500/50"></div>
                    <span class="text-[10px] font-semibold text-slate-400 capitalize">{props.task.status}</span>
                </div>
            </div>
        </div>
    );
};
