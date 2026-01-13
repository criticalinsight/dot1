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
        const url = `${this.baseUrl}/interactions?key=${this.apiKey}`;

        // Agent ID from research findings
        const agent = 'agents/deep-research-pro-preview-12-2025';

        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                agent,
                input: { text: prompt },
            }),
        });

        if (!response.ok) {
            throw new Error(`Failed to start research: ${response.status} ${await response.text()}`);
        }

        const data = (await response.json()) as { name: string };
        return data.name; // "operations/..."
    }

    /**
     * Polls interaction operation until complete.
     * Note: Deep research can take minutes. Cloudflare Workers have duration limits (CPU/Wall time).
     * We might hit limits if we block-wait. Ideally, we'd use a queue or scheduled retries.
     * For this "v1", we'll poll for a limited time (e.g. 30s) or until completion if fast.
     * If it times out, we rely on the next cron run to pick it up? 
     * Actually, user asked for "cronjob for a deep research prompt". 
     * Since this is a Durable Object, we can use `this.state.storage.setAlarm` or just wait longer if standard worker.
     * Standard workers have 30s limit (10ms CPU). DOs have nice lifespan.
     * Let's implement a simple poll with timeout.
     */
    async pollOperation(operationName: string, maxAttempts = 60, delayMs = 5000): Promise<DeepResearchResult | null> {
        const url = `${this.baseUrl}/${operationName}?key=${this.apiKey}`;

        for (let i = 0; i < maxAttempts; i++) {
            const response = await fetch(url);
            if (!response.ok) throw new Error(`Polling failed: ${response.status}`);

            const data = (await response.json()) as { done?: boolean; response?: { output?: { text: string } } };

            if (data.done) {
                if (data.response?.output?.text) {
                    return { text: data.response.output.text };
                }
                throw new Error('Research completed but no output returned');
            }

            await new Promise((resolve) => setTimeout(resolve, delayMs));
        }

        throw new Error('Research timed out');
    }
}
