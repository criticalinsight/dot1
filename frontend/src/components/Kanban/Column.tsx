import type { Component } from 'solid-js';
import { For, Show } from 'solid-js';
import { KanbanCard } from './Card';
import type { CMSTask, ContentStatus } from '../../../../shared/types';

interface Props {
    status: ContentStatus;
    tasks: CMSTask[];
}

export const KanbanColumn: Component<Props> = (props) => {
    return (
        <div class="flex-shrink-0 w-80 flex flex-col gap-4">
            <div class="flex items-center justify-between px-2">
                <h3 class="text-sm font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                    {props.status.replace('-', ' ')}
                    <span class="bg-slate-800 text-slate-500 px-2 py-0.5 rounded-full text-[10px]">
                        {props.tasks.length}
                    </span>
                </h3>
            </div>

            <div class="flex-1 flex flex-col gap-3 min-h-[500px] p-2 bg-slate-950/20 rounded-2xl border border-dashed border-slate-900">
                <For each={props.tasks}>
                    {(task) => <KanbanCard task={task} />}
                </For>

                <Show when={props.tasks.length === 0}>
                    <div class="flex-1 flex flex-col items-center justify-center opacity-20 filter grayscale">
                        <div class="w-12 h-12 border-2 border-slate-700 rounded-full mb-2"></div>
                        <span class="text-[10px] font-bold uppercase tracking-tighter">Empty Stage</span>
                    </div>
                </Show>
            </div>
        </div>
    );
};
