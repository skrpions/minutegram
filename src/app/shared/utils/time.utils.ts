/** Adds `minutes` to a "HH:mm" string; handles overnight (wraps at 24h). */
export function addMinutesToTime(timeStr: string, minutes: number): string {
  if (!timeStr) return '';
  const [h, m] = timeStr.split(':').map(Number);
  if (isNaN(h) || isNaN(m)) return '';
  const total = h * 60 + m + minutes;
  const newH = Math.floor(total / 60) % 24;
  const newM = total % 60;
  return `${newH.toString().padStart(2, '0')}:${newM.toString().padStart(2, '0')}`;
}

/**
 * Parses a human-readable duration string into minutes.
 * Examples: "10m" → 10 · "1h" → 60 · "1h 20m" → 80 · "90" → 90
 */
export function parseDurationString(str: string): number {
  if (!str || !str.trim()) return 0;
  const hourMatch = str.match(/(\d+)\s*h/i);
  const minMatch  = str.match(/(\d+)\s*m/i);
  if (!hourMatch && !minMatch) {
    const num = parseInt(str, 10);
    return isNaN(num) ? 0 : num;
  }
  const hours = hourMatch ? parseInt(hourMatch[1], 10) : 0;
  const mins  = minMatch  ? parseInt(minMatch[1],  10) : 0;
  return hours * 60 + mins;
}

/** Formats minutes as a readable string: 5 → "5m" · 60 → "1h" · 80 → "1h 20m" */
export function formatDurationString(minutes: number): string {
  if (!minutes || minutes <= 0) return '';
  if (minutes < 60) return `${minutes}m`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m ? `${h}h ${m}m` : `${h}h`;
}

/**
 * Calculates duration in minutes between two HH:mm time strings.
 * Returns 0 if either value is invalid or end is before start.
 */
export function calculateDuration(startTime: string, endTime: string): number {
  if (!startTime || !endTime) return 0;

  const [startHours, startMinutes] = startTime.split(':').map(Number);
  const [endHours, endMinutes] = endTime.split(':').map(Number);

  if (
    isNaN(startHours) || isNaN(startMinutes) ||
    isNaN(endHours) || isNaN(endMinutes)
  ) {
    return 0;
  }

  const startTotal = startHours * 60 + startMinutes;
  const endTotal = endHours * 60 + endMinutes;

  // Handle overnight spans (e.g., deployment spanning midnight)
  if (endTotal >= startTotal) {
    return endTotal - startTotal;
  } else {
    return (24 * 60 - startTotal) + endTotal;
  }
}

/**
 * Formats minutes as HH:mm string.
 */
export function formatMinutes(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}
