import { CMSTask } from '../../shared/types';

/**
 * Syndicator - Adapts research content for social media channels.
 * 
 * Performance: O(n) where n is the length of the research paper.
 * Security: Uses environment-bound secrets for API authentication.
 */
export class Syndicator {
    constructor(private apiKey: string) { }

    /**
     * Synthesizes social media payloads from research output.
     */
    async synthesize(task: CMSTask): Promise<{ twitter: string[], linkedin: string }> {
        const prompt = `
      Transform the following research paper into social media content:
      
      RESEARCH:
      ${task.output}
      
      REQUIREMENTS:
      1. Twitter Thread: 5-7 individual posts. Each post must be under 280 characters.
      2. LinkedIn Post: A professional 3-paragraph summary with a call to action.
      3. OG Image: A descriptive prompt for an image engine to create an OpenGraph-compliant image for the specific slug.
      
      Format the response as a JSON object:
      {
        "twitter": ["post 1", "post 2", ...],
        "linkedin": "content here",
        "ogImage": "image description here"
      }
    `;

        try {
            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${this.apiKey}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: prompt }] }],
                    generationConfig: { response_mime_type: "application/json" }
                })
            });

            const data = await response.json() as any;
            const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
            return JSON.parse(text);
        } catch (e) {
            console.error('Syndication Synthesis Failed:', e);
            throw new Error('Failed to synthesize social content');
        }
    }

    /**
     * Dispatches payloads to external APIs.
     * (Dry-run by default for safety in this version)
     */
    async dispatch(taskId: string, payloads: any, dryRun = true): Promise<void> {
        if (dryRun) {
            console.log(`[Dry Run] Syndicating Task ${taskId}:`, payloads);
            return;
        }

        // Auth secrets would be pulled from Env in a production worker environment
        // For now, we simulate the dispatch logic
        console.log(`[Real Run] Dispatching Task ${taskId} to X and LinkedIn`);
    }
}
