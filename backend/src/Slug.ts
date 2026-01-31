/**
 * Slug - Taxonomy and Path Management Engine.
 * Ported/Inspired by PubliiEx.Slug from Elixir CMS.
 */
export class Slug {
    /**
     * Converts a string into a URL-friendly slug.
     * @param text - The raw title or name
     * @returns A lower-cased, hyphenated string
     */
    static slugify(text: string): string {
        return text
            .toString()
            .toLowerCase()
            .trim()
            .replace(/\s+/g, '-')           // Replace spaces with -
            .replace(/[^\w-]+/g, '')       // Remove all non-word chars
            .replace(/--+/g, '-')           // Replace multiple - with single -
            .replace(/^-+/, '')             // Trim - from start
            .replace(/-+$/, '');            // Trim - from end
    }

    /**
     * Generates a unique path for a task artifact.
     * @param title - The task title
     * @param id - The task ID (for uniqueness fallback)
     * @returns A unique slug path
     */
    static generatePath(title: string, id: string): string {
        const base = this.slugify(title);
        if (!base) return id.slice(0, 8);
        return base;
    }

    /**
     * Normalizes tags into a cleaned list.
     * @param tagsInput - Raw tags string or array
     * @returns A list of unique, slugified tags
     */
    static normalizeTags(tagsInput: string | string[]): string[] {
        const raw = Array.isArray(tagsInput) ? tagsInput : (tagsInput ? tagsInput.split(',') : []);
        return [...new Set(raw.map(t => this.slugify(t)).filter(t => t.length > 0))];
    }
}
