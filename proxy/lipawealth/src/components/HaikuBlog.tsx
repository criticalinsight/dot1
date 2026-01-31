import { For, type Component, createResource, Show, createSignal, createEffect } from 'solid-js';
import { ArrowLeft, ChevronRight, Clock, ShieldCheck } from 'lucide-solid';
import gsap from 'gsap';

interface Insight {
    id: string;
    title: string;
    output: string;
    updatedAt: string;
    prompt?: string;
}

const fetchInsights = async () => {
    try {
        const response = await fetch('https://dot1-backend.iamkingori.workers.dev/public/insights');
        const data = await response.json();
        return data.insights as Insight[];
    } catch (error) {
        console.error('Failed to fetch insights:', error);
        return [];
    }
};

/**
 * A lightweight Markdown renderer for the structured Housel-style essays.
 */
const MarkdownRenderer: Component<{ content: string }> = (props) => {
    const parseLine = (line: string) => {
        // Headers
        if (line.startsWith('### ')) return <h3 class="text-xl font-black mt-8 mb-4 tracking-tight">{line.replace('### ', '')}</h3>;
        if (line.startsWith('## ')) return <h2 class="text-2xl font-black mt-12 mb-6 uppercase tracking-tighter">{line.replace('## ', '')}</h2>;
        if (line.startsWith('# ')) return <h1 class="text-4xl md:text-5xl font-black mt-16 mb-8 uppercase tracking-tighter leading-none">{line.replace('# ', '')}</h1>;

        // Horizontal Rule
        if (line.startsWith('---') || line.startsWith('***')) return <div class="h-px bg-slate-200 my-12" />;

        // List Items
        if (line.startsWith('* ') || line.startsWith('- ')) {
            return (
                <li class="ml-4 pl-4 border-l-2 border-emerald-500/30 text-slate-700 leading-relaxed mb-2">
                    {parseBold(line.substring(2))}
                </li>
            );
        }

        // Empty lines
        if (!line.trim()) return <div class="h-4" />;

        // Paragraphs
        return <p class="text-lg text-slate-600 leading-relaxed mb-4 font-medium">{parseBold(line)}</p>;
    };

    const parseBold = (text: string) => {
        const parts = text.split(/(\*\*.*?\*\*)/g);
        return parts.map(part => {
            if (part.startsWith('**') && part.endsWith('**')) {
                return <strong class="font-black text-slate-900">{part.slice(2, -2)}</strong>;
            }
            return part;
        });
    };

    return (
        <div class="prose prose-slate max-w-none">
            <For each={props.content.split('\n')}>
                {(line) => parseLine(line)}
            </For>
        </div>
    );
};

