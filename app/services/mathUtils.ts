/**
 * Picks the top weaknesses from a frequency count object.
 * Pure function, easily testable.
 *
 * @param counts - Map of weakness labels to their frequency counts.
 * @param limit - Maximum number of items to return (default: 5).
 * @returns Sorted array of top weaknesses.
 */
export function pickTopWeaknesses(counts: Record<string, number>, limit: number = 5): { label: string; count: number }[] {
  return Object.entries(counts || {})
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([label, count]) => ({ label, count }));
}
