import type { Component } from 'solid-js';
import { createSignal, onMount, For, Show } from 'solid-js';
import { getTemplates, upsertTemplate } from '../db/store';
import type { PromptTemplate } from '../../../shared/types';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    onSelect?: (template: PromptTemplate) => void;
}

export const TemplateLibrary: Component<Props> = (props) => {
    const [templates, setTemplates] = createSignal<PromptTemplate[]>([]);
    const [searchQuery, setSearchQuery] = createSignal('');
    const [isEditing, setIsEditing] = createSignal<PromptTemplate | null>(null);

    const loadTemplates = async () => {
        const data = await getTemplates();
        setTemplates(data);
    };

    onMount(() => {
        loadTemplates();
    });

    const filteredTemplates = () => {
        const query = searchQuery().toLowerCase();
        return templates().filter(t =>
            t.name.toLowerCase().includes(query) ||
            t.category?.toLowerCase().includes(query) ||
            t.content.toLowerCase().includes(query)
        );
    };

    const handleSave = async (e: Event) => {
        e.preventDefault();
        const editing = isEditing();
        if (!editing) return;

        await upsertTemplate({
            ...editing,
            updatedAt: new Date().toISOString()
        });
        setIsEditing(null);
        loadTemplates();
    };

    const handleCreate = () => {
        setIsEditing({
            id: crypto.randomUUID(),
            name: '',
            content: '',
            category: 'General',
            updatedAt: new Date().toISOString()
        });
    };

    return (
        <Show when={props.isOpen}>
            <div class="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-md" onClick={props.onClose}>
                <div
                    class="bg-slate-900 w-[700px] h-[600px] rounded-2xl border border-slate-800 shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200"
                    onClick={(e) => e.stopPropagation()}
                >
                    <header class="h-14 border-b border-slate-800 flex items-center justify-between px-6 bg-slate-900/50">
                        <h2 class="text-sm font-black uppercase tracking-widest text-white">Template Library</h2>
                        <button onClick={props.onClose} class="text-slate-500 hover:text-white transition-colors">✕</button>
                    </header>

                    <div class="flex-1 flex overflow-hidden">
                        {/* List */}
                        <div class="w-1/3 border-r border-slate-800 flex flex-col bg-slate-950/30">
                            <div class="p-4 border-b border-slate-800">
                                <input
                                    type="text"
                                    placeholder="Search..."
                                    class="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-blue-500/50"
                                    value={searchQuery()}
                                    onInput={(e) => setSearchQuery(e.currentTarget.value)}
                                />
                            </div>
                            <div class="flex-1 overflow-y-auto p-2 space-y-1">
                                <For each={filteredTemplates()}>
                                    {(t) => (
                                        <button
                                            class={`w-full text-left p-3 rounded-xl transition-all border ${isEditing()?.id === t.id ? 'bg-blue-600/10 border-blue-500/30' : 'border-transparent hover:bg-slate-800/50'}`}
                                            onClick={() => setIsEditing(t)}
                                        >
                                            <div class="text-xs font-bold text-slate-200">{t.name}</div>
                                            <div class="text-[10px] text-slate-500 uppercase font-black tracking-tighter mt-1">{t.category}</div>
                                        </button>
                                    )}
                                </For>
                            </div>
                            <div class="p-4 border-t border-slate-800">
                                <button
                                    onClick={handleCreate}
                                    class="w-full py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold transition-all"
                                >
                                    + New Template
                                </button>
                            </div>
                        </div>

                        {/* Editor / Info */}
                        <div class="flex-1 bg-slate-950/50 p-6">
                            <Show when={isEditing()} fallback={
                                <div class="h-full flex flex-col items-center justify-center text-slate-600 space-y-4">
                                    <div class="text-4xl">📚</div>
                                    <div class="text-xs font-black uppercase tracking-widest">Select or create a template</div>
                                </div>
                            }>
                                <form onSubmit={handleSave} class="h-full flex flex-col gap-4">
                                    <div class="space-y-1">
                                        <label class="text-[10px] font-black uppercase tracking-widest text-slate-500">Name</label>
                                        <input
                                            class="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-blue-500/50"
                                            value={isEditing()!.name}
                                            onInput={(e) => setIsEditing({ ...isEditing()!, name: e.currentTarget.value })}
                                            required
                                        />
                                    </div>
                                    <div class="space-y-1">
                                        <label class="text-[10px] font-black uppercase tracking-widest text-slate-500">Category</label>
                                        <input
                                            class="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-blue-500/50"
                                            value={isEditing()!.category || ''}
                                            onInput={(e) => setIsEditing({ ...isEditing()!, category: e.currentTarget.value })}
                                        />
                                    </div>
                                    <div class="flex-1 flex flex-col space-y-1">
                                        <label class="text-[10px] font-black uppercase tracking-widest text-slate-500">Content</label>
                                        <textarea
                                            class="flex-1 bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-sm font-mono text-slate-300 focus:outline-none focus:border-blue-500/50 resize-none"
                                            value={isEditing()!.content}
                                            onInput={(e) => setIsEditing({ ...isEditing()!, content: e.currentTarget.value })}
                                            required
                                        />
                                    </div>
                                    <div class="flex gap-3">
                                        <Show when={props.onSelect}>
                                            <button
                                                type="button"
                                                onClick={() => props.onSelect!(isEditing()!)}
                                                class="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all shadow-lg shadow-emerald-900/20"
                                            >
                                                Use Template
                                            </button>
                                        </Show>
                                        <button
                                            type="submit"
                                            class="flex-1 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition-all shadow-lg shadow-blue-900/20"
                                        >
                                            Save Changes
                                        </button>
                                    </div>
                                </form>
                            </Show>
                        </div>
                    </div>
                </div>
            </div>
        </Show>
    );
};