const HaikuBlog: Component = () => {
    const [insights] = createResource(fetchInsights);
    const [selectedInsight, setSelectedInsight] = createSignal<Insight | null>(null);
    let listContainerRef: HTMLDivElement | undefined;
    let detailContainerRef: HTMLDivElement | undefined;

    const activeView = () => selectedInsight() ? 'detail' : 'list';

    // Animation for transitions
    createEffect(() => {
        if (activeView() === 'detail' && detailContainerRef) {
            // Animate List Out (Tunnel Effect)
            if (listContainerRef) {
                gsap.to(listContainerRef, {
                    scale: 0.8,
                    opacity: 0,
                    filter: 'blur(10px)',
                    duration: 0.8,
                    ease: 'power4.inOut'
                });
            }

            // Animate Detail In
            gsap.fromTo(detailContainerRef.children,
                { y: 100, opacity: 0, scale: 1.1, filter: 'blur(20px)' },
                { y: 0, opacity: 1, scale: 1, filter: 'blur(0px)', duration: 1, stagger: 0.1, ease: 'power4.out', delay: 0.2 }
            );
            window.scrollTo({ top: 0, behavior: 'instant' });
        } else if (activeView() === 'list' && listContainerRef) {
            // Animate List Back In
            gsap.fromTo(listContainerRef,
                { scale: 1.2, opacity: 0, filter: 'blur(20px)' },
                { scale: 1, opacity: 1, filter: 'blur(0px)', duration: 0.8, ease: 'power3.out' }
            );
            gsap.fromTo(listContainerRef.children,
                { y: 20, opacity: 0 },
                { y: 0, opacity: 1, duration: 0.4, stagger: 0.05, ease: 'power2.out', delay: 0.3 }
            );
        }
    });

    return (
        <section class="min-h-screen bg-slate-50 relative overflow-hidden perspective-1000">
            <Show when={!insights.loading} fallback={<div class="p-20 text-center text-slate-400 font-mono text-xs animate-pulse">Establishing Secure Uplink...</div>}>

                {/* LIST VIEW */}
                <Show when={activeView() === 'list'}>
                    <div class="max-w-4xl mx-auto px-6 py-24 transition-opacity duration-500">
                        <div ref={listContainerRef} class="grid gap-1 transform-style-3d">
                            <For each={insights()}>
                                {(insight) => (
                                    <div
                                        onClick={() => setSelectedInsight(insight)}
                                        class="group cursor-pointer bg-white border border-slate-100 p-8 hover:border-emerald-500/30 hover:shadow-xl hover:shadow-emerald-500/5 transition-all duration-300 first:rounded-t-3xl last:rounded-b-3xl relative overflow-hidden"
                                    >
                                        <div class="absolute left-0 top-0 bottom-0 w-1 bg-emerald-500 opacity-0 group-hover:opacity-100 transition-opacity" />

                                        <div class="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
                                            <div class="flex-1">
                                                <div class="flex items-center gap-3 mb-3">
                                                    <span class="px-2 py-0.5 bg-slate-100 text-slate-500 rounded text-[10px] font-black uppercase tracking-widest">
                                                        Analysis
                                                    </span>
                                                    <span class="flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-slate-400 font-bold">
                                                        <Clock size={10} /> {new Date(insight.updatedAt).toLocaleDateString()}
                                                    </span>
                                                </div>
                                                <h3 class="text-2xl font-black text-slate-900 group-hover:text-emerald-700 transition-colors leading-tight mb-2">
                                                    {insight.title}
                                                </h3>
                                            </div>
                                            <div class="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-slate-300 group-hover:text-emerald-600 transition-all opacity-0 group-hover:opacity-100 -translate-x-4 group-hover:translate-x-0">
                                                Read Essay <ChevronRight size={14} />
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </For>
                        </div>
                    </div>
                </Show>

                {/* DETAIL VIEW */}
                <Show when={activeView() === 'detail' && selectedInsight()}>
                    <article class="bg-white min-h-screen">
                        {/* Sticky Header */}
                        <div class="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-slate-100 px-6 h-16 flex items-center justify-between">
                            <button
                                onClick={() => setSelectedInsight(null)}
                                class="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-slate-500 hover:text-emerald-600 transition-colors"
                            >
                                <ArrowLeft size={14} /> Back to Vault
                            </button>
                            <span class="text-[10px] font-black uppercase tracking-widest text-slate-300 hidden md:block">
                                Unclassified Intelligence // {selectedInsight()?.id}
                            </span>
                        </div>

                        <div ref={detailContainerRef} class="max-w-3xl mx-auto px-6 py-20">
                            {/* Header */}
                            <header class="mb-16 text-center">
                                <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-black uppercase tracking-widest mb-8">
                                    <ShieldCheck size={12} /> Verified Signal
                                </div>
                                <h1 class="text-4xl md:text-6xl font-black text-slate-900 leading-[0.95] tracking-tighter mb-8">
                                    {selectedInsight()?.title}
                                </h1>
                                <div class="flex items-center justify-center gap-6 text-xs font-bold uppercase tracking-widest text-slate-400">
                                    <span>{new Date(selectedInsight()!.updatedAt).toLocaleDateString()}</span>
                                    <span class="w-1 h-1 bg-slate-300 rounded-full" />
                                    <span>Morgan Housel Persona</span>
                                </div>
                            </header>

                            {/* Content */}
                            <div class="prose prose-lg prose-slate mx-auto">
                                <MarkdownRenderer content={selectedInsight()!.output} />
                            </div>

                            {/* Footer */}
                            <div class="mt-24 pt-12 border-t border-slate-100 text-center">
                                <button
                                    onClick={() => setSelectedInsight(null)}
                                    class="bg-slate-900 text-white px-8 py-4 rounded-full font-black uppercase tracking-widest hover:bg-emerald-600 transition-all text-xs"
                                >
                                    Return to Index
                                </button>
                            </div>
                        </div>
                    </article>
                </Show>

            </Show>
        </section>
    );
};

export default HaikuBlog;
