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

		// FIX: For WebSockets, return the DO response immediately.
		// Wrapping it in new Response() throws RangeError for status 101.
		if (request.headers.get('Upgrade') === 'websocket') {
			return stub.fetch(request);
		}

		const response = await stub.fetch(request);

		// Add speed headers to response
		const headers = new Headers(response.headers);
		headers.set('Access-Control-Allow-Origin', '*');
		headers.set('Vary', 'Accept-Encoding');
		// Phase 8: Required for SharedArrayBuffer / High-Res Timers
		headers.set('Cross-Origin-Opener-Policy', 'same-origin');
		headers.set('Cross-Origin-Embedder-Policy', 'require-corp');

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

		// Fire-and-forget internal request to trigger daily cron (recurring tasks + research)
		ctx.waitUntil(
			stub.fetch('http://internal/cron/daily', {
				method: 'POST',
			})
		);
	},
};

export { ProjectBrain };
