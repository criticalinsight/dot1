import { createSignal, createUniqueId, For, onMount, type Component } from 'solid-js';
import gsap from 'gsap';

export type ToastType = 'success' | 'error' | 'info';

interface Toast {
    id: string;
    message: string;
    type: ToastType;
}

const [toasts, setToasts] = createSignal<Toast[]>([]);

export function showToast(message: string, type: ToastType = 'success') {
    const id = createUniqueId();
    setToasts(prev => [...prev, { id, message, type }]);

    // Auto-remove after 5 seconds
    setTimeout(() => {
        removeToast(id);
    }, 5000);
}

function removeToast(id: string) {
    const el = document.getElementById(`toast-${id}`);
    if (el) {
        gsap.to(el, {
            x: 100,
            opacity: 0,
            duration: 0.4,
            ease: 'power2.in',
            onComplete: () => {
                setToasts(prev => prev.filter(t => t.id !== id));
            }
        });
    } else {
        setToasts(prev => prev.filter(t => t.id !== id));
    }
}

export const ToastContainer: Component = () => {
    return (
        <div class="fixed bottom-8 right-8 z-[10000] flex flex-col gap-3 items-end pointer-events-none">
            <For each={toasts()}>
                {(toast) => <ToastItem toast={toast} />}
            </For>
        </div>
    );
};

const ToastItem: Component<{ toast: Toast }> = (props) => {
    let ref: HTMLDivElement | undefined;

    onMount(() => {
        if (ref) {
            gsap.fromTo(ref,
                { x: 100, opacity: 0 },
                { x: 0, opacity: 1, duration: 0.6, ease: 'back.out(1.7)' }
            );
        }
    });

    const getBg = () => {
        switch (props.toast.type) {
            case 'success': return 'bg-emerald-500/80';
            case 'error': return 'bg-rose-500/80';
            default: return 'bg-slate-800/80';
        }
    };

    return (
        <div
            id={`toast-${props.toast.id}`}
            ref={ref}
            class={`glass ${getBg()} px-6 py-4 rounded-2xl flex items-center gap-4 text-white shadow-2xl pointer-events-auto border border-white/20`}
        >
            <div class={`w-2 h-2 rounded-full ${props.toast.type === 'success' ? 'bg-emerald-200 animate-pulse' : 'bg-white'}`} />
            <span class="text-sm font-bold tracking-tight">{props.toast.message}</span>
            <button
                onClick={() => removeToast(props.toast.id)}
                class="ml-4 opacity-50 hover:opacity-100 transition-opacity"
            >
                ✕
            </button>
        </div>
    );
};
