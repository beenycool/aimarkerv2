export function isoToday() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

export function daysUntil(dateISO) {
  // Use local midnight to avoid “off by 1” from timezones.
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const [y, m, d] = dateISO.split('-').map(Number);
  const target = new Date(y, (m || 1) - 1, d || 1);
  const diffMs = target.getTime() - today.getTime();
  return Math.ceil(diffMs / 86400000);
}

export function formatShort(dateISO) {
  try {
    // Handle both date-only strings (YYYY-MM-DD) and full datetime strings
    const datePart = dateISO.split('T')[0];
    const date = new Date(datePart + 'T00:00:00');
    if (isNaN(date.getTime())) return dateISO;
    return date.toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
  } catch {
    return dateISO;
  }
}

export function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

export function pct(numerator, denominator) {
  const den = denominator || 0;
  if (!den) return 0;
  return Math.round((numerator / den) * 100);
}

export function bandFromPercent(percent) {
  // Not exam-board grade boundaries; just a calm progress band for motivation.
  if (percent >= 90) return '9';
  if (percent >= 80) return '8';
  if (percent >= 70) return '7';
  if (percent >= 60) return '6';
  if (percent >= 50) return '5';
  if (percent >= 40) return '4';
  if (percent >= 30) return '3';
  if (percent >= 20) return '2';
  return '1';
}
