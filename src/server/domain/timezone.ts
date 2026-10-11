/**
 * Validates if the given string is a valid IANA timezone identifier.
 * Uses standard Intl.DateTimeFormat API without external network or database access.
 */
export function isValidIANATimezone(timezone: string): boolean {
  if (!timezone || typeof timezone !== 'string') {
    return false;
  }

  const trimmed = timezone.trim();
  if (trimmed.length === 0) {
    return false;
  }

  try {
    Intl.DateTimeFormat(undefined, { timeZone: trimmed });
    return true;
  } catch {
    return false;
  }
}
