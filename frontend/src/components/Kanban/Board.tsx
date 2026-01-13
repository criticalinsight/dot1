import type { Component } from 'solid-js';
import { For } from 'solid-js';
import { KanbanColumn } from './Column';
import type { CMSTask, ContentStatus } from '../../../../shared/types';

interface Props {
    tasks: CMSTask[];
}

const statuses: ContentStatus[] = ['backlog', 'researching', 'drafting', 'review', 'published'];

export const KanbanBoard: Component<Props> = (props) => {
    return (
        <div class="flex gap-6 min-h-full pb-8">
            <For each={statuses}>
                {(status) => (
                    <KanbanColumn
                        status={status}
                        tasks={props.tasks.filter(t => t.status === status)}
                    />
                )}
            </For>
        </div>
    );
};
