import { ProjectBrain } from './ProjectBrain';

export interface Env {
	PROJECT_BRAIN: DurableObjectNamespace;
}

export default {
	async fetch(request: Request, env: Env): Promise<Response> {
		const url = new URL(request.url);
		const id = env.PROJECT_BRAIN.idFromName('global'); // Using a single ID for now, can be per-user/per-project
		const stub = env.PROJECT_BRAIN.get(id);
		return stub.fetch(request);
	},

	async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext) {
		console.log('Cron triggered:', event.cron);
		// Logic to iterate over projects and trigger AI research
		const id = env.PROJECT_BRAIN.idFromName('global');
		const stub = env.PROJECT_BRAIN.get(id);
		await stub.fetch(new Request('https://velocity.internal/trigger-autonomous-loop'));
	},
};

export { ProjectBrain };
