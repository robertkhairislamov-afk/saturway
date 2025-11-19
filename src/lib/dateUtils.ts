/**
 * Date utility functions for consistent local timezone handling
 * Fixes timezone issues with toISOString() which always uses UTC
 */

/**
 * Format a date as YYYY-MM-DD in local timezone
 * @param date - Date to format
 * @returns Formatted date string (YYYY-MM-DD)
 */
export function formatLocalDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Get today's date as YYYY-MM-DD in local timezone
 * @returns Today's date string (YYYY-MM-DD)
 */
export function getTodayString(): string {
  return formatLocalDate(new Date());
}

/**
 * Check if two dates are the same day (ignoring time)
 * @param date1 - First date
 * @param date2 - Second date
 * @returns True if dates are the same day
 */
export function isSameDay(date1: Date, date2: Date): boolean {
  return formatLocalDate(date1) === formatLocalDate(date2);
}

/**
 * Parse a date string and return as Date object
 * Handles both YYYY-MM-DD and full ISO strings
 * @param dateString - Date string to parse
 * @returns Date object
 */
export function parseDate(dateString: string): Date {
  // If it's just YYYY-MM-DD, treat it as local date
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
    const [year, month, day] = dateString.split('-').map(Number);
    return new Date(year, month - 1, day);
  }
  // Otherwise parse as ISO string
  return new Date(dateString);
}
