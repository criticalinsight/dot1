import type { Component } from 'solid-js';
import { createSignal, Show, For } from 'solid-js';
import type { CMSTask } from '../../../shared/types';

interface Props {
    task: CMSTask;
    isOpen: boolean;
    onClose: () => void;
    onSave: (task: CMSTask) => void;
    onRun: (task: CMSTask) => void;
}

export const PromptModal: Component<Props> = (props) => {
    // Local state initialized from task props
    // Note: For full reactivity when props.task changes while open, 
    // we might need createEffect, but usually modal mounts/unmounts or keys change.

    // We'll use signals for the editable fields
    const [prompt, setPrompt] = createSignal(props.task.prompt || props.task.title);
    const [temperature, setTemperature] = createSignal(props.task.parameters?.temperature || 0.7);

    // Simple "Markdown" renderer shim (for now just formatting)
    const formatOutput = (text?: string) => {
        if (!text) return <span class="text-slate-600 italic">No output generated yet. Run the prompt to see results.</span>;
        return <div class="prose prose-invert prose-sm max-w-none whitespace-pre-wrap font-mono text-xs">{text}</div>;
    };

    const handleRun = () => {
        props.onRun({
            ...props.task,
            prompt: prompt(),
            parameters: { ...props.task.parameters, temperature: temperature(), topP: 0.95 }
        });
    };

    const handleSave = () => {
        props.onSave({
            ...props.task,
            prompt: prompt(),
            parameters: { ...props.task.parameters, temperature: temperature(), topP: 0.95 }
        });
        props.onClose();
    };

    return (
        <Show when={props.isOpen}>
            <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm" onClick={props.onClose}>
                <div
                    class="bg-slate-900 w-[90vw] h-[85vh] rounded-xl border border-slate-800 shadow-2xl flex flex-col overflow-hidden"
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Header */}
                    <header class="h-12 border-b border-slate-800 flex items-center justify-between px-4 bg-slate-900">
                        <div class="flex items-center gap-3">
                            <span class="text-slate-500 font-mono text-xs">ID: {props.task.id.slice(0, 8)}</span>
                            <span class={`px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider 
                        ${props.task.status === 'deployed' ? 'bg-green-900/30 text-green-400' : 'bg-slate-800 text-slate-500'}`}>
                                {props.task.status}
                            </span>
                        </div>
                        <button onClick={props.onClose} class="text-slate-500 hover:text-white">✕</button>
                    </header>

                    {/* Split View */}
                    <div class="flex-1 flex overflow-hidden">
                        {/* Left: Input & Config */}
                        <div class="w-1/2 flex flex-col border-r border-slate-800">
                            <div class="flex-1 p-4 flex flex-col gap-2">
                                <label class="text-xs font-bold text-slate-400 uppercase">System / User Prompt</label>
                                <textarea
                                    class="flex-1 bg-slate-950/50 border border-slate-800 rounded p-3 text-sm font-mono text-slate-300 focus:border-blue-500/50 focus:outline-none resize-none mx-0"
                                    value={prompt()}
                                    onInput={(e) => setPrompt(e.currentTarget.value)}
                                    placeholder="Enter your prompt here..."
                                />
                            </div>
                            {/* Parameters Toolbar */}
                            <div class="h-16 border-t border-slate-800 p-4 bg-slate-900/50 flex items-center gap-4">
                                <div class="flex items-center gap-2">
                                    <label class="text-xs text-slate-500">Temp: {temperature()}</label>
                                    <input
                                        type="range" min="0" max="1" step="0.1"
                                        value={temperature()}
                                        onInput={(e) => setTemperature(parseFloat(e.currentTarget.value))}
                                        class="w-24 accent-blue-500"
                                    />
                                </div>
                                <div class="flex-1"></div>
                                <button
                                    class="px-3 py-1.5 rounded text-sm text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                                    onClick={handleSave}
                                >
                                    Save Draft
                                </button>
                                <button
                                    class="bg-blue-600 hover:bg-blue-500 text-white px-4 py-1.5 rounded text-sm font-semibold transition-colors flex items-center gap-2"
                                    onClick={handleRun}
                                >
                                    <span>▶</span> Run
                                </button>
                            </div>
                        </div>

                        {/* Right: Output Preview */}
                        <div class="w-1/2 flex flex-col bg-slate-950 relative">
                            <div class="flex-1 p-6 overflow-y-auto custom-scrollbar">
                                {formatOutput(props.task.output)}
                            </div>

                            {/* Version History Footer (Placeholder) */}
                            <Show when={props.task.history && props.task.history.length > 0}>
                                <div class="h-12 border-t border-slate-800/50 flex items-center px-4 gap-2 overflow-x-auto">
                                    <span class="text-[10px] text-slate-600 uppercase font-bold mr-2">History</span>
                                    <For each={props.task.history}>
                                        {(ver) => (
                                            <button class="px-2 py-1 rounded bg-slate-900 border border-slate-800 text-[10px] text-slate-400 hover:bg-slate-800">
                                                v{ver.version}
                                            </button>
                                        )}
                                    </For>
                                </div>
                            </Show>
                        </div>
                    </div>
                </div>
            </div>
        </Show>
    );
};
