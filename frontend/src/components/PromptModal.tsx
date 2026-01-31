import type { Component } from 'solid-js';
import { createSignal, Show, For, createMemo } from 'solid-js';
import type { CMSTask } from '../../../shared/types';
import { marked } from 'marked';
import { diffWords } from '../utils/diff';
import type { EvalCriteria, PromptTemplate } from '../../../shared/types';
import { TemplateLibrary } from './TemplateLibrary';
import { Book } from 'lucide-solid';

interface CMSTaskHistoryItem {
    version: number;
    prompt: string;
    output: string;
    timestamp: string;
    parameters?: { temperature: number, topP: number };
}

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

    // Comparison State
    const [isCompareMode, setIsCompareMode] = createSignal(false);
    const [selectedA, setSelectedA] = createSignal<number | null>(null);
    const [selectedB, setSelectedB] = createSignal<number | null>(null);

    // Evaluation State
    const [evalCriteria, setEvalCriteria] = createSignal<EvalCriteria[]>(props.task.evalCriteria || []);
    const [activeTab, setActiveTab] = createSignal<'output' | 'eval' | 'history'>('output');

    // Template Picker
    const [isTemplateLibOpen, setIsTemplateLibOpen] = createSignal(false);

    const isGenerating = createMemo(() => props.task.status === 'generating');

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
            parameters: { ...props.task.parameters, temperature: temperature(), topP: topP() },
            evalCriteria: evalCriteria()
        });
        props.onClose();
    };

    const addCriteria = () => {
        const newCrit: EvalCriteria = {
            id: crypto.randomUUID(),
            description: 'New Criteria',
            type: 'contains',
            expected: ''
        };
        setEvalCriteria([...evalCriteria(), newCrit]);
    };

    const runEvals = () => {
        const results = evalCriteria().map(crit => {
            const output = props.task.output || '';
            let passed = false;
            let reason = '';

            if (crit.type === 'contains') {
                passed = output.includes(crit.expected);
                reason = passed ? `Found "${crit.expected}"` : `Could not find "${crit.expected}"`;
            } else if (crit.type === 'not_contains') {
                passed = !output.includes(crit.expected);
                reason = passed ? `Did not find "${crit.expected}"` : `Found forbidden "${crit.expected}"`;
            } else if (crit.type === 'regex') {
                try {
                    const re = new RegExp(crit.expected);
                    passed = re.test(output);
                    reason = passed ? `Regex match success` : `Regex match failed`;
                } catch (e) {
                    reason = `Invalid Regex`;
                }
            }

            return { id: crit.id, passed, reason };
        });

        props.onSave({
            ...props.task,
            evalResults: results
        });
    };

    const restoreVersion = (historyItem: CMSTaskHistoryItem) => {
        if (isCompareMode()) {
            if (selectedA() === historyItem.version) setSelectedA(null);
            else if (selectedB() === historyItem.version) setSelectedB(null);
            else if (selectedA() === null) setSelectedA(historyItem.version);
            else if (selectedB() === null) setSelectedB(historyItem.version);
            else {
                // Shift or replace
                setSelectedA(selectedB());
                setSelectedB(historyItem.version);
            }
            return;
        }
        setPrompt(historyItem.prompt);
        if (historyItem.parameters) {
            setTemperature(historyItem.parameters.temperature || 0.7);
            setTopP(historyItem.parameters.topP || 0.95);
        }
    };

    // Comparison Logic
    const diffData = createMemo(() => {
        if (!isCompareMode() || selectedA() === null || selectedB() === null) return null;

        const verA = props.task.history?.find((h: CMSTaskHistoryItem) => h.version === selectedA());
        const verB = props.task.history?.find((h: CMSTaskHistoryItem) => h.version === selectedB());

        if (!verA || !verB) return null;

        return diffWords(verA.output, verB.output);
    });

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
                                <div class="flex items-center justify-between">
                                    <label class="text-xs font-bold text-slate-400 uppercase">System / User Prompt</label>
                                    <button
                                        onClick={() => setIsTemplateLibOpen(true)}
                                        class="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-blue-400 transition-all"
                                    >
                                        <Book size={10} /> Browse Templates
                                    </button>
                                </div>
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

                        {/* Right: Output Preview & Evals */}
                        <div class="w-1/2 flex flex-col bg-slate-950 relative">
                            {/* Tabs */}
                            <div class="h-10 border-b border-slate-800 flex bg-slate-900/50">
                                <button
                                    onClick={() => setActiveTab('output')}
                                    class={`px-4 text-[10px] font-black uppercase tracking-widest border-b-2 transition-all ${activeTab() === 'output' ? 'border-blue-500 text-white' : 'border-transparent text-slate-500 hover:text-slate-300'}`}
                                >
                                    Output
                                </button>
                                <button
                                    onClick={() => setActiveTab('eval')}
                                    class={`px-4 text-[10px] font-black uppercase tracking-widest border-b-2 transition-all ${activeTab() === 'eval' ? 'border-purple-500 text-white' : 'border-transparent text-slate-500 hover:text-slate-300'}`}
                                >
                                    Eval {props.task.evalCriteria?.length ? `(${props.task.evalCriteria.length})` : ''}
                                </button>
                            </div>

                            <div class="flex-1 p-6 overflow-y-auto custom-scrollbar">
                                <Show when={activeTab() === 'output'}>
                                    <Show when={!isCompareMode() || selectedA() === null || selectedB() === null}
                                        fallback={
                                            <div class="flex flex-col gap-6">
                                                <div class="grid grid-cols-2 gap-4 pb-4 border-b border-slate-800">
                                                    <div class="text-[10px] font-black uppercase tracking-widest text-indigo-400">Version {selectedA()}</div>
                                                    <div class="text-[10px] font-black uppercase tracking-widest text-indigo-400">Version {selectedB()}</div>
                                                </div>
                                                <div class="grid grid-cols-2 gap-4">
                                                    <div class="text-xs text-slate-400 font-mono leading-relaxed bg-black/20 p-4 rounded border border-white/5 opacity-80">
                                                        {props.task.history?.find((h: CMSTaskHistoryItem) => h.version === selectedA())?.output}
                                                    </div>
                                                    <div class="text-xs text-slate-200 font-mono leading-relaxed bg-black/20 p-4 rounded border border-indigo-500/10 shadow-inner">
                                                        <For each={diffData()}>
                                                            {(part) => (
                                                                <span
                                                                    classList={{
                                                                        'bg-emerald-500/20 text-emerald-300 px-0.5 rounded': part.type === 'added',
                                                                        'bg-rose-500/20 text-rose-300 line-through px-0.5 rounded': part.type === 'removed',
                                                                        'text-slate-200': part.type === 'same'
                                                                    }}
                                                                >
                                                                    {part.value}
                                                                </span>
                                                            )}
                                                        </For>
                                                    </div>
                                                </div>
                                            </div>
                                        }>
                                        {/* Markdown Render */}
                                        <div
                                            class={`prose prose-invert prose-sm max-w-none font-sans transition-opacity duration-300 ${isGenerating() ? 'opacity-80' : 'opacity-100'}`}
                                            innerHTML={htmlOutput() as string}
                                        />
                                        <Show when={isGenerating()}>
                                            <div class="mt-4 flex items-center gap-2 text-blue-400 animate-pulse">
                                                <div class="w-1.5 h-1.5 rounded-full bg-blue-500"></div>
                                                <span class="text-[10px] font-black uppercase tracking-widest">Generating Insight...</span>
                                            </div>
                                        </Show>
                                    </Show>
                                </Show>

                                <Show when={activeTab() === 'eval'}>
                                    <div class="flex flex-col gap-4">
                                        <div class="flex items-center justify-between">
                                            <h3 class="text-xs font-black uppercase tracking-widest text-slate-400">Evaluation Criteria</h3>
                                            <div class="flex gap-2">
                                                <button
                                                    onClick={runEvals}
                                                    class="text-[10px] font-black uppercase tracking-widest px-3 py-1 bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 rounded hover:bg-emerald-600/30 transition-all"
                                                >
                                                    Run All
                                                </button>
                                                <button
                                                    onClick={addCriteria}
                                                    class="text-[10px] font-black uppercase tracking-widest px-3 py-1 bg-slate-800 text-slate-300 rounded hover:text-white transition-all"
                                                >
                                                    + Add
                                                </button>
                                            </div>
                                        </div>

                                        <div class="space-y-3">
                                            <For each={evalCriteria()}>
                                                {(crit, index) => (
                                                    <div class="p-3 bg-slate-900 border border-slate-800 rounded-lg group animate-in fade-in slide-in-from-top-2">
                                                        <div class="flex items-start gap-4">
                                                            <div class="flex-1 space-y-2">
                                                                <input
                                                                    class="w-full bg-transparent border-none p-0 text-sm font-bold text-slate-200 focus:ring-0 placeholder-slate-600"
                                                                    value={crit.description}
                                                                    onInput={(e) => {
                                                                        const next = [...evalCriteria()];
                                                                        next[index()] = { ...crit, description: e.currentTarget.value };
                                                                        setEvalCriteria(next);
                                                                    }}
                                                                />
                                                                <div class="flex items-center gap-2">
                                                                    <select
                                                                        class="bg-slate-950 border border-slate-700 rounded text-[10px] px-2 py-1 text-slate-400 focus:outline-none"
                                                                        value={crit.type}
                                                                        onChange={(e) => {
                                                                            const next = [...evalCriteria()];
                                                                            next[index()] = { ...crit, type: e.currentTarget.value as any };
                                                                            setEvalCriteria(next);
                                                                        }}
                                                                    >
                                                                        <option value="contains">CONTAINS</option>
                                                                        <option value="not_contains">NOT CONTAINS</option>
                                                                        <option value="regex">REGEX</option>
                                                                    </select>
                                                                    <input
                                                                        class="flex-1 bg-slate-950 border border-slate-700 rounded text-xs px-2 py-1 text-slate-300 font-mono placeholder-slate-700 focus:border-blue-500/50"
                                                                        value={crit.expected}
                                                                        placeholder="Expected value/pattern..."
                                                                        onInput={(e) => {
                                                                            const next = [...evalCriteria()];
                                                                            next[index()] = { ...crit, expected: e.currentTarget.value };
                                                                            setEvalCriteria(next);
                                                                        }}
                                                                    />
                                                                </div>
                                                            </div>
                                                            <Show when={props.task.evalResults?.find(r => r.id === crit.id)}>
                                                                <div class={`px-2 py-1 rounded text-[10px] font-black tracking-tighter self-center
                                                                    ${props.task.evalResults?.find(r => r.id === crit.id)?.passed ? 'bg-emerald-900/30 text-emerald-400' : 'bg-rose-900/30 text-rose-400'}`}>
                                                                    {props.task.evalResults?.find(r => r.id === crit.id)?.passed ? 'PASSED' : 'FAILED'}
                                                                </div>
                                                            </Show>
                                                            <button
                                                                onClick={() => {
                                                                    setEvalCriteria(evalCriteria().filter(c => c.id !== crit.id));
                                                                }}
                                                                class="opacity-0 group-hover:opacity-100 text-slate-600 hover:text-rose-500 transition-all p-1"
                                                            >
                                                                ✕
                                                            </button>
                                                        </div>
                                                    </div>
                                                )}
                                            </For>
                                        </div>
                                    </div>
                                </Show>
                            </div>

                            {/* Version History Footer */}
                            <Show when={props.task.history && props.task.history.length > 0}>
                                <div class="h-16 border-t border-slate-800/50 flex items-center px-4 gap-4 overflow-x-auto bg-slate-900/30">
                                    <div class="flex flex-col gap-1 shrink-0">
                                        <span class="text-[10px] text-slate-500 uppercase font-black tracking-widest">History</span>
                                        <button
                                            onClick={() => {
                                                setIsCompareMode(!isCompareMode());
                                                if (!isCompareMode()) { setSelectedA(null); setSelectedB(null); }
                                            }}
                                            class={`text-[9px] font-black uppercase tracking-tighter px-2 py-0.5 rounded transition-all ${isCompareMode() ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'}`}
                                        >
                                            {isCompareMode() ? 'Exit Compare' : 'Compare Mode'}
                                        </button>
                                    </div>
                                    <div class="flex gap-2">
                                        <For each={props.task.history}>
                                            {(ver) => (
                                                <button
                                                    class={`px-3 py-2 rounded-xl border transition-all flex flex-col items-start gap-0.5 min-w-[90px] animate-spring ${(isCompareMode() && (selectedA() === ver.version || selectedB() === ver.version))
                                                        ? 'bg-indigo-600/20 border-indigo-500/50 shadow-[0_0_15px_rgba(99,102,241,0.2)]'
                                                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:bg-slate-800 hover:text-white hover:shadow-lg'
                                                        }`}
                                                    onClick={() => restoreVersion(ver)}
                                                >
                                                    <span class={`font-black text-[10px] ${isCompareMode() && (selectedA() === ver.version || selectedB() === ver.version) ? 'text-indigo-300' : 'text-slate-500'}`}>
                                                        {selectedA() === ver.version ? 'SIDE A' : selectedB() === ver.version ? 'SIDE B' : `v${ver.version}`}
                                                    </span>
                                                    <span class="text-[9px] text-slate-600 font-mono italic">
                                                        {new Date(ver.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                    </span>
                                                </button>
                                            )}
                                        </For>
                                    </div>
                                </div>
                            </Show>
                        </div>
                    </div>
                </div>

                <TemplateLibrary
                    isOpen={isTemplateLibOpen()}
                    onClose={() => setIsTemplateLibOpen(false)}
                    onSelect={(t: PromptTemplate) => {
                        setPrompt(t.content);
                        setIsTemplateLibOpen(false);
                    }}
                />
            </div>
        </Show>
    );
};
