export type ContentStatus = 'backlog' | 'researching' | 'drafting' | 'review' | 'published';

export interface StyleProfile {
    tone: string;
    targetAudience: string;
    vocabularyConstraints: string[];
    fewShotExamples: { input: string; output: string }[];
}

export interface CMSProject {
    id: string;
    name: string;
    globalPrompt: string;
    knowledgeContext: string;
    styleProfile?: StyleProfile;
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
    imageUrl?: string;
    imageAlt?: string;
    publishedUrl?: string;
    createdAt: string;
    updatedAt: string;
}

export interface AIRouterConfig {
    models: string[]; // Ordered preference
    fallbacks: Record<string, string>;
}
