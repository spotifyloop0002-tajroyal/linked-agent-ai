// ============================================================================
// LOCAL TIMEZONE UTILITIES (Auto-detects user's browser timezone)
// ============================================================================

/**
 * Get the user's local timezone from the browser
 */
export function getUserTimezone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
}

/**
 * Get short timezone label (e.g., "IST", "EST", "PST")
 */
export function getTimezoneLabel(): string {
  const date = new Date();
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZoneName: 'short',
    timeZone: getUserTimezone(),
  }).formatToParts(date);
  return parts.find(p => p.type === 'timeZoneName')?.value || '';
}

/**
 * Get current time in user's local timezone
 */
export function getCurrentTimeLocal(): Date {
  return new Date();
}

/**
 * Format a date for display in user's local timezone
 */
export function formatDateLocal(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleString('en-US', { 
    timeZone: getUserTimezone(),
    dateStyle: 'medium',
    timeStyle: 'short'
  });
}

/**
 * Format just the time in user's local timezone
 */
export function formatTimeLocal(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleTimeString('en-US', { 
    timeZone: getUserTimezone(),
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });
}

/**
 * Format just the date in user's local timezone
 */
export function formatDateOnlyLocal(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('en-US', { 
    timeZone: getUserTimezone(),
    weekday: 'short',
    month: 'short',
    day: 'numeric'
  });
}

/**
 * Check if a scheduled time has passed
 */
export function isPostDue(scheduledTime: string): boolean {
  const now = new Date();
  const scheduled = new Date(scheduledTime);
  return now >= scheduled;
}

/**
 * Format a scheduled time for display (user-friendly with timezone label)
 */
export function formatScheduledTimeLocal(isoString: string): string {
  const date = new Date(isoString);
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  
  const tz = getUserTimezone();
  const tzLabel = getTimezoneLabel();
  
  const scheduledLocal = new Date(date.toLocaleString('en-US', { timeZone: tz }));
  const nowLocal = new Date(now.toLocaleString('en-US', { timeZone: tz }));
  const tomorrowLocal = new Date(tomorrow.toLocaleString('en-US', { timeZone: tz }));
  
  const isToday = scheduledLocal.toDateString() === nowLocal.toDateString();
  const isTomorrow = scheduledLocal.toDateString() === tomorrowLocal.toDateString();
  
  const timeStr = formatTimeLocal(date);
  
  if (isToday) {
    return `Today at ${timeStr} ${tzLabel}`;
  } else if (isTomorrow) {
    return `Tomorrow at ${timeStr} ${tzLabel}`;
  } else {
    return `${formatDateOnlyLocal(date)} at ${timeStr} ${tzLabel}`;
  }
}

/**
 * Get optimal posting times for LinkedIn (in user's timezone)
 */
export function getOptimalPostingTimes(): { time: string; label: string }[] {
  const tzLabel = getTimezoneLabel();
  return [
    { time: '08:00', label: `8:00 AM ${tzLabel} - Early morning engagement` },
    { time: '10:00', label: `10:00 AM ${tzLabel} - Mid-morning peak` },
    { time: '12:00', label: `12:00 PM ${tzLabel} - Lunch break browsing` },
    { time: '17:00', label: `5:00 PM ${tzLabel} - End of workday` },
    { time: '19:00', label: `7:00 PM ${tzLabel} - Evening engagement` },
  ];
}

// ============================================================================
// BACKWARD COMPATIBILITY ALIASES (so existing imports don't break)
// ============================================================================

/** @deprecated Use formatDateLocal */
export const formatDateIST = formatDateLocal;
/** @deprecated Use formatTimeLocal */
export const formatTimeIST = formatTimeLocal;
/** @deprecated Use formatDateOnlyLocal */
export const formatDateOnlyIST = formatDateOnlyLocal;
/** @deprecated Use getCurrentTimeLocal */
export const getCurrentTimeIST = getCurrentTimeLocal;
/** @deprecated Use formatScheduledTimeLocal */
export const formatScheduledTimeIST = formatScheduledTimeLocal;
/** @deprecated Use getOptimalPostingTimes */
export const getOptimalPostingTimesIST = getOptimalPostingTimes;
