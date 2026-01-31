export type DiffType = 'added' | 'removed' | 'same';

export interface DiffPart {
    type: DiffType;
    value: string;
}

/**
 * Simple word-level diffing utility.
 * 
 * Time Complexity: O(n*m) where n, m are number of words
 * Space Complexity: O(n*m) for the matrix
 */
export function diffWords(oldStr: string, newStr: string): DiffPart[] {
    const oldWords = oldStr.split(/(\s+)/);
    const newWords = newStr.split(/(\s+)/);

    // Using a basic LCS (Longest Common Subsequence) approach
    const matrix: number[][] = Array(oldWords.length + 1)
        .fill(0)
        .map(() => Array(newWords.length + 1).fill(0));

    for (let i = 1; i <= oldWords.length; i++) {
        for (let j = 1; j <= newWords.length; j++) {
            if (oldWords[i - 1] === newWords[j - 1]) {
                matrix[i][j] = matrix[i - 1][j - 1] + 1;
            } else {
                matrix[i][j] = Math.max(matrix[i - 1][j], matrix[i][j - 1]);
            }
        }
    }

    const result: DiffPart[] = [];
    let i = oldWords.length;
    let j = newWords.length;

    while (i > 0 || j > 0) {
        if (i > 0 && j > 0 && oldWords[i - 1] === newWords[j - 1]) {
            result.unshift({ type: 'same', value: oldWords[i - 1] });
            i--;
            j--;
        } else if (j > 0 && (i === 0 || matrix[i][j - 1] >= matrix[i - 1][j])) {
            result.unshift({ type: 'added', value: newWords[j - 1] });
            j--;
        } else if (i > 0 && (j === 0 || matrix[i][j - 1] < matrix[i - 1][j])) {
            result.unshift({ type: 'removed', value: oldWords[i - 1] });
            i--;
        }
    }

    return result;
}
