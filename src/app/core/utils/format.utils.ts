const UPPERCASE_WORDS = new Set([
  'RAM',
  'ROM',
  'SSD',
  'HDD',
  'CPU',
  'GPU',
  'OS',
  '5G',
  '4G',
  '3G',
  'USB',
  'HDMI',
  'IP68',
  'IP65',
  'IPX7',
  'ANC',
  'ECG',
  'GPS',
  'NFC',
  'RMS',
  'OLED',
  'AMOLED',
  'LTPO',
  'QHD',
  'WQHD',
  'FHD',
  'HDR',
  'NVME',
]);

/**
 * Converts snake_case, camelCase, kebab-case or underscored strings into clean, formatted Title Case labels.
 * E.g. 'display_refresh_rate' -> 'Display Refresh Rate'
 * E.g. 'ram_memory' -> 'RAM Memory'
 * E.g. 'PENDING_APPROVAL' -> 'Pending Approval'
 */
export function formatLabel(str: string | null | undefined): string {
  if (!str) return '';

  const cleaned = str
    .replace(/_/g, ' ')
    .replace(/-/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2');

  return cleaned
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => {
      const upper = word.toUpperCase();
      if (UPPERCASE_WORDS.has(upper)) {
        return upper;
      }
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(' ');
}
