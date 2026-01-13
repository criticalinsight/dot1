import { describe, test, expect } from 'bun:test';
import { generatePosition, getInitialPositions } from './lexical';

describe('Lexical Sorting', () => {
    test('generates position between two values', () => {
        const pos = generatePosition('a', 'c');
        expect(pos > 'a').toBe(true);
        expect(pos < 'c').toBe(true);
    });

    test('handles null previous (start of list)', () => {
        const pos = generatePosition(null, 'b');
        expect(pos < 'b').toBe(true);
    });

    test('handles null next (end of list)', () => {
        const pos = generatePosition('y', null);
        expect(pos > 'y').toBe(true);
    });

    test('handles tight spacing by appending', () => {
        const pos = generatePosition('a', 'b');
        expect(pos.startsWith('a')).toBe(true);
        expect(pos > 'a').toBe(true);
        expect(pos < 'b').toBe(true);
    });

    test('generates balanced initial positions', () => {
        const positions = getInitialPositions(3);
        expect(positions.length).toBe(3);
        expect(positions[0] < positions[1]).toBe(true);
        expect(positions[1] < positions[2]).toBe(true);
    });
});
