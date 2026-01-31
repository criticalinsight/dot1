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
     * Starts a streaming deep research task.
     * @param prompt - The research query/instructions
     */
    async *streamResearch(prompt: string): AsyncGenerator<string> {
        const model = 'gemini-2.0-flash'; // Stable streaming model
        const url = `${this.baseUrl}/models/${model}:streamGenerateContent?key=${this.apiKey}&alt=sse`;

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

        const reader = response.body?.getReader();
        if (!reader) throw new Error('Failed to read response body');

        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });

            const lines = buffer.split('\n');
            buffer = lines.pop() || '';

            for (const line of lines) {
                if (line.startsWith('data: ')) {
                    try {
                        const json = JSON.parse(line.replace('data: ', '').trim());
                        const text = json.candidates?.[0]?.content?.parts?.[0]?.text;
                        if (text) yield text;
                    } catch (e) {
                        // Incomplete JSON or other SSE noise
                    }
                }
            }
        }
    }

    /**
     * Legacy non-streaming method (backwards compatibility).
     */
    async startResearch(prompt: string): Promise<string> {
        let fullText = '';
        for await (const chunk of this.streamResearch(prompt)) {
            fullText += chunk;
        }
        return fullText;
    }

    // Deprecated: No polling needed for standard API
    async pollOperation(opName: string): Promise<DeepResearchResult | null> {
        return { text: opName }; // Pass-through for compatibility if needed, but we'll update caller
    }
}
