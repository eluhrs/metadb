// Parses the "n,n,n-n" record selections used by Bulk Apply and by the AI dry run, so
// both accept the same syntax and the same 1-based positions the app shows elsewhere.
//
// Positions are the collection's canonical createdAt order -- the numbers in the dry-run
// table and the run-history drill-down.
export function parseRecordPositions(str: string): number[] {
  const positions = new Set<number>();

  for (const part of str.split(',').map(s => s.trim())) {
    if (!part) continue;

    if (part.includes('-')) {
      const [startStr, endStr] = part.split('-');
      const start = parseInt(startStr, 10);
      const end = parseInt(endStr, 10);
      if (!isNaN(start) && !isNaN(end) && start <= end) {
        for (let i = start; i <= end; i++) if (i > 0) positions.add(i);
      }
    } else {
      const num = parseInt(part, 10);
      if (!isNaN(num) && num > 0) positions.add(num);
    }
  }

  return Array.from(positions).sort((a, b) => a - b);
}

// Renders a position list back into the compact form, for echoing an expression's
// meaning under the input as it is typed.
export function describePositions(positions: number[]): string {
  if (positions.length === 0) return "";

  const parts: string[] = [];
  let start = positions[0];
  let prev = positions[0];

  for (let i = 1; i <= positions.length; i++) {
    const current = positions[i];
    if (current !== prev + 1) {
      parts.push(start === prev ? `${start}` : `${start}–${prev}`);
      start = current;
    }
    prev = current;
  }

  return parts.join(', ');
}
