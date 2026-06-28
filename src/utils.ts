/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Formats a date string (expected in standard YYYY-MM-DD format) into Day/Month/Year format.
 * Automatically handles ISO timestamp suffixies if present.
 * If the input does not match the YYYY-MM-DD pattern, it is returned unchanged to prevent distortion.
 *
 * Example: '2026-05-15' -> '15/05/2026'
 */
export function formatDateToShow(dateString: string): string {
  if (!dateString) return '';
  
  // Extract only the date part in case of full ISO timestamp (e.g. 2026-06-05T18:11:54Z)
  const dateOnly = dateString.trim().split('T')[0];
  const parts = dateOnly.split('-');
  
  if (parts.length === 3) {
    const year = parts[0];
    const month = parts[1];
    const day = parts[2];
    
    // Check if the first part has 4 digits (Year)
    if (year.length === 4) {
      return `${day}/${month}/${year}`;
    }
  }
  
  return dateString;
}
