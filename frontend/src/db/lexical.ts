/**
 * Lexical Sorting (Fractional Indexing) utility.
 * Allows for O(1) reordering by calculating a position between two others.
 * Inspired by LexoRank and Trello's positioning logic.
 */

const BASE = 'abcdefghijklmnopqrstuvwxyz';

/**
 * Generates a string that is lexically between 'prev' and 'next'.
 */
export function generatePosition(prev: string | null, next: string | null): string {
    if (!prev && !next) return BASE[Math.floor(BASE.length / 2)];
    if (!prev) return String.fromCharCode(next!.charCodeAt(0) - 1);
    if (!next) return String.fromCharCode(prev!.charCodeAt(0) + 1);

    let p = prev;
    let n = next;
    let i = 0;

    while (p[i] === n[i]) i++;

    const charP = p.charCodeAt(i) || 0;
    const charN = n.charCodeAt(i) || 256;

    if (charN - charP > 1) {
        return p.substring(0, i) + String.fromCharCode(Math.floor((charP + charN) / 2));
    } else {
        // Append to handle tight spacing
        return p + BASE[Math.floor(BASE.length / 2)];
    }
}

/**
 * Initial positions for a set of items.
 */
export function getInitialPositions(count: number): string[] {
    const step = Math.floor(BASE.length / (count + 1));
    return Array.from({ length: count }, (_, i) => BASE[step * (i + 1)]);
}
