import type { Component } from 'solid-js';
import { For } from 'solid-js';

interface ModelStatus {
    name: string;
    weight: number;
    status: 'active' | 'idle' | 'failed';
}

/**
 * AIBand visualizes the active AI model ensemble and their relative 
 * contributions to the current drafting process.
 */
export const AIBand: Component<{ models: ModelStatus[] }> = (props) => {
    return (
        <div class="flex items-center gap-4 p-4 bg-slate-900/50 backdrop-blur-md border border-slate-700/50 rounded-2xl">
            <div class="text-xs font-bold text-slate-400 uppercase tracking-widest">AI Ensemble</div>
            <div class="flex gap-2">
                <For each={props.models}>
                    {(model) => (
                        <div class={`px-3 py-1 rounded-full text-[10px] font-medium transition-all ${model.status === 'active'
                            ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                            : 'bg-slate-800 text-slate-500 border border-slate-700'
                            }`}>
                            {model.name} ({Math.round(model.weight * 100)}%)
                        </div>
                    )}
                </For>
            </div>
            <div class="ml-auto flex items-center gap-2">
                <div class="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                <span class="text-[10px] text-slate-400 font-mono">Consensus: High</span>
            </div>
        </div>
    );
};
