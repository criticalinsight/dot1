import type { Component } from 'solid-js';
import { createSignal, Show, For, createMemo } from 'solid-js';
import type { CMSTask } from '../../../shared/types';
import { marked } from 'marked';

interface Props {
    task: CMSTask;
    isOpen: boolean;
    onClose: () => void;
    onSave: (task: CMSTask) => void;
    onRun: (task: CMSTask) => void;
}

export const PromptModal: Component<Props> = (props) => {
    // Local state initialized from task props
    // NOTE: In a real app we'd want to update these when props.task changes (using createEffect)

    // We'll use signals for the editable fields
    const [prompt, setPrompt] = createSignal(props.task.prompt || props.task.title);
    const [temperature, setTemperature] = createSignal(props.task.parameters?.temperature || 0.7);
    const [topP, setTopP] = createSignal(props.task.parameters?.topP || 0.95);

    // Parse Markdown Output
    const htmlOutput = createMemo(() => {
        const raw = props.task.output;
        if (!raw) return '<span class="text-slate-600 italic">No output generated yet. Run the prompt to see results.</span>';
        try {
            return marked.parse(raw);
        } catch (e) {
            return raw;
        }
    });

    const handleRun = () => {
        props.onRun({
            ...props.task,
            prompt: prompt(),
            parameters: { ...props.task.parameters, temperature: temperature(), topP: topP() }
        });
    };

    const handleSave = () => {
        props.onSave({
            ...props.task,
            prompt: prompt(),
            parameters: { ...props.task.parameters, temperature: temperature(), topP: topP() }
        });
        props.onClose();
    };

    const restoreVersion = (historyItem: any) => {
        setPrompt(historyItem.prompt);
        if (historyItem.parameters) {
            setTemperature(historyItem.parameters.temperature || 0.7);
            setTopP(historyItem.parameters.topP || 0.95);
        }
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
                            <div class="h-20 border-t border-slate-800 p-4 bg-slate-900/50 flex items-center gap-4">
                                <div class="flex flex-col gap-1">
                                    <label class="text-[10px] text-slate-500 uppercase font-bold">Temperature: {temperature()}</label>
                                    <input
                                        type="range" min="0" max="1" step="0.1"
                                        value={temperature()}
                                        onInput={(e) => setTemperature(parseFloat(e.currentTarget.value))}
                                        class="w-32 accent-blue-500"
                                    />
                                </div>
                                <div class="flex flex-col gap-1">
                                    <label class="text-[10px] text-slate-500 uppercase font-bold">Top P: {topP()}</label>
                                    <input
                                        type="range" min="0" max="1" step="0.05"
                                        value={topP()}
                                        onInput={(e) => setTopP(parseFloat(e.currentTarget.value))}
                                        class="w-32 accent-purple-500"
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
                                    class="bg-blue-600 hover:bg-blue-500 text-white px-4 py-1.5 rounded text-sm font-semibold transition-colors flex items-center gap-2 shadow-lg shadow-blue-900/20"
                                    onClick={handleRun}
                                >
                                    <span>▶</span> Run
                                </button>
                            </div>
                        </div>

                        {/* Right: Output Preview */}
                        <div class="w-1/2 flex flex-col bg-slate-950 relative">
                            <div class="flex-1 p-6 overflow-y-auto custom-scrollbar">
                                {/* Markdown Render */}
                                <div
                                    class="prose prose-invert prose-sm max-w-none font-sans"
                                    innerHTML={htmlOutput() as string}
                                />
                            </div>

                            {/* Version History Footer */}
                            <Show when={props.task.history && props.task.history.length > 0}>
                                <div class="h-14 border-t border-slate-800/50 flex items-center px-4 gap-3 overflow-x-auto bg-slate-900/30">
                                    <span class="text-[10px] text-slate-500 uppercase font-bold shrink-0">Version History</span>
                                    <div class="flex gap-2">
                                        <For each={props.task.history}>
                                            {(ver) => (
                                                <button
                                                    class="px-3 py-1.5 rounded bg-slate-900 border border-slate-800 text-xs text-slate-400 hover:bg-slate-800 hover:text-white hover:border-slate-700 transition-all flex flex-col items-start gap-0.5 min-w-[80px]"
                                                    onClick={() => restoreVersion(ver)}
                                                    title={`Restores v${ver.version}`}
                                                >
                                                    <span class="font-bold text-blue-400">v{ver.version}</span>
                                                    <span class="text-[9px] text-slate-600">{new Date(ver.timestamp).toLocaleTimeString()}</span>
                                                </button>
                                            )}
                                        </For>
                                    </div>
                                </div>
                            </Show>
                        </div>
                    </div>
                </div>
            </div>
        </Show>
    );
};
