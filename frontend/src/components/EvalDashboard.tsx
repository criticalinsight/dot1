import type { Component } from 'solid-js';
import { createMemo, For, Show } from 'solid-js';
import { X, CheckCircle2, AlertCircle, BarChart3, Zap, Database } from 'lucide-solid';
import type { CMSTask } from '../../../shared/types';

interface EvalDashboardProps {
    tasks: CMSTask[];
    isOpen: boolean;
    onClose: () => void;
}

/**
 * Visual Evaluation Dashboard for Gemini Ops.
 * Aggregates pass/fail metrics and token usage across tasks.
 */
export const EvalDashboard: Component<EvalDashboardProps> = (props) => {

    // Aggregate Metrics
    const stats = createMemo(() => {
        let totalEvaluations = 0;
        let totalPassed = 0;
        let totalInputTokens = 0;
        let totalOutputTokens = 0;

        props.tasks.forEach(task => {
            if (task.evalResults) {
                totalEvaluations += task.evalResults.length;
                totalPassed += task.evalResults.filter(r => r.passed).length;
            }
            if (task.tokenUsage) {
                totalInputTokens += task.tokenUsage.input;
                totalOutputTokens += task.tokenUsage.output;
            }
        });

        const passRate = totalEvaluations > 0 ? (totalPassed / totalEvaluations) * 100 : 0;

        return {
            totalEvaluations,
            totalPassed,
            passRate: passRate.toFixed(1),
            totalInputTokens: totalInputTokens.toLocaleString(),
            totalOutputTokens: totalOutputTokens.toLocaleString(),
            totalTokens: (totalInputTokens + totalOutputTokens).toLocaleString(),
            tasksCount: props.tasks.length
        };
    });

    return (
        <Show when={props.isOpen}>
            <div class="fixed inset-0 z-50 flex items-center justify-center p-6 bg-slate-950/80 backdrop-blur-xl animate-in fade-in duration-300">
                <div class="relative w-full max-w-4xl max-h-[80vh] bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden">

                    {/* Header */}
                    <div class="p-6 border-b border-slate-800 flex items-center justify-between">
                        <div class="flex items-center gap-3">
                            <div class="p-2 bg-blue-500/10 rounded-lg text-blue-400">
                                <BarChart3 size={20} />
                            </div>
                            <div>
                                <h2 class="text-xl font-bold text-white tracking-tight">Performance Analytics</h2>
                                <p class="text-xs text-slate-500 font-medium uppercase tracking-widest mt-0.5">Project Intelligence Overview</p>
                            </div>
                        </div>
                        <button
                            onClick={props.onClose}
                            class="p-2 hover:bg-slate-800 rounded-full transition-colors text-slate-400 hover:text-white"
                        >
                            <X size={20} />
                        </button>
                    </div>

                    {/* Content */}
                    <div class="flex-1 overflow-y-auto p-8 space-y-8">

                        {/* Summary Grid */}
                        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div class="bg-slate-950/50 p-6 rounded-xl border border-slate-800 flex flex-col gap-1">
                                <span class="text-[10px] font-black uppercase tracking-widest text-slate-500">Evaluation Pass Rate</span>
                                <div class="flex items-end gap-2 mt-1">
                                    <span class="text-4xl font-bold text-white tabular-nums">{stats().passRate}%</span>
                                    <CheckCircle2 class="text-emerald-500 mb-1" size={20} />
                                </div>
                                <p class="text-[10px] text-slate-600 mt-2">
                                    {stats().totalPassed} / {stats().totalEvaluations} checks passed
                                </p>
                            </div>

                            <div class="bg-slate-950/50 p-6 rounded-xl border border-slate-800 flex flex-col gap-1">
                                <span class="text-[10px] font-black uppercase tracking-widest text-slate-500">Total Tokens Consumed</span>
                                <div class="flex items-end gap-2 mt-1">
                                    <span class="text-4xl font-bold text-white tabular-nums">{stats().totalTokens}</span>
                                    <Zap class="text-amber-500 mb-1" size={20} />
                                </div>
                                <p class="text-[10px] text-slate-600 mt-2">
                                    In: {stats().totalInputTokens} | Out: {stats().totalOutputTokens}
                                </p>
                            </div>

                            <div class="bg-slate-950/50 p-6 rounded-xl border border-slate-800 flex flex-col gap-1">
                                <span class="text-[10px] font-black uppercase tracking-widest text-slate-500">Task Population</span>
                                <div class="flex items-end gap-2 mt-1">
                                    <span class="text-4xl font-bold text-white tabular-nums">{stats().tasksCount}</span>
                                    <Database class="text-slate-500 mb-1" size={20} />
                                </div>
                                <p class="text-[10px] text-slate-600 mt-2">
                                    Active items in project repository
                                </p>
                            </div>
                        </div>

                        {/* Recent Failures / Anomalies */}
                        <div class="space-y-4">
                            <h3 class="text-sm font-bold text-white flex items-center gap-2">
                                <AlertCircle size={16} class="text-rose-400" />
                                Critical Failures
                            </h3>
                            <div class="bg-slate-950/30 rounded-xl border border-slate-800 overflow-hidden">
                                <table class="w-full text-left text-xs">
                                    <thead>
                                        <tr class="bg-slate-900/50 border-b border-slate-800">
                                            <th class="px-4 py-3 font-bold uppercase tracking-wider text-slate-500">Task Title</th>
                                            <th class="px-4 py-3 font-bold uppercase tracking-wider text-slate-500">Failed Checks</th>
                                            <th class="px-4 py-3 font-bold uppercase tracking-wider text-slate-500">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody class="divide-y divide-slate-800/50">
                                        <For each={props.tasks.filter(t => t.evalResults?.some(r => !r.passed))}>
                                            {(task) => (
                                                <tr class="hover:bg-slate-800/30 transition-colors">
                                                    <td class="px-4 py-3 text-white font-medium">{task.title}</td>
                                                    <td class="px-4 py-3 text-rose-400 font-semibold tabular-nums">
                                                        {task.evalResults?.filter(r => !r.passed).length} checks
                                                    </td>
                                                    <td class="px-4 py-3 text-slate-400 uppercase font-black text-[9px] tracking-widest">
                                                        {task.status}
                                                    </td>
                                                </tr>
                                            )}
                                        </For>
                                        <Show when={props.tasks.filter(t => t.evalResults?.some(r => !r.passed)).length === 0}>
                                            <tr>
                                                <td colspan="3" class="px-4 py-8 text-center text-slate-600 font-medium italic">
                                                    No failed evaluations found. Project harmony is at maximum.
                                                </td>
                                            </tr>
                                        </Show>
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>

                    {/* Footer */}
                    <div class="p-6 border-t border-slate-800 bg-slate-950/20 text-center">
                        <p class="text-[10px] text-slate-600 font-bold uppercase tracking-[0.2em]">
                            End of Intelligence Report • {new Date().toLocaleDateString()}
                        </p>
                    </div>
                </div>
            </div>
        </Show>
    );
};
