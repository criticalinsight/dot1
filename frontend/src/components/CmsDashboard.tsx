import type { Component } from 'solid-js';
import { For, Show } from 'solid-js';
import { ExternalLink, Globe, Hash, Clock, Eye, Trash2, Zap } from 'lucide-solid';
import type { CMSTask } from '../../../shared/types';

interface CmsDashboardProps {
    tasks: CMSTask[];
    onTaskClick: (task: CMSTask) => void;
}

/**
 * Editorial Content Dashboard for managing blog content.
 * Provides a specialized view for "Deployed" and "Draft" content ready for publication.
 */
export const CmsDashboard: Component<CmsDashboardProps> = (props) => {

    // Status color mapping
    const getStatusColor = (status: string) => {
        switch (status) {
            case 'deployed': return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
            case 'generating': return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
            case 'queued': return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
            default: return 'bg-slate-800 text-slate-400 border-slate-700';
        }
    };

    return (
        <div class="h-full flex flex-col bg-slate-950/30 rounded-2xl border border-slate-800 overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Toolbar */}
            <div class="p-4 border-b border-slate-800 bg-slate-900/50 flex items-center justify-between">
                <div class="flex items-center gap-4">
                    <h2 class="text-sm font-bold text-white flex items-center gap-2">
                        <Globe size={16} class="text-emerald-400" />
                        Content Portfolio
                    </h2>
                    <div class="h-4 w-[1px] bg-slate-800"></div>
                    <span class="text-[10px] text-slate-500 uppercase font-black tracking-widest tabular-nums">
                        {props.tasks.filter(t => t.status === 'deployed').length} Published Articles
                    </span>
                </div>
                <div class="flex items-center gap-2">
                    <button class="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-black uppercase tracking-widest rounded border border-slate-700 transition-all">
                        Bulk Export
                    </button>
                </div>
            </div>

            {/* Content Table */}
            <div class="flex-1 overflow-auto">
                <table class="w-full text-left border-collapse min-w-[800px]">
                    <thead class="sticky top-0 bg-slate-900 text-[10px] font-black uppercase tracking-widest text-slate-500 z-10 border-b border-slate-800">
                        <tr>
                            <th class="px-6 py-4">Article Title</th>
                            <th class="px-6 py-4">Permanent Link / Slug</th>
                            <th class="px-6 py-4 text-center">Lifecycle Status</th>
                            <th class="px-6 py-4">Last Modified</th>
                            <th class="px-6 py-4 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-slate-800/50 bg-slate-950/20">
                        <For each={props.tasks.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))}>
                            {(task) => (
                                <tr class="group hover:bg-blue-600/5 transition-all">
                                    <td class="px-6 py-4">
                                        <button
                                            onClick={() => props.onTaskClick(task)}
                                            class="text-sm font-bold text-slate-200 group-hover:text-blue-400 transition-colors text-left"
                                        >
                                            {task.title}
                                        </button>
                                        <div class="flex items-center gap-2 mt-1">
                                            <For each={task.tags?.slice(0, 3)}>
                                                {(tag) => (
                                                    <span class="text-[9px] text-slate-600 font-bold uppercase tracking-wider">#{tag}</span>
                                                )}
                                            </For>
                                        </div>
                                    </td>
                                    <td class="px-6 py-4">
                                        <div class="flex items-center gap-2 text-xs font-mono text-slate-500 group-hover:text-slate-400 transition-colors">
                                            <Hash size={12} class="text-slate-700" />
                                            <span>{task.slug || task.id.substring(0, 8)}</span>
                                            <Show when={task.status === 'deployed'}>
                                                <a
                                                    href={`https://lipawealth.pages.dev/vault/${task.slug}`}
                                                    target="_blank"
                                                    class="p-1 hover:bg-slate-800 rounded text-emerald-500"
                                                >
                                                    <ExternalLink size={12} />
                                                </a>
                                            </Show>
                                        </div>
                                    </td>
                                    <td class="px-6 py-4">
                                        <div class="flex justify-center">
                                            <span class={`px-2 py-0.5 rounded border text-[9px] font-black uppercase tracking-widest ${getStatusColor(task.status)}`}>
                                                {task.status}
                                            </span>
                                        </div>
                                    </td>
                                    <td class="px-6 py-4">
                                        <div class="flex items-center gap-2 text-[10px] text-slate-500 tabular-nums">
                                            <Clock size={12} class="text-slate-700" />
                                            {new Date(task.updatedAt).toLocaleDateString()}
                                        </div>
                                    </td>
                                    <td class="px-6 py-4 text-right">
                                        <div class="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button
                                                onClick={() => {
                                                    const url = (import.meta as any).env?.VITE_BACKEND_URL || 'https://dot1-backend.iamkingori.workers.dev';
                                                    fetch(`${url}/syndicate/${task.id}`, { method: 'POST' })
                                                        .then(res => res.json())
                                                        .then(data => console.log('Syndicated:', data))
                                                        .catch(err => console.error('Syndication Failed:', err));
                                                }}
                                                class={`p-2 rounded transition-colors ${task.syndicatedAt ? 'text-blue-400 bg-blue-500/10' : 'text-slate-400 hover:bg-slate-800'}`}
                                                title="Syndicate (The Speaker)"
                                            >
                                                <Zap size={16} class={task.syndicatedAt ? 'animate-pulse' : ''} />
                                            </button>
                                            <button
                                                onClick={() => props.onTaskClick(task)}
                                                class="p-2 hover:bg-blue-500/10 text-blue-400 rounded transition-colors"
                                                title="Edit Metadata"
                                            >
                                                <Eye size={16} />
                                            </button>
                                            <button
                                                class="p-2 hover:bg-rose-500/10 text-rose-400 rounded transition-colors"
                                                title="Unpublish"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </For>
                    </tbody>
                </table>
            </div>

            {/* Status Bar */}
            <div class="px-6 py-3 border-t border-slate-800 bg-slate-900/50 flex items-center justify-between">
                <div class="text-[9px] font-black uppercase tracking-[0.2em] text-slate-600">
                    Mercury CMS Engine v1.0
                </div>
                <div class="flex items-center gap-4">
                    <div class="flex items-center gap-1.5">
                        <div class="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
                        <span class="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Global Webhook Active</span>
                    </div>
                </div>
            </div>
        </div>
    );
};
