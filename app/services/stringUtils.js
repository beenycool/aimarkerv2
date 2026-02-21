/**
 * String normalization and utility functions
 */

export const normalizeText = (text) => (text ?? '').toString().toLowerCase().replace(/\s+/g, ' ').trim();

export const normalizeQuestionId = (value) => (value ?? '').toString().toLowerCase().replace(/[^a-z0-9]/g, '');

export const stringifyAnswer = (answer) => {
    if (answer == null) return '';
    if (typeof answer === 'string' || typeof answer === 'number') return String(answer);
    if (Array.isArray(answer)) {
        if (answer.length && Array.isArray(answer[0])) return answer.map(row => Array.isArray(row) ? row.join(' | ') : String(row)).join('\n');
        return answer.join('\n');
    }
    if (typeof answer === 'object' && answer.points) {
        return `Graph submission: points ${JSON.stringify(answer.points)} lines ${JSON.stringify(answer.lines || [])} labels ${JSON.stringify(answer.labels || [])} paths ${JSON.stringify(answer.paths || [])}`;
    }
    return JSON.stringify(answer);
};
