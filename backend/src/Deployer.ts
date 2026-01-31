/**
 * Deployer - Artifact Transport Engine.
 * Adapted for Cloudflare Workers (using API instead of local Git).
 */
export class Deployer {
    /**
     * Deploys content to a target.
     * @param config - Deployment configuration (token, repo, method)
     * @param content - Map of [path]: text
     */
    static async deploy(config: any, files: Record<string, string>): Promise<{ status: string; message: string }> {
        const method = config.deploy_method || 'github';

        try {
            if (method === 'github') {
                return await this.deployToGitHub(config, files);
            } else if (method === 'hook') {
                return await this.triggerHook(config, files);
            }
            return { status: 'error', message: `Unsupported method: ${method}` };
        } catch (e: any) {
            return { status: 'error', message: e.message };
        }
    }

    /**
     * Deploys files to GitHub using the REST API.
     * This avoids needing local Git binaries in the Worker.
     */
    private static async deployToGitHub(config: any, files: Record<string, string>): Promise<{ status: string; message: string }> {
        const { github_token, github_repo, github_branch = 'gh-pages' } = config;

        if (!github_token || !github_repo) {
            throw new Error('Missing GitHub configuration (token or repo)');
        }

        const baseUrl = `https://api.github.com/repos/${github_repo}`;
        const headers = {
            'Authorization': `token ${github_token}`,
            'Accept': 'application/vnd.github.v3+json',
            'User-Agent': 'Gemini-Ops-Deployer'
        };

        // 1. Get the current commit SHA of the branch
        const branchRes = await fetch(`${baseUrl}/branches/${github_branch}`, { headers });
        if (!branchRes.ok) throw new Error(`GitHub Branch Error: ${await branchRes.text()}`);
        const branchData = await branchRes.json() as any;
        const lastCommitSha = branchData.commit.sha;
        const baseTreeSha = branchData.commit.commit.tree.sha;

        // 2. Create blobs for each file
        const treeItems = [];
        for (const [path, content] of Object.entries(files)) {
            const blobRes = await fetch(`${baseUrl}/git/blobs`, {
                method: 'POST',
                headers,
                body: JSON.stringify({ content, encoding: 'utf-8' })
            });
            const blobData = await blobRes.json() as any;
            treeItems.push({
                path,
                mode: '100644',
                type: 'blob',
                sha: blobData.sha
            });
        }

        // 3. Create a new tree
        const treeRes = await fetch(`${baseUrl}/git/trees`, {
            method: 'POST',
            headers,
            body: JSON.stringify({ base_tree: baseTreeSha, tree: treeItems })
        });
        const treeData = await treeRes.json() as any;

        // 4. Create a commit
        const commitRes = await fetch(`${baseUrl}/git/commits`, {
            method: 'POST',
            headers,
            body: JSON.stringify({
                message: `Deploy research artifacts - ${new Date().toISOString()}`,
                tree: treeData.sha,
                parents: [lastCommitSha]
            })
        });
        const commitData = await commitRes.json() as any;

        // 5. Update the reference
        const refRes = await fetch(`${baseUrl}/git/refs/heads/${github_branch}`, {
            method: 'PATCH',
            headers,
            body: JSON.stringify({ sha: commitData.sha, force: true })
        });

        if (!refRes.ok) throw new Error(`GitHub Ref Update Error: ${await refRes.text()}`);

        return { status: 'ok', message: `Deployed to ${github_repo} on branch ${github_branch}` };
    }

    private static async triggerHook(config: any, files: Record<string, string>): Promise<{ status: string; message: string }> {
        const url = config.post_build_hook;
        if (!url) throw new Error('Missing post_build_hook URL');

        const res = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ files, timestamp: new Date().toISOString() })
        });

        if (!res.ok) throw new Error(`Hook Error: ${await res.text()}`);
        return { status: 'ok', message: 'Hook triggered successfully' };
    }
}
