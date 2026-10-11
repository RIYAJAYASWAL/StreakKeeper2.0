/**
 * Timezone helpers for formatting IANA timezones with standard UTC offsets.
 */

export interface TimezoneOption {
  value: string;
  label: string;
  offset: string;
  city: string;
}

// Format UTC offset for a given IANA timezone
export function formatTzOffset(tz: string): string {
  try {
    const d = new Date();
    const str = new Intl.DateTimeFormat('en-US', { timeZone: tz, timeZoneName: 'shortOffset' }).format(d);
    const m = str.match(/GMT([+-]\d+)(?::(\d+))?/);
    if (!m) return 'UTC+00:00';
    const sign = m[1][0];
    const hours = Math.abs(parseInt(m[1], 10)).toString().padStart(2, '0');
    const mins = (m[2] || '0').padStart(2, '0');
    return `UTC${sign}${hours}:${mins}`;
  } catch {
    return 'UTC+00:00';
  }
}

// Major popular timezones for quick reference at top of select
export const POPULAR_TIMEZONES: string[] = [
  'Asia/Kolkata',
  'America/New_York',
  'America/Los_Angeles',
  'America/Chicago',
  'Europe/London',
  'Europe/Paris',
  'Europe/Berlin',
  'Asia/Tokyo',
  'Asia/Singapore',
  'Asia/Dubai',
  'Australia/Sydney',
  'Pacific/Auckland',
  'America/Toronto',
  'America/Sao_Paulo',
];

// Generate the complete list of available IANA timezones formatted like "(UTC+05:30) Asia/Kolkata"
export function getAllTimezoneOptions(): TimezoneOption[] {
  let tzList: string[] = [];
  try {
    if (typeof Intl !== 'undefined' && 'supportedValuesOf' in Intl) {
      tzList = Intl.supportedValuesOf('timeZone');
    }
  } catch {
    // Fallback
  }

  // Ensure Asia/Kolkata is always included prominently
  const set = new Set<string>(['Asia/Kolkata', ...POPULAR_TIMEZONES, ...tzList]);
  const allTzs = Array.from(set);

  const options: TimezoneOption[] = allTzs.map((tz) => {
    const offset = formatTzOffset(tz);
    const city = tz.split('/').pop()?.replace(/_/g, ' ') || tz;
    return {
      value: tz,
      label: `(${offset}) ${tz}`,
      offset,
      city,
    };
  });

  // Sort by offset and city name
  return options.sort((a, b) => {
    if (a.offset === b.offset) {
      return a.value.localeCompare(b.value);
    }
    return a.offset.localeCompare(b.offset);
  });
}
