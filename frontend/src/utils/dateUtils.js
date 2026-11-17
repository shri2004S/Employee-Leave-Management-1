/**
 * Centralized Date & Leave Duration Utilities
 * Calculates working days (excluding Saturdays and Sundays) and calendar days between two dates.
 */

/**
 * Returns today's date formatted as YYYY-MM-DD in local system time.
 * Placed at module level to avoid impure Date calls in React component render bodies.
 */
export function getLocalTodayString() {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const date = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${date}`;
}

/**
 * Calculates working days (excluding Saturdays and Sundays) and calendar days between two ISO date strings (YYYY-MM-DD).
 * @param {string} fromDateStr - Start date in YYYY-MM-DD format
 * @param {string} toDateStr - End date in YYYY-MM-DD format
 * @returns {{ workingDays: number, calendarDays: number, weekendDays: number }}
 */
export function calculateLeaveDays(fromDateStr, toDateStr) {
  if (!fromDateStr || !toDateStr || toDateStr < fromDateStr) {
    return { workingDays: 0, calendarDays: 0, weekendDays: 0 };
  }

  // Parse integer components to avoid UTC timezone offsets
  const [startY, startM, startD] = fromDateStr.split("-").map(Number);
  const [endY, endM, endD] = toDateStr.split("-").map(Number);

  const start = new Date(startY, startM - 1, startD);
  const end = new Date(endY, endM - 1, endD);

  let workingDays = 0;
  let calendarDays = 0;
  let weekendDays = 0;

  const current = new Date(start);
  while (current <= end) {
    calendarDays++;
    const dayOfWeek = current.getDay(); // 0 = Sunday, 6 = Saturday
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      weekendDays++;
    } else {
      workingDays++;
    }
    current.setDate(current.getDate() + 1);
  }

  return { workingDays, calendarDays, weekendDays };
}
