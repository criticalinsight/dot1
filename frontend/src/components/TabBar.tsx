import type { Component } from 'solid-js';
import { For } from 'solid-js';

export interface Tab {
    id: string;
    title: string;
    type: 'terminal' | 'task';
}

interface TabBarProps {
    tabs: Tab[];
    activeTabId: string;
    onTabClick: (id: string) => void;
    onTabClose: (id: string) => void;
}

export const TabBar: Component<TabBarProps> = (props) => {
    return (
        <div class="tab-bar" style={{
            display: 'flex',
            background: '#1a1a1a',
            'border-bottom': '1px solid #333',
            'overflow-x': 'auto',
            height: '32px',
            'align-items': 'end'
        }}>
            <For each={props.tabs}>
                {(tab) => (
                    <div
                        class={`tab ${props.activeTabId === tab.id ? 'active' : ''}`}
                        onClick={() => props.onTabClick(tab.id)}
                        style={{
                            padding: '4px 12px',
                            cursor: 'pointer',
                            color: props.activeTabId === tab.id ? '#fff' : '#888',
                            background: props.activeTabId === tab.id ? '#0d0d0d' : 'transparent',
                            'border-top': props.activeTabId === tab.id ? '2px solid #00f0ff' : '2px solid transparent',
                            'border-right': '1px solid #222',
                            'font-size': '12px',
                            'white-space': 'nowrap',
                            'max-width': '200px',
                            'overflow': 'hidden',
                            'text-overflow': 'ellipsis',
                            height: '28px',
                            'line-height': '20px',
                            display: 'flex',
                            gap: '8px'
                        }}
                    >
                        <span>{tab.title}</span>
                        {tab.type === 'task' && (
                            <span
                                onClick={(e) => { e.stopPropagation(); props.onTabClose(tab.id); }}
                                style={{ color: '#555', 'font-weight': 'bold' }}
                            >
                                ×
                            </span>
                        )}
                    </div>
                )}
            </For>
        </div>
    );
};
