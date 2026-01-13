import { For, createSignal, onMount, onCleanup, createEffect } from 'solid-js';
import type { Component } from 'solid-js';

interface VirtualListProps {
    items: any[];
    rowHeight: number;
    height: string; // e.g. "100%"
    renderRow: (item: any, index: number) => any;
    className?: string;
    scrollToBottom?: boolean;
}

/**
 * Phase 7: Virtual Scrolling
 * Renders only visible items + buffer to maintain 60fps with large datasets.
 */
export const VirtualList: Component<VirtualListProps> = (props) => {
    let containerRef: HTMLDivElement | undefined;
    const [scrollTop, setScrollTop] = createSignal(0);
    const [containerHeight, setContainerHeight] = createSignal(0);

    const handleScroll = (e: Event) => {
        setScrollTop((e.target as HTMLDivElement).scrollTop);
    };

    // ResizeObserver to handle responsive container height
    onMount(() => {
        if (!containerRef) return;
        const observer = new ResizeObserver((entries) => {
            for (const entry of entries) {
                setContainerHeight(entry.contentRect.height);
            }
        });
        observer.observe(containerRef);
        onCleanup(() => observer.disconnect());
    });

    // Auto-scroll effect
    createEffect(() => {
        if (props.scrollToBottom && containerRef) {
            // Trigger dependency on items length
            props.items.length;
            // Defer to next frame
            requestAnimationFrame(() => {
                if (containerRef) containerRef.scrollTop = containerRef.scrollHeight;
            });
        }
    });

    return (
        <div
            ref={containerRef}
            class={props.className}
            style={{ height: props.height, overflow: 'auto', position: 'relative' }}
            onScroll={handleScroll}
        >
            <div style={{ height: `${props.items.length * props.rowHeight}px`, width: '100%', position: 'relative' }}>
                <For each={props.items}>
                    {(item, index) => {
                        // Viewport calculation
                        const itemTop = index() * props.rowHeight;
                        const start = scrollTop();
                        const end = start + containerHeight();
                        const buffer = props.rowHeight * 5; // Render 5 extra rows context

                        const isVisible = itemTop >= start - buffer && itemTop <= end + buffer;

                        return isVisible ? (
                            <div
                                style={{
                                    position: 'absolute',
                                    top: `${itemTop}px`,
                                    left: 0,
                                    right: 0,
                                    height: `${props.rowHeight}px`,
                                }}
                            >
                                {props.renderRow(item, index())}
                            </div>
                        ) : null;
                    }}
                </For>
            </div>
        </div>
    );
};
