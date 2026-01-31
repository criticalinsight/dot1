export type ContentStatus = 'draft' | 'queued' | 'generating' | 'deployed';

export interface EvalCriteria {
    id: string;
    description: string;
    type: 'contains' | 'not_contains' | 'regex' | 'llm';
    expected: string;
    score?: number;
}

export interface PromptTemplate {
    id: string;
    name: string;
    content: string;
    category?: string;
    updatedAt: string;
}

export interface CMSProject {
    id: string;
    name: string;
    globalPrompt: string;
    knowledgeContext: string;
    scheduleInterval: string;
    lastRun?: string;
    nextRun?: string;
    updatedAt?: string;
}

export interface CMSTask {
    id: string;
    projectId: string;
    title: string; // Used as short label
    prompt: string; // The full prompt
    status: ContentStatus;
    slug?: string;
    tags?: string[];

    // AI Metadata
    model?: string;
    output?: string;
    tokenUsage?: { input: number, output: number };
    parameters?: { temperature: number, topP: number };
    evalCriteria?: EvalCriteria[];
    evalResults?: { id: string, passed: boolean, reason?: string }[];

    // Versioning
    history?: {
        version: number;
        prompt: string;
        output: string;
        timestamp: string;
        parameters?: { temperature: number, topP: number };
    }[];

    // Legacy / Compat
    researchData?: string;
    contentDraft?: string;
    publishedUrl?: string;

    createdAt: string;
    updatedAt: string;
    syndicatedAt?: string;
    socialPayloads?: {
        twitter?: string[];
        linkedin?: string;
        ogImage?: string;
    };
}
