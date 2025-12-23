// Built-in GCSE key dates – used for countdown cards.
// Source of truth: JCQ common timetable key dates.

export const GCSE_KEY_DATES = {
  2025: [
    { id: 'first_exam', label: 'First GCSE exam', date: '2025-05-09' },
    { id: 'final_exam', label: 'Final GCSE exam', date: '2025-06-18' },
    { id: 'contingency', label: 'Contingency day', date: '2025-06-25' },
    { id: 'results', label: 'Results day', date: '2025-08-21' },
  ],
  2026: [
    { id: 'first_exam', label: 'First GCSE exam', date: '2026-05-07' },
    { id: 'final_exam', label: 'Final GCSE exam', date: '2026-06-17' },
    { id: 'contingency', label: 'Contingency day', date: '2026-06-24' },
    { id: 'results', label: 'Results day', date: '2026-08-20' },
  ],
  2027: [
    { id: 'first_exam', label: 'First GCSE exam', date: '2027-05-06' },
    { id: 'final_exam', label: 'Final GCSE exam', date: '2027-06-16' },
    { id: 'contingency', label: 'Contingency day', date: '2027-06-23' },
    { id: 'results', label: 'Results day', date: '2027-08-19' },
  ],
};

/**
 * Get GCSE key dates for a specific exam year
 */
export function getGcseDatesForYear(year) {
  return GCSE_KEY_DATES[year] || GCSE_KEY_DATES[2026];
}

// Legacy export for backwards compatibility
export const GCSE_KEY_DATES_2026 = GCSE_KEY_DATES[2026];
