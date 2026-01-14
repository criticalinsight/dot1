export interface DeepResearchResult {
    text: string;
    citations?: string[];
}

/**
 * Client for Gemini Deep Research Agent (Interactions API).
 */
export class DeepResearchClient {
    private baseUrl = 'https://generativelanguage.googleapis.com/v1beta';

    constructor(private apiKey: string) { }

    /**
     * Starts a deep research task.
     * @param prompt - The research query/instructions
     * @returns Operation name to poll
     */
    async startResearch(prompt: string): Promise<string> {
        const model = 'gemini-3-pro-preview';
        const url = `${this.baseUrl}/models/${model}:generateContent?key=${this.apiKey}`;

        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{
                    parts: [{ text: prompt }]
                }],
                tools: [{
                    google_search: {}
                }]
            }),
        });

        if (!response.ok) {
            throw new Error(`Gemini API Error: ${response.status} ${await response.text()}`);
        }

        const data = await response.json() as any;

        // Extract text from candidates
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!text) {
            throw new Error('No content returned from Gemini');
        }

        return text;
    }

    // Deprecated: No polling needed for standard API
    async pollOperation(opName: string): Promise<DeepResearchResult | null> {
        return { text: opName }; // Pass-through for compatibility if needed, but we'll update caller
    }
}
