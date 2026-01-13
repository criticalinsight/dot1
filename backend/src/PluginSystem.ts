/**
 * PluginDriver interface defines the contract for all publishing plugins.
 */
export interface PluginDriver {
    id: string;
    name: string;
    publish(content: string, metadata: any): Promise<string>;
}

/**
 * PluginManager orchestrates multiple publishing drivers.
 */
export class PluginManager {
    private drivers: Map<string, PluginDriver> = new Map();

    registerDriver(driver: PluginDriver) {
        this.drivers.set(driver.id, driver);
    }

    async publishToAll(content: string, metadata: any): Promise<Record<string, string>> {
        const results: Record<string, string> = {};
        for (const [id, driver] of this.drivers) {
            try {
                results[id] = await driver.publish(content, metadata);
            } catch (error) {
                console.error(`[PluginManager] Driver ${id} failed:`, error);
                results[id] = 'failed';
            }
        }
        return results;
    }
}

/**
 * WordPressDriver implementation for publishing to WP sites.
 */
export class WordPressDriver implements PluginDriver {
    id = 'wordpress';
    name = 'WordPress';

    async publish(content: string, metadata: any): Promise<string> {
        console.log(`[WP Driver] Publishing to WordPress: ${metadata.title}`);
        // Real implementation would use the WP REST API
        return `https://demo-wp-site.com/${metadata.slug}`;
    }
}

/**
 * GhostDriver implementation for publishing to Ghost CMS.
 */
export class GhostDriver implements PluginDriver {
    id = 'ghost';
    name = 'Ghost';

    async publish(content: string, metadata: any): Promise<string> {
        console.log(`[Ghost Driver] Publishing to Ghost: ${metadata.title}`);
        // Real implementation would use the Ghost Admin API
        return `https://demo-ghost-site.com/posts/${metadata.slug}`;
    }
}
