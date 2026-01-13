import type { AIRouterConfig } from '../../../shared/types';

/**
 * AI Router Configuration
 * Used for model selection and fallback management.
 */
const CONFIG: AIRouterConfig = {
    models: ['gemini-3-pro', 'gemini-2.5-flash', 'gemini-2.0-flash'],
    fallbacks: {
        'gemini-3-pro': 'gemini-2.5-flash',
        'gemini-2.5-flash': 'gemini-2.0-flash',
    }
};

/**
 * callEnsemble parallelizes requests to multiple Gemini models and 
 * reconciles the results into a consensus-based draft.
 * Time Complexity: O(M * E) where M is models and E is generation time.
 * 
 * @param prompt - The drafting prompt
 * @param apiKey - Gemini API Key
 */
export async function callEnsemble(prompt: string, apiKey: string): Promise<string> {
    const models = CONFIG.models.slice(0, 3); // Use top 3 models for ensemble

    console.log(`[Ensemble] Querying ${models.length} models in parallel...`);

    const results = await Promise.allSettled(
        models.map((model: string) =>
            fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
                method: 'POST',
                body: JSON.stringify({
                    contents: [{ parts: [{ text: `${prompt}\n\nStrict instruction: Provide ONLY the draft content.` }] }]
                })
            }).then(r => r.json())
        )
    );

    const successfulDrafts = results
        .filter((r): r is PromiseFulfilledResult<any> => r.status === 'fulfilled' && r.value.candidates)
        .map((r: any) => r.value.candidates[0].content.parts[0].text);

    if (successfulDrafts.length === 0) {
        throw new Error('Ensemble failed: No models returned a valid response');
    }

    // Simple reconciliation: Take the longest response (usually the most detailed)
    return successfulDrafts.reduce((a: string, b: string) => a.length > b.length ? a : b);
}
