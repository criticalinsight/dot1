import { ProjectBrain } from './ProjectBrain';

export interface Env {
	PROJECT_BRAIN: DurableObjectNamespace;
}

export default {
	async fetch(request: Request, env: Env): Promise<Response> {
		const url = new URL(request.url);
		const id = env.PROJECT_BRAIN.idFromName('global');
		const stub = env.PROJECT_BRAIN.get(id);
		return stub.fetch(request);
	},
};

export { ProjectBrain };
