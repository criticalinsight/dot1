export type ContentStatus = 'draft' | 'queued' | 'generating' | 'deployed';

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
    title: string; // Used as short label
    prompt: string; // The full prompt
    status: ContentStatus;

    // AI Metadata
    model?: string;
    output?: string;
    tokenUsage?: { input: number, output: number };
    parameters?: { temperature: number, topP: number };

    // Versioning
    history?: {
        version: number;
        prompt: string;
        output: string;
        timestamp: string;
    }[];

    // Legacy / Compat
    researchData?: string;
    contentDraft?: string;
    publishedUrl?: string;

    createdAt: string;
    updatedAt: string;
}
