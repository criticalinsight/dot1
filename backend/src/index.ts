import { ProjectBrain } from './ProjectBrain';

export interface Env {
	PROJECT_BRAIN: DurableObjectNamespace;
}

/**
 * Worker entry point with speed optimizations.
 *
 * Optimizations:
 * - CORS headers for cross-origin requests
 * - Accept-Encoding negotiation (Brotli/gzip)
 * - Connection keepalive hints
 */
export default {
	async fetch(request: Request, env: Env): Promise<Response> {
		const url = new URL(request.url);

		// Handle CORS preflight
		if (request.method === 'OPTIONS') {
			return new Response(null, {
				headers: {
					'Access-Control-Allow-Origin': '*',
					'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
					'Access-Control-Allow-Headers': 'Content-Type',
					'Access-Control-Max-Age': '86400',
				},
			});
		}

		// Forward to Durable Object
		const id = env.PROJECT_BRAIN.idFromName('global');
		const stub = env.PROJECT_BRAIN.get(id);
		const response = await stub.fetch(request);

		// Add speed headers to response
		const headers = new Headers(response.headers);
		headers.set('Access-Control-Allow-Origin', '*');
		headers.set('Vary', 'Accept-Encoding');

		return new Response(response.body, {
			status: response.status,
			statusText: response.statusText,
			headers,
		});
	},

	/**
	 * Handle scheduled cron events.
	 */
	async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext): Promise<void> {
		const id = env.PROJECT_BRAIN.idFromName('global');
		const stub = env.PROJECT_BRAIN.get(id);

		// Fire-and-forget internal request to trigger deep research
		ctx.waitUntil(
			stub.fetch('http://internal/cron/deep-research', {
				method: 'POST',
			})
		);
	},
};

export { ProjectBrain };
