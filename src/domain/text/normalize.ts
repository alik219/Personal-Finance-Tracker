/**
 * Normalizes a bank description so the same merchant looks the same every
 * time: lowercase, no card numbers, dates or reference numbers, single spaces.
 *
 *   "POS 12/03 STARBUCKS #4471  XXXX1234" -> "pos starbucks"
 *
 * Short numbers stay ("7-eleven", "route 66"), since they're often part of
 * the name.
 */
export function normalizeDescription(text: string): string {
  return (
    text
      .normalize("NFKC")
      .toLowerCase()
      // Masked card numbers: xxxx1234, ****1234, #### 1234
      .replace(/[x*#]{2,}\s?\d{2,}/g, " ")
      // Dates: 2026-03-12, 12/03/2026, 12.03.26, 12/03
      .replace(/\b\d{1,4}[/.-]\d{1,2}(?:[/.-]\d{2,4})?\b/g, " ")
      // Reference and card numbers: 4+ digits, optionally after "#"
      .replace(/#?\d{4,}/g, " ")
      // Everything but letters, digits, & and '
      .replace(/[^\p{L}\p{N}&']+/gu, " ")
      .trim()
      .replace(/\s+/g, " ")
      .slice(0, 200)
      .trim()
  );
}
