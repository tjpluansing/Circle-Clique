/**
 * Pure initials-from-name logic for the Primary photo fallback
 * (CLAUDE.md section 4 rule 9: "If no photo exists, show initials").
 * Kept separate from the component so the name-parsing rules are
 * unit-testable without rendering anything.
 */
export function getInitials(fullName: string): string {
  const words = fullName
    .trim()
    .split(/\s+/)
    .filter((word) => word.length > 0);

  if (words.length === 0) {
    return "";
  }

  if (words.length === 1) {
    return words[0].slice(0, 2).toUpperCase();
  }

  const first = words[0][0] ?? "";
  const last = words[words.length - 1][0] ?? "";
  return (first + last).toUpperCase();
}
