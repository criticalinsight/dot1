export type ContentStatus = 'backlog' | 'researching' | 'drafting' | 'review' | 'published';

export interface CMSProject {
    id: string;
    name: string;
    globalPrompt: string;
    knowledgeContext: string;
    scheduleInterval: string;
    lastRun?: string;
    nextRun?: string;
}

export interface CMSTask {
    id: string;
    projectId: string;
    title: string;
    status: ContentStatus;
    researchData?: string;
    contentDraft?: string;
    publishedUrl?: string;
    createdAt: string;
    updatedAt: string;
}
