/**
 * Picks the top weaknesses from a frequency count object.
 * Pure function, easily testable.
 *
 * @param counts - Map of weakness labels to their frequency counts.
 * @param limit - Maximum number of items to return (default: 5).
 * @returns Sorted array of top weaknesses.
 */
export function pickTopWeaknesses(counts: Record<string, number>, limit: number = 5): { label: string; count: number }[] {
  // Ensure limit is a positive integer, default to 0 if invalid
  const safeLimit = Math.max(0, isNaN(limit) ? 0 : Math.floor(limit));

  return Object.entries(counts || {})
    .sort((a, b) => b[1] - a[1])
    .slice(0, safeLimit)
    .map(([label, count]) => ({ label, count }));
}
