export function timeNow(date: Date = new Date()): string {
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

/**
 * Coarse "when was this" label for the saved-conversation list.
 *
 * Days rather than minutes: the list is scanned to recognise a past
 * conversation, not to time it, and a label that reads "3 days ago" stays
 * correct on a tab left open overnight in a way "14 minutes ago" does not.
 */
export function relativeDay(epochMs: number, now: number = Date.now()): string {
  const days = Math.floor((now - epochMs) / 86_400_000);
  if (days <= 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days} days ago`;
  if (days < 14) return "Last week";
  return `${Math.floor(days / 7)} weeks ago`;
}
